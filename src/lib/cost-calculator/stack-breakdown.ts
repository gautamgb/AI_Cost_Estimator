import type {
  AgentDefinition,
  ModelDefinition,
  PricingConfig,
  StackComponentCost,
  TokenBreakdown,
} from "./types";
import { getActivePricing, tokenCost } from "./engine";

/** Calculate per-component cost breakdown for an agent's stack */
export function calculateStackBreakdown(
  agent: AgentDefinition,
  primaryModel: ModelDefinition,
  pricing: PricingConfig,
  monthlyTasks: number,
  modelMap?: Map<string, ModelDefinition>
): StackComponentCost[] {
  const results: StackComponentCost[] = [];

  for (const component of agent.stackComponents) {
    const model = component.modelId
      ? (modelMap?.get(component.modelId) ?? primaryModel)
      : primaryModel;

    const activePricing = getActivePricing(model, pricing.pricingSource);
    const totalCalls = component.callsPerInvocation * monthlyTasks;

    const totalInputTokens = component.avgInputTokens * totalCalls;
    const totalOutputTokens = component.avgOutputTokens * totalCalls;

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

      cachedSavingsUsd =
        tokenCost(cachedInputTokens, activePricing.inputPer1M) -
        tokenCost(cachedInputTokens, activePricing.cachedInputPer1M);
    }

    const inputCost =
      tokenCost(uncachedInputTokens, activePricing.inputPer1M) +
      tokenCost(cachedInputTokens, activePricing.cachedInputPer1M ?? activePricing.inputPer1M);
    const outputCost = tokenCost(totalOutputTokens, activePricing.outputPer1M);

    const fixedCosts = (component.fixedCostPerCall ?? 0) * totalCalls;

    let bedrockDeltaUsd = 0;
    if (pricing.pricingSource === "aws-bedrock" && model.bedrockPricing) {
      const directCost =
        tokenCost(uncachedInputTokens, model.pricing.inputPer1M) +
        tokenCost(totalOutputTokens, model.pricing.outputPer1M);
      bedrockDeltaUsd = inputCost + outputCost - directCost;
    }

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
      costUsd: inputCost + outputCost + fixedCosts,
      percentage: 0,
      callCount: totalCalls,
      details: { cachedSavingsUsd, bedrockDeltaUsd, fixedCosts },
    });
  }

  return results;
}
