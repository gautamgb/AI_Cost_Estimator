export const DEFAULTS = {
  tasksPerDay: 100,
  usersCount: 10,
  daysPerMonth: 22,
  errorRetryRate: 0.05,
  orchestrationOverheadTokens: 100,
  cacheableInputFraction: 0.4,
  systemPromptTokens: 1500,
  avgInputTokensPerStep: 2000,
  avgOutputTokensPerStep: 800,
  toolDefinitionOverhead: 150,
  toolCallFormattingTokens: 75,
  reflectionPromptTokens: 200,
  summaryCompressionRatio: 0.3,
} as const;

export const LIMITS = {
  maxAgents: 10,
  maxStepsPerTask: 50,
  maxToolCallsPerStep: 20,
  maxToolDefinitions: 50,
  maxTasksPerDay: 1_000_000,
  maxUsers: 100_000,
  maxParallelBranches: 20,
  maxIterations: 50,
  maxContextWindow: 2_000_000,
  maxCustomInfraItems: 10,
  maxComparisonConfigs: 3,
} as const;

export const FORMAT = {
  currencyDecimals: 4,
  currencyDecimalsHeadline: 2,
  percentDecimals: 1,
  tokenKFormat: (tokens: number): string => {
    if (tokens >= 1_000_000) return `${(tokens / 1_000_000).toFixed(1)}M`;
    if (tokens >= 1_000) return `${(tokens / 1_000).toFixed(1)}K`;
    return tokens.toString();
  },
  usd: (amount: number, decimals = 4): string => {
    return `$${amount.toFixed(decimals)}`;
  },
  usdCompact: (amount: number): string => {
    if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`;
    if (amount >= 1_000) return `$${(amount / 1_000).toFixed(1)}K`;
    return `$${amount.toFixed(2)}`;
  },
} as const;
