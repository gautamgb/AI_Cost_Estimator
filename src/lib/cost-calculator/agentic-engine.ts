import type {
  AgentDefinition,
  AgenticWorkflowConfig,
  ModelDefinition,
  PricingConfig,
  UsageConfig,
  TokenBreakdown,
  AgentCostBreakdown,
  CostResult,
  InfraConfig,
} from "./types";
import { DEFAULTS } from "./constants";
import { calculateTokenCost, calculateInfraCost, generateOptimizations } from "./engine";
import { calculateStackBreakdown } from "./stack-breakdown";

/** Calculate total input tokens for an agent across N steps, accounting for context accumulation */
function calculateAgentInputTokens(agent: AgentDefinition): {
  totalInput: number;
  cachedInput: number;
  uncachedInput: number;
  totalOutput: number;
  reasoningTokens: number;
  llmCalls: number;
} {
  const N = agent.avgStepsPerTask;
  const toolDefTokens = agent.toolDefinitionCount * DEFAULTS.toolDefinitionOverhead;
  const basePerCall = agent.systemPromptTokens + toolDefTokens;
  const avgStepNewTokens =
    agent.avgInputTokensPerStep + agent.avgOutputTokensPerStep;
  const toolCallTokensPerStep =
    agent.avgToolCallsPerStep * DEFAULTS.toolCallFormattingTokens;

  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let compressedHistory = 0;
  const compressionRatio = DEFAULTS.summaryCompressionRatio;

  for (let step = 0; step < N; step++) {
    let stepInputTokens = basePerCall + agent.avgInputTokensPerStep + toolCallTokensPerStep;

    // Context accumulation based on strategy
    switch (agent.contextStrategy) {
      case "full-history": {
        // Each step sees all prior input+output
        const historyTokens = step * avgStepNewTokens;
        stepInputTokens += historyTokens;
        break;
      }
      case "sliding-window": {
        const windowSize = agent.slidingWindowSize ?? 32_000;
        const historyTokens = Math.min(step * avgStepNewTokens, windowSize);
        stepInputTokens += historyTokens;
        break;
      }
      case "summary-compression": {
        stepInputTokens += Math.round(compressedHistory);
        break;
      }
      case "stateless":
        // No history carried forward
        break;
    }

    totalInputTokens += stepInputTokens;
    totalOutputTokens += agent.avgOutputTokensPerStep;

    // Update running compressed history for next step
    if (agent.contextStrategy === "summary-compression") {
      compressedHistory = (compressedHistory + avgStepNewTokens) * compressionRatio;
    }
  }

  // Reflection passes: each is an extra call at current context size
  const reflectionCalls = agent.reflectionPasses * N;
  if (reflectionCalls > 0) {
    const avgContextAtReflection =
      totalInputTokens / N + DEFAULTS.reflectionPromptTokens;
    totalInputTokens += reflectionCalls * avgContextAtReflection;
    totalOutputTokens += reflectionCalls * agent.avgOutputTokensPerStep;
  }

  const totalLlmCalls = N + reflectionCalls;

  // Cached vs uncached split
  const cachedTokensPerCall = basePerCall; // system prompt + tool defs are cacheable
  const totalCachedInput = cachedTokensPerCall * totalLlmCalls * agent.cacheableInputFraction;
  const totalUncachedInput = totalInputTokens - totalCachedInput;

  return {
    totalInput: totalInputTokens,
    cachedInput: Math.max(0, totalCachedInput),
    uncachedInput: Math.max(0, totalUncachedInput),
    totalOutput: totalOutputTokens,
    reasoningTokens: 0, // Applied at model level via multiplier in calculateAgenticWorkflowCost
    llmCalls: totalLlmCalls,
  };
}

