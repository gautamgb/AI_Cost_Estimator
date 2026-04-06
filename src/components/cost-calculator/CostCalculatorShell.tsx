"use client";

import type {
  CalculatorState,
  CalculatorAction,
  CostResult,
  WorkflowPreset,
} from "@/lib/cost-calculator/types";
import { ModelCatalogSection } from "./sections/ModelCatalogSection";
import { AgentWorkflowSection } from "./sections/AgentWorkflowSection";
import { UsageEstimatorSection } from "./sections/UsageEstimatorSection";
import { PricingTiersSection } from "./sections/PricingTiersSection";
import { InfrastructureCostsSection } from "./sections/InfrastructureCostsSection";
import { CostSummarySection } from "./sections/CostSummarySection";
import { StackBreakdownPanel } from "./sections/StackBreakdownPanel";
import { ExportSection } from "./sections/ExportSection";
import { ComparisonModeSection } from "./sections/ComparisonModeSection";

interface ShellProps {
  state: CalculatorState;
  result: CostResult;
  presets: WorkflowPreset[];
  activePreset: WorkflowPreset | null;
  dispatch: React.Dispatch<CalculatorAction>;
  onLoadPreset: (presetId: string) => void;
}

export function CostCalculatorShell({
  state,
  result,
  presets,
  activePreset,
  dispatch,
  onLoadPreset,
}: ShellProps) {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-card-border bg-white/80 backdrop-blur-xl sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-foreground">
              LLM Agentic Cost Calculator
            </h1>
            <p className="text-xs text-muted">
              Real-world cost estimation for agentic workflows
            </p>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={state.activePresetId ?? ""}
              onChange={(e) => {
                if (e.target.value) onLoadPreset(e.target.value);
              }}
              className="bg-background border border-card-border rounded px-2.5 py-1.5 text-sm text-foreground focus:outline-none focus:border-accent"
            >
              <option value="">Load Preset...</option>
              {presets.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <button
              onClick={() => dispatch({ type: "RESET" })}
              className="text-xs text-muted hover:text-foreground transition-colors px-2 py-1"
            >
              Reset
            </button>
          </div>
        </div>
      </header>

      {/* Active Preset Banner */}
      {activePreset && (
        <div className="bg-accent/10 border-b border-accent/20">
          <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-between">
            <div>
              <span className="text-xs font-medium text-accent">
                {activePreset.name}
              </span>
              <span className="text-xs text-muted ml-2">
                {activePreset.description}
              </span>
            </div>
            <span className="text-xs text-accent font-mono">
              {activePreset.costMetricLabel}
            </span>
          </div>
        </div>
      )}

      {/* Main Layout: Config (left) + Results (right) */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Configuration Panel */}
          <div className="lg:col-span-7 space-y-4">
            <AgentWorkflowSection
              workflow={state.workflow}
              dispatch={dispatch}
            />
            <UsageEstimatorSection
              usage={state.usage}
              dispatch={dispatch}
            />
            <PricingTiersSection
              pricing={state.pricing}
              dispatch={dispatch}
            />
            <ModelCatalogSection />
            <InfrastructureCostsSection
              infra={state.infra}
              dispatch={dispatch}
            />
          </div>

          {/* Results Panel (sticky) */}
          <div className="lg:col-span-5">
            <div className="lg:sticky lg:top-20 space-y-4">
              <CostSummarySection
                result={result}
                usage={state.usage}
                costMetricLabel={activePreset?.costMetricLabel}
              />
              <StackBreakdownPanel
                stackBreakdown={result.stackBreakdown}
                agentBreakdowns={result.agentBreakdowns}
                pricingSource={state.pricing.pricingSource}
              />
              <ComparisonModeSection
                state={state}
                currentResult={result}
                dispatch={dispatch}
              />
              <ExportSection
                result={result}
                usage={state.usage}
                state={state}
                dispatch={dispatch}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
