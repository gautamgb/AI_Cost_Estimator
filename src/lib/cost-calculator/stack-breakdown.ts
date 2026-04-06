import type {
  AgentDefinition,
  ModelDefinition,
  PricingConfig,
  StackComponentCost,
  TokenBreakdown,
} from "./types";
import { getActivePricing } from "./engine";
import { getModelById } from "./models";

/** Calculate per-component cost breakdown for an agent's stack */
export function calculateStackBreakdown(
  agent: AgentDefinition,
  primaryModel: ModelDefinition,
  pricing: PricingConfig,
  monthlyTasks: number
): StackComponentCost[] {
  const results: StackComponentCost[] = [];

  for (const component of agent.stackComponents) {
    const model = component.modelId
      ? getModelById(component.modelId) ?? primaryModel
      : primaryModel;

    const activePricing = getActivePricing(model, pricing.pricingSource);
    const totalCalls = component.callsPerInvocation * monthlyTasks;

    // Token costs
    const totalInputTokens = component.avgInputTokens * totalCalls;
    const totalOutputTokens = component.avgOutputTokens * totalCalls;

    // Cached vs uncached split
    let cachedInputTokens = 0;
    let uncachedInputTokens = totalInputTokens;
    let cachedSavingsUsd = 0;

    if (
      component.cacheable &&
      pricing.promptCachingEnabled &&
      model.supportsPromptCaching &&
      activePricing.cachedInputPer1M !== null
    ) {
      cachedInputTokens = Math.round(totalInputTokens * component.cacheHitRate);
      uncachedInputTokens = totalInputTokens - cachedInputTokens;

      const fullPriceCost =
        (cachedInputTokens / 1_000_000) * activePricing.inputPer1M;
      const cachedPriceCost =
        (cachedInputTokens / 1_000_000) * activePricing.cachedInputPer1M;
      cachedSavingsUsd = fullPriceCost - cachedPriceCost;
    }

    // Calculate token-based cost
    const inputCost =
      (uncachedInputTokens / 1_000_000) * activePricing.inputPer1M +
      (cachedInputTokens / 1_000_000) *
        (activePricing.cachedInputPer1M ?? activePricing.inputPer1M);
    const outputCost =
      (totalOutputTokens / 1_000_000) * activePricing.outputPer1M;

    // Fixed costs (vector search fees, etc.)
    const fixedCosts = (component.fixedCostPerCall ?? 0) * totalCalls;

    // Bedrock delta
    let bedrockDeltaUsd = 0;
    if (pricing.pricingSource === "aws-bedrock" && model.bedrockPricing) {
      const directInputCost =
        (uncachedInputTokens / 1_000_000) * model.pricing.inputPer1M;
      const directOutputCost =
        (totalOutputTokens / 1_000_000) * model.pricing.outputPer1M;
      bedrockDeltaUsd = inputCost + outputCost - (directInputCost + directOutputCost);
    }

    const totalCost = inputCost + outputCost + fixedCosts;

    const tokens: TokenBreakdown = {
      uncachedInputTokens,
      cachedInputTokens,
      outputTokens: totalOutputTokens,
      reasoningTokens: 0,
    };

    results.push({
      componentId: component.id,
      componentName: component.name,
      category: component.category,
      modelName: model.name,
      tokens,
      costUsd: totalCost,
      percentage: 0, // normalized later by caller
      callCount: totalCalls,
      details: {
        cachedSavingsUsd,
        bedrockDeltaUsd,
        fixedCosts,
      },
    });
  }

  return results;
}
