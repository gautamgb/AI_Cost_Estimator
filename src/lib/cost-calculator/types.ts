// ─── Provider & Model Types ───

export type ModelProvider =
  | "openai"
  | "anthropic"
  | "google"
  | "deepseek"
  | "meta"
  | "mistral"
  | "cohere"
  | "custom";

export interface ModelPricing {
  inputPer1M: number;
  outputPer1M: number;
  cachedInputPer1M: number | null;
  batchMultiplier: number | null;
}

export interface ModelDefinition {
  id: string;
  name: string;
  provider: ModelProvider;
  pricing: ModelPricing;
  bedrockPricing: ModelPricing | null;
  contextWindow: number;
  maxOutputTokens: number;
  supportsToolCalls: boolean;
  supportsPromptCaching: boolean;
  toolDefinitionOverhead: number;
  isReasoningModel: boolean;
  reasoningTokenMultiplier?: number;
  /** For embedding models: price per 1M tokens (no input/output distinction) */
  isEmbeddingModel?: boolean;
  embeddingPricePer1M?: number;
}

// ─── Stack Component (enables drill-down) ───

export type StackCategory =
  | "llm"
  | "embedding"
  | "search"
  | "infra"
  | "guardrail"
  | "routing"
  | "reranking";

export interface StackComponent {
  id: string;
  name: string;
  category: StackCategory;
  modelId?: string;
  avgInputTokens: number;
  avgOutputTokens: number;
  cacheable: boolean;
  cacheHitRate: number;
  callsPerInvocation: number;
  fixedCostPerCall?: number;
}

// ─── Agent & Workflow ───

export type OrchestrationPattern =
  | "sequential"
  | "parallel-fanout"
  | "hierarchical"
  | "iterative-loop"
  | "custom";

export type ContextStrategy =
  | "full-history"
  | "sliding-window"
  | "summary-compression"
  | "stateless";

export type AgentRole =
  | "orchestrator"
  | "worker"
  | "classifier"
  | "evaluator";

export interface AgentDefinition {
  id: string;
  name: string;
  modelId: string;
  role: AgentRole;
  avgStepsPerTask: number;
  avgToolCallsPerStep: number;
  toolDefinitionCount: number;
  systemPromptTokens: number;
  avgInputTokensPerStep: number;
  avgOutputTokensPerStep: number;
  reflectionPasses: number;
  contextStrategy: ContextStrategy;
  slidingWindowSize?: number;
  cacheableInputFraction: number;
  stackComponents: StackComponent[];
}

export interface AgenticWorkflowConfig {
  pattern: OrchestrationPattern;
  agents: AgentDefinition[];
  orchestratorAgentId?: string;
  parallelBranches?: number;
  avgIterations?: number;
  errorRetryRate: number;
  orchestrationOverheadTokens: number;
}

// ─── Usage ───

export interface UsageConfig {
  tasksPerDay: number;
  usersCount: number;
  daysPerMonth: number;
}

// ─── Pricing ───

export type PricingSource =
  | "direct-api"
  | "aws-bedrock"
  | "azure"
  | "gcp-vertex";

export interface PricingConfig {
  pricingSource: PricingSource;
  promptCachingEnabled: boolean;
  batchApiEnabled: boolean;
  batchEligibleFraction: number;
  committedMonthlyUsd?: number;
  committedDiscount?: number;
}

// ─── Infrastructure ───

export interface InfraLineItem {
  id: string;
  name: string;
  monthlyCost: number;
}

export interface InfraConfig {
  vectorDbMonthlyCost: number;
  observabilityMonthlyCost: number;
  computeMonthlyCost: number;
  customItems: InfraLineItem[];
}

// ─── Results ───

export interface TokenBreakdown {
  uncachedInputTokens: number;
  cachedInputTokens: number;
  outputTokens: number;
  reasoningTokens: number;
}

export interface StackComponentCost {
  componentId: string;
  componentName: string;
  category: StackCategory;
  modelName?: string;
  tokens: TokenBreakdown;
  costUsd: number;
  percentage: number;
  callCount: number;
  details: {
    cachedSavingsUsd: number;
    bedrockDeltaUsd: number;
    fixedCosts: number;
  };
}

export interface AgentCostBreakdown {
  agentId: string;
  agentName: string;
  modelId: string;
  tokens: TokenBreakdown;
  costUsd: number;
  llmCallsPerTask: number;
  totalMonthlyLlmCalls: number;
  stackBreakdown: StackComponentCost[];
}

export interface OptimizationSuggestion {
  id: string;
  title: string;
  description: string;
  estimatedSavingsPercent: number;
  estimatedSavingsUsd: number;
}

export interface CostResult {
  stackBreakdown: StackComponentCost[];
  agentBreakdowns: AgentCostBreakdown[];
  totalTokens: TokenBreakdown;
  monthlyLlmCost: number;
  monthlyInfraCost: number;
  totalMonthlyCost: number;
  costPerInvocation: number;
  costPerUser: number;
  annualCost: number;
  cachingSavingsUsd: number;
  batchSavingsUsd: number;
  optimizations: OptimizationSuggestion[];
}

// ─── Calculator State ───

export interface CalculatorState {
  workflow: AgenticWorkflowConfig;
  usage: UsageConfig;
  pricing: PricingConfig;
  infra: InfraConfig;
  activePresetId: string | null;
  comparisonConfigs: ComparisonConfig[];
}

export interface ComparisonConfig {
  id: string;
  label: string;
  workflow: AgenticWorkflowConfig;
  pricing: PricingConfig;
  result?: CostResult;
}

export type CalculatorAction =
  | { type: "SET_WORKFLOW"; payload: Partial<AgenticWorkflowConfig> }
  | { type: "SET_AGENT"; payload: { index: number; agent: Partial<AgentDefinition> } }
  | { type: "ADD_AGENT"; payload: AgentDefinition }
  | { type: "REMOVE_AGENT"; payload: { index: number } }
  | { type: "SET_USAGE"; payload: Partial<UsageConfig> }
  | { type: "SET_PRICING"; payload: Partial<PricingConfig> }
  | { type: "SET_INFRA"; payload: Partial<InfraConfig> }
  | { type: "LOAD_PRESET"; payload: string }
  | { type: "ADD_COMPARISON"; payload: { label: string } }
  | { type: "REMOVE_COMPARISON"; payload: { id: string } }
  | { type: "LOAD_STATE"; payload: CalculatorState }
  | { type: "RESET" };

// ─── Preset ───

export interface WorkflowPreset {
  id: string;
  name: string;
  description: string;
  costMetricLabel: string;
  workflow: AgenticWorkflowConfig;
  usage: UsageConfig;
  infra: InfraConfig;
}
