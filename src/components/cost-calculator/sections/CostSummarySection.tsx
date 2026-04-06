"use client";

import type { CostResult, UsageConfig } from "@/lib/cost-calculator/types";
import { FORMAT } from "@/lib/cost-calculator/constants";

interface Props {
  result: CostResult;
  usage: UsageConfig;
  costMetricLabel?: string;
}

export function CostSummarySection({ result, usage, costMetricLabel }: Props) {
  const monthlyTasks = usage.tasksPerDay * usage.daysPerMonth * usage.usersCount;

  return (
    <div className="border border-card-border rounded-xl bg-card p-4 space-y-4">
      {/* Headline Number */}
      <div className="text-center space-y-1">
        <p className="text-xs text-muted uppercase tracking-wider">
          {costMetricLabel ?? "Cost per invocation"}
        </p>
        <p className="text-3xl font-mono font-bold text-foreground">
          {FORMAT.usd(result.costPerInvocation)}
        </p>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-3 gap-3">
        <MetricCard
          label="Monthly"
          value={FORMAT.usdCompact(result.totalMonthlyCost)}
          sublabel={`${FORMAT.tokenKFormat(monthlyTasks)} tasks`}
        />
        <MetricCard
          label="Annual"
          value={FORMAT.usdCompact(result.annualCost)}
          sublabel="projected"
        />
        <MetricCard
          label="Per User"
          value={FORMAT.usdCompact(result.costPerUser)}
          sublabel="/month"
        />
      </div>

      {/* Cost Split */}
      <div className="space-y-2">
        <div className="flex justify-between text-xs">
          <span className="text-muted">LLM API Costs</span>
          <span className="font-mono">{FORMAT.usdCompact(result.monthlyLlmCost)}</span>
        </div>
        <div className="w-full bg-background rounded-full h-1.5">
          <div
            className="bg-accent rounded-full h-1.5"
            style={{
              width: `${result.totalMonthlyCost > 0 ? (result.monthlyLlmCost / result.totalMonthlyCost) * 100 : 0}%`,
            }}
          />
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-muted">Infrastructure</span>
          <span className="font-mono">{FORMAT.usdCompact(result.monthlyInfraCost)}</span>
        </div>
      </div>

      {/* Savings */}
      {(result.cachingSavingsUsd > 0 || result.batchSavingsUsd > 0) && (
        <div className="border-t border-card-border pt-3 space-y-1">
          <p className="text-xs text-muted font-medium">Savings Applied</p>
          {result.cachingSavingsUsd > 0 && (
            <div className="flex justify-between text-xs">
              <span className="text-success">Prompt Caching</span>
              <span className="text-success font-mono">
                -{FORMAT.usdCompact(result.cachingSavingsUsd)}/mo
              </span>
            </div>
          )}
          {result.batchSavingsUsd > 0 && (
            <div className="flex justify-between text-xs">
              <span className="text-success">Batch API</span>
              <span className="text-success font-mono">
                -{FORMAT.usdCompact(result.batchSavingsUsd)}/mo
              </span>
            </div>
          )}
        </div>
      )}

      {/* Optimizations */}
      {result.optimizations.length > 0 && (
        <div className="border-t border-card-border pt-3 space-y-2">
          <p className="text-xs text-muted font-medium">Optimization Suggestions</p>
          {result.optimizations.slice(0, 3).map((opt) => (
            <div
              key={opt.id}
              className="bg-warning/5 border border-warning/20 rounded px-2.5 py-1.5"
            >
              <p className="text-xs font-medium text-warning">{opt.title}</p>
              <p className="text-xs text-muted mt-0.5">{opt.description}</p>
              <p className="text-xs text-warning/80 font-mono mt-0.5">
                ~{FORMAT.usdCompact(opt.estimatedSavingsUsd)}/mo savings
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function MetricCard({
  label,
  value,
  sublabel,
}: {
  label: string;
  value: string;
  sublabel: string;
}) {
  return (
    <div className="bg-background rounded-xl px-3 py-2 text-center">
      <p className="text-xs text-muted">{label}</p>
      <p className="text-sm font-mono font-semibold text-foreground">{value}</p>
      <p className="text-[10px] text-muted">{sublabel}</p>
    </div>
  );
}
