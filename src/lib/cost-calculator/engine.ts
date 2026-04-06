import type {
  ModelDefinition,
  ModelPricing,
  PricingConfig,
  TokenBreakdown,
  InfraConfig,
  OptimizationSuggestion,
  CostResult,
} from "./types";
import { OPTIMIZATION_ESTIMATES } from "./constants";

/** Calculate cost for a number of tokens at a given rate per million */
export function tokenCost(tokens: number, pricePer1M: number): number {
  return (tokens / 1_000_000) * pricePer1M;
}

/** Get the active pricing for a model based on the selected pricing source */
export function getActivePricing(
  model: ModelDefinition,
  pricingSource: PricingConfig["pricingSource"]
): ModelPricing {
  if (pricingSource === "aws-bedrock" && model.bedrockPricing) {
    return model.bedrockPricing;
  }
  return model.pricing;
}

/** Calculate cost for a given token breakdown against a model's pricing */
export function calculateTokenCost(
  tokens: TokenBreakdown,
  model: ModelDefinition,
  pricing: PricingConfig
): { totalCost: number; cachingSavings: number; batchSavings: number } {
  const activePricing = getActivePricing(model, pricing.pricingSource);

  // Base costs
  const uncachedInputCost = tokenCost(tokens.uncachedInputTokens, activePricing.inputPer1M);
  const outputCost = tokenCost(tokens.outputTokens, activePricing.outputPer1M);

  // Cached input cost
  let cachedInputCost: number;
  let cachingSavings = 0;
  if (
    pricing.promptCachingEnabled &&
    activePricing.cachedInputPer1M !== null &&
    model.supportsPromptCaching
  ) {
    cachedInputCost = tokenCost(tokens.cachedInputTokens, activePricing.cachedInputPer1M);
    const fullPriceCachedTokens = tokenCost(tokens.cachedInputTokens, activePricing.inputPer1M);
    cachingSavings = fullPriceCachedTokens - cachedInputCost;
  } else {
    // No caching: charge cached tokens at full input price
    cachedInputCost = tokenCost(tokens.cachedInputTokens, activePricing.inputPer1M);
  }

  // Reasoning tokens (billed as output)
  const reasoningCost = tokenCost(tokens.reasoningTokens, activePricing.outputPer1M);

  let totalCost = uncachedInputCost + cachedInputCost + outputCost + reasoningCost;

  // Batch discount
  let batchSavings = 0;
  if (
    pricing.batchApiEnabled &&
    activePricing.batchMultiplier !== null
  ) {
    const batchableCost = totalCost * pricing.batchEligibleFraction;
    const nonBatchCost = totalCost * (1 - pricing.batchEligibleFraction);
    batchSavings = batchableCost * (1 - activePricing.batchMultiplier);
    totalCost = nonBatchCost + batchableCost * activePricing.batchMultiplier;
  }

  return { totalCost, cachingSavings, batchSavings };
}

/** Calculate fixed per-call cost (for vector search, reranking, etc.) */
export function calculateFixedCost(
  fixedCostPerCall: number,
  callCount: number
): number {
  return fixedCostPerCall * callCount;
}

/** Calculate infrastructure costs */
export function calculateInfraCost(infra: InfraConfig): number {
  const baseCost =
    infra.vectorDbMonthlyCost +
    infra.observabilityMonthlyCost +
    infra.computeMonthlyCost;
  const customCost = infra.customItems.reduce(
    (sum, item) => sum + item.monthlyCost,
    0
  );
  return baseCost + customCost;
}

/** Generate optimization suggestions based on cost results */
export function generateOptimizations(
  result: CostResult,
  pricing: PricingConfig
): OptimizationSuggestion[] {
  const suggestions: OptimizationSuggestion[] = [];

  // Suggest prompt caching if not enabled and there are significant cacheable tokens
  if (!pricing.promptCachingEnabled && result.totalTokens.cachedInputTokens > 0) {
    const potentialSavings =
      result.totalTokens.cachedInputTokens *
      OPTIMIZATION_ESTIMATES.cachedTokenCostEstimate *
      OPTIMIZATION_ESTIMATES.cachingSavingsFraction;
    if (potentialSavings > 1) {
      suggestions.push({
        id: "enable-caching",
        title: "Enable Prompt Caching",
        description:
          "Your workflow has significant cacheable tokens (system prompts, tool definitions). Prompt caching can reduce input token costs by up to 90%.",
        estimatedSavingsPercent:
          (potentialSavings / result.monthlyLlmCost) * 100,
        estimatedSavingsUsd: potentialSavings,
      });
    }
  }

  // Suggest batch API for non-realtime workloads
  if (!pricing.batchApiEnabled) {
    const potentialSavings =
      result.monthlyLlmCost *
      OPTIMIZATION_ESTIMATES.batchDiscountRate *
      OPTIMIZATION_ESTIMATES.batchEligibleFraction;
    if (potentialSavings > 5) {
      suggestions.push({
        id: "enable-batch",
        title: "Use Batch API for Async Workloads",
        description:
          "If some tasks don't need real-time responses, the Batch API offers 50% cost reduction.",
        estimatedSavingsPercent:
          (potentialSavings / result.monthlyLlmCost) * 100,
        estimatedSavingsUsd: potentialSavings,
      });
    }
  }

  // Suggest cheaper model for classification/routing
  const expensiveClassifiers = result.agentBreakdowns.filter(
    (a) =>
      a.agentId &&
      result.stackBreakdown.some(
        (s) => s.category === "routing" && s.costUsd > 0.001
      )
  );
  if (expensiveClassifiers.length > 0) {
    suggestions.push({
      id: "cheaper-classifier",
      title: "Use Cheaper Model for Classification",
      description:
        "Routing/classification tasks often work well with smaller, cheaper models (e.g., Haiku, GPT-4.1-nano).",
      estimatedSavingsPercent: 15,
      estimatedSavingsUsd: result.monthlyLlmCost * 0.15,
    });
  }

  // Suggest sliding window for high-step agents
  result.agentBreakdowns.forEach((agent) => {
    if (agent.llmCallsPerTask > 10) {
      suggestions.push({
        id: `sliding-window-${agent.agentId}`,
        title: `Use Sliding Window for "${agent.agentName}"`,
        description: `This agent makes ${agent.llmCallsPerTask} LLM calls per task. A sliding window context strategy can cap context growth and reduce costs significantly.`,
        estimatedSavingsPercent: 20,
        estimatedSavingsUsd: agent.costUsd * 0.2,
      });
    }
  });

  return suggestions;
}