/** Apply orchestration pattern multipliers */
function applyOrchestrationPattern(
  workflow: AgenticWorkflowConfig,
  agentResults: Map<string, ReturnType<typeof calculateAgentInputTokens>>
): Map<string, ReturnType<typeof calculateAgentInputTokens>> {
  const adjusted = new Map(agentResults);

  switch (workflow.pattern) {
    case "parallel-fanout": {
      const branches = workflow.parallelBranches ?? 3;
      // Non-orchestrator agents get multiplied by branch count
      for (const [agentId, result] of adjusted) {
        const agent = workflow.agents.find((a) => a.id === agentId);
        if (agent && agent.role !== "orchestrator") {
          adjusted.set(agentId, {
            ...result,
            totalInput: result.totalInput * branches,
            cachedInput: result.cachedInput * branches,
            uncachedInput: result.uncachedInput * branches,
            totalOutput: result.totalOutput * branches,
            llmCalls: result.llmCalls * branches,
          });
        }
      }
      break;
    }
    case "iterative-loop": {
      const iterations = workflow.avgIterations ?? 3;
      // All agents repeat for each iteration, with growing context
      for (const [agentId, result] of adjusted) {
        // Context grows across iterations (simplified: multiply by triangle number)
        const iterMultiplier = iterations * (iterations + 1) / 2 / iterations;
        adjusted.set(agentId, {
          ...result,
          totalInput: Math.round(result.totalInput * iterations * iterMultiplier),
          cachedInput: result.cachedInput * iterations, // caching stays linear
          uncachedInput: Math.round(
            result.uncachedInput * iterations * iterMultiplier
          ),
          totalOutput: result.totalOutput * iterations,
          llmCalls: result.llmCalls * iterations,
        });
      }
      break;
    }
    case "hierarchical": {
      // Orchestrator gets additional overhead for delegating + receiving results
      const orchestratorId = workflow.orchestratorAgentId;
      if (orchestratorId) {
        const orchResult = adjusted.get(orchestratorId);
        if (orchResult) {
          const workerCount = workflow.agents.filter(
            (a) => a.id !== orchestratorId
          ).length;
          const delegationOverhead =
            workerCount * workflow.orchestrationOverheadTokens;
          adjusted.set(orchestratorId, {
            ...orchResult,
            totalInput: orchResult.totalInput + delegationOverhead,
            uncachedInput: orchResult.uncachedInput + delegationOverhead,
          });
        }
      }
      break;
    }
    // sequential and custom: no additional adjustments
  }

  return adjusted;
}

/** Apply error retry overhead */
function applyErrorRetries(
  result: ReturnType<typeof calculateAgentInputTokens>,
  errorRetryRate: number
): ReturnType<typeof calculateAgentInputTokens> {
  if (errorRetryRate <= 0) return result;

  const retryCalls = Math.round(result.llmCalls * errorRetryRate);
  const avgInputPerCall = result.totalInput / result.llmCalls;
  const avgOutputPerCall = result.totalOutput / result.llmCalls;

  return {
    ...result,
    totalInput: result.totalInput + retryCalls * avgInputPerCall,
    uncachedInput:
      result.uncachedInput +
      retryCalls * (avgInputPerCall - result.cachedInput / result.llmCalls),
    cachedInput:
      result.cachedInput +
      retryCalls * (result.cachedInput / result.llmCalls),
    totalOutput: result.totalOutput + retryCalls * avgOutputPerCall,
    llmCalls: result.llmCalls + retryCalls,
  };
}

