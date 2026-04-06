"use client";

import type {
  CalculatorState,
  CalculatorAction,
  CostResult,
  ComparisonConfig,
} from "@/lib/cost-calculator/types";
import { useMemo } from "react";
import { buildModelMap } from "@/lib/cost-calculator/models";
import { calculateAgenticWorkflowCost } from "@/lib/cost-calculator/agentic-engine";
import { FORMAT } from "@/lib/cost-calculator/constants";
import { LIMITS } from "@/lib/cost-calculator/constants";

interface Props {
  state: CalculatorState;
  currentResult: CostResult;
  dispatch: React.Dispatch<CalculatorAction>;
}

export function ComparisonModeSection({ state, currentResult, dispatch }: Props) {
  const modelMap = useMemo(() => buildModelMap(), []);

  const comparisonResults = useMemo(() => {
    return state.comparisonConfigs.map((config) => ({
      config,
      result: calculateAgenticWorkflowCost(
        config.workflow,
        modelMap,
        state.usage,
        config.pricing,
        state.infra
      ),
    }));
  }, [state.comparisonConfigs, state.usage, state.infra, modelMap]);

  if (state.comparisonConfigs.length === 0) {
    return (
      <div className="border border-card-border rounded-lg bg-card p-4 space-y-3">
        <h3 className="text-sm font-semibold text-foreground">Compare Configs</h3>
        <p className="text-xs text-muted">
          Save the current config to compare side-by-side with alternatives.
        </p>
        {state.comparisonConfigs.length < LIMITS.maxComparisonConfigs && (
          <button
            onClick={() =>
              dispatch({
                type: "ADD_COMPARISON",
                payload: { label: `Config ${state.comparisonConfigs.length + 1}` },
              })
            }
            className="w-full px-3 py-1.5 bg-accent text-white rounded text-xs hover:bg-accent-hover transition-colors"
          >
            Save Current as Comparison
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="border border-card-border rounded-lg bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Comparison</h3>
        {state.comparisonConfigs.length < LIMITS.maxComparisonConfigs && (
          <button
            onClick={() =>
              dispatch({
                type: "ADD_COMPARISON",
                payload: { label: `Config ${state.comparisonConfigs.length + 1}` },
              })
            }
            className="text-xs text-accent hover:text-accent-hover transition-colors"
          >
            + Add
          </button>
        )}
      </div>

      <div className="space-y-2">
        {/* Current config */}
        <ComparisonCard
          label="Current"
          result={currentResult}
          isCurrent
        />

        {/* Saved comparisons */}
        {comparisonResults.map(({ config, result }) => (
          <ComparisonCard
            key={config.id}
            label={config.label}
            result={result}
            baseResult={currentResult}
            onRemove={() =>
              dispatch({ type: "REMOVE_COMPARISON", payload: { id: config.id } })
            }
          />
        ))}
      </div>
    </div>
  );
}

function ComparisonCard({
  label,
  result,
  baseResult,
  isCurrent,
  onRemove,
}: {
  label: string;
  result: CostResult;
  baseResult?: CostResult;
  isCurrent?: boolean;
  onRemove?: () => void;
}) {
  const delta = baseResult
    ? result.totalMonthlyCost - baseResult.totalMonthlyCost
    : 0;
  const deltaPct = baseResult && baseResult.totalMonthlyCost > 0
    ? (delta / baseResult.totalMonthlyCost) * 100
    : 0;

  return (
    <div
      className={`rounded px-3 py-2 ${
        isCurrent
          ? "bg-accent/10 border border-accent/30"
          : "bg-background border border-card-border"
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-foreground">{label}</span>
        {onRemove && (
          <button
            onClick={onRemove}
            className="text-[10px] text-danger hover:text-danger/80"
          >
            Remove
          </button>
        )}
      </div>
      <div className="flex items-baseline gap-3 mt-1">
        <span className="text-sm font-mono font-semibold text-foreground">
          {FORMAT.usdCompact(result.totalMonthlyCost)}/mo
        </span>
        <span className="text-xs font-mono text-muted">
          {FORMAT.usd(result.costPerInvocation)}/task
        </span>
        {baseResult && delta !== 0 && (
          <span
            className={`text-xs font-mono ${delta > 0 ? "text-danger" : "text-success"}`}
          >
            {delta > 0 ? "+" : ""}
            {deltaPct.toFixed(1)}%
          </span>
        )}
      </div>
    </div>
  );
}