/** Main entry point: calculate full cost for an agentic workflow */
export function calculateAgenticWorkflowCost(
  workflow: AgenticWorkflowConfig,
  models: Map<string, ModelDefinition>,
  usage: UsageConfig,
  pricing: PricingConfig,
  infra: InfraConfig
): CostResult {
  const monthlyTasks = usage.tasksPerDay * usage.daysPerMonth * usage.usersCount;

  // Step 1: Calculate per-agent token usage (per task)
  const perAgentResults = new Map<
    string,
    ReturnType<typeof calculateAgentInputTokens>
  >();
  for (const agent of workflow.agents) {
    perAgentResults.set(agent.id, calculateAgentInputTokens(agent));
  }

  // Step 2: Apply orchestration pattern
  const orchestrated = applyOrchestrationPattern(workflow, perAgentResults);

  // Step 3: Apply error retries
  const withRetries = new Map<string, ReturnType<typeof calculateAgentInputTokens>>();
  for (const [agentId, result] of orchestrated) {
    withRetries.set(
      agentId,
      applyErrorRetries(result, workflow.errorRetryRate)
    );
  }

  // Step 4: Calculate costs per agent
  const agentBreakdowns: AgentCostBreakdown[] = [];
  let totalMonthlyLlmCost = 0;
  let totalCachingSavings = 0;
  let totalBatchSavings = 0;
  const totalTokens: TokenBreakdown = {
    uncachedInputTokens: 0,
    cachedInputTokens: 0,
    outputTokens: 0,
    reasoningTokens: 0,
  };

  for (const agent of workflow.agents) {
    const result = withRetries.get(agent.id)!;
    const model = models.get(agent.modelId);
    if (!model) continue;

    // Apply reasoning token multiplier for thinking models
    let outputTokens = result.totalOutput;
    let reasoningTokens = 0;
    if (model.isReasoningModel && model.reasoningTokenMultiplier) {
      reasoningTokens = outputTokens * (model.reasoningTokenMultiplier - 1);
    }

    const tokens: TokenBreakdown = {
      uncachedInputTokens: Math.round(result.uncachedInput * monthlyTasks),
      cachedInputTokens: Math.round(result.cachedInput * monthlyTasks),
      outputTokens: Math.round(outputTokens * monthlyTasks),
      reasoningTokens: Math.round(reasoningTokens * monthlyTasks),
    };

    const { totalCost, cachingSavings, batchSavings } = calculateTokenCost(
      tokens,
      model,
      pricing
    );

    const stackBreakdown = calculateStackBreakdown(
      agent,
      model,
      pricing,
      monthlyTasks,
      models
    );

    agentBreakdowns.push({
      agentId: agent.id,
      agentName: agent.name,
      modelId: agent.modelId,
      tokens,
      costUsd: totalCost,
      llmCallsPerTask: result.llmCalls,
      totalMonthlyLlmCalls: result.llmCalls * monthlyTasks,
      stackBreakdown,
    });

    totalMonthlyLlmCost += totalCost;
    totalCachingSavings += cachingSavings;
    totalBatchSavings += batchSavings;
    totalTokens.uncachedInputTokens += tokens.uncachedInputTokens;
    totalTokens.cachedInputTokens += tokens.cachedInputTokens;
    totalTokens.outputTokens += tokens.outputTokens;
    totalTokens.reasoningTokens += tokens.reasoningTokens;
  }

  const monthlyInfraCost = calculateInfraCost(infra);
  const totalMonthlyCost = totalMonthlyLlmCost + monthlyInfraCost;

  // Aggregate stack breakdown across all agents
  const allStackBreakdown = agentBreakdowns.flatMap((a) => a.stackBreakdown);
  const totalStackCost = allStackBreakdown.reduce((s, c) => s + c.costUsd, 0);
  const normalizedStackBreakdown = allStackBreakdown.map((c) => ({
    ...c,
    percentage: totalStackCost > 0 ? (c.costUsd / totalStackCost) * 100 : 0,
  }));

  const result: CostResult = {
    stackBreakdown: normalizedStackBreakdown,
    agentBreakdowns,
    totalTokens,
    monthlyLlmCost: totalMonthlyLlmCost,
    monthlyInfraCost,
    totalMonthlyCost,
    costPerInvocation: monthlyTasks > 0 ? totalMonthlyCost / monthlyTasks : 0,
    costPerUser:
      usage.usersCount > 0 ? totalMonthlyCost / usage.usersCount : 0,
    annualCost: totalMonthlyCost * 12,
    cachingSavingsUsd: totalCachingSavings,
    batchSavingsUsd: totalBatchSavings,
    optimizations: [],
  };

  result.optimizations = generateOptimizations(result, pricing);

  return result;
}
