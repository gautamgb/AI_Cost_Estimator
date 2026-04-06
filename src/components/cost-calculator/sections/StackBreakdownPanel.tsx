"use client";

import { useState } from "react";
import type {
  StackComponentCost,
  AgentCostBreakdown,
  PricingSource,
} from "@/lib/cost-calculator/types";
import { FORMAT } from "@/lib/cost-calculator/constants";

interface Props {
  stackBreakdown: StackComponentCost[];
  agentBreakdowns: AgentCostBreakdown[];
  pricingSource: PricingSource;
}

const CATEGORY_COLORS: Record<string, string> = {
  llm: "bg-blue-500",
  embedding: "bg-purple-500",
  search: "bg-green-500",
  infra: "bg-orange-500",
  guardrail: "bg-yellow-500",
  routing: "bg-cyan-500",
  reranking: "bg-pink-500",
};

export function StackBreakdownPanel({
  stackBreakdown,
  agentBreakdowns,
  pricingSource,
}: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"stack" | "agent">("stack");

  const totalCost = stackBreakdown.reduce((s, c) => s + c.costUsd, 0);

  return (
    <div className="border border-card-border rounded-xl bg-card">
      {/* Header */}
      <div className="px-4 py-3 border-b border-card-border flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">
          Cost Breakdown
        </h3>
        <div className="flex gap-1 bg-background rounded p-0.5">
          <button
            onClick={() => setViewMode("stack")}
            className={`px-2 py-0.5 text-xs rounded transition-colors ${
              viewMode === "stack"
                ? "bg-accent text-white"
                : "text-muted hover:text-foreground"
            }`}
          >
            By Stack
          </button>
          <button
            onClick={() => setViewMode("agent")}
            className={`px-2 py-0.5 text-xs rounded transition-colors ${
              viewMode === "agent"
                ? "bg-accent text-white"
                : "text-muted hover:text-foreground"
            }`}
          >
            By Agent
          </button>
        </div>
      </div>

      {/* Stack View */}
      {viewMode === "stack" && (
        <div className="divide-y divide-card-border">
          {stackBreakdown.length === 0 && (
            <p className="px-4 py-6 text-xs text-muted text-center">
              Configure a workflow to see cost breakdown
            </p>
          )}
          {stackBreakdown.map((component) => {
            const isExpanded = expandedId === component.componentId;
            const pct =
              totalCost > 0
                ? (component.costUsd / totalCost) * 100
                : 0;

            return (
              <div key={component.componentId}>
                <button
                  onClick={() =>
                    setExpandedId(isExpanded ? null : component.componentId)
                  }
                  className="w-full px-4 py-2.5 flex items-center gap-3 hover:bg-black/[0.03] transition-colors text-left"
                >
                  {/* Category dot */}
                  <span
                    className={`w-2 h-2 rounded-full flex-shrink-0 ${
                      CATEGORY_COLORS[component.category] ?? "bg-gray-500"
                    }`}
                  />

                  {/* Name + model */}
                  <div className="flex-1 min-w-0">
                    <span className="text-xs text-foreground truncate block">
                      {component.componentName}
                    </span>
                    {component.modelName && (
                      <span className="text-[10px] text-muted">
                        {component.modelName}
                      </span>
                    )}
                  </div>

                  {/* Cost + percentage */}
                  <div className="text-right flex-shrink-0">
                    <span className="text-xs font-mono text-foreground block">
                      {FORMAT.usd(component.costUsd)}/mo
                    </span>
                    <span className="text-[10px] text-muted font-mono">
                      {pct.toFixed(1)}%
                    </span>
                  </div>

                  {/* Expand chevron */}
                  <svg
                    className={`w-3 h-3 text-muted transition-transform flex-shrink-0 ${
                      isExpanded ? "rotate-180" : ""
                    }`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>

                {/* Expanded Detail (Level 3) */}
                {isExpanded && (
                  <div className="px-4 pb-3 pl-9 space-y-1.5">
                    <DetailRow
                      label="Input tokens"
                      value={`${FORMAT.tokenKFormat(component.tokens.uncachedInputTokens)} uncached + ${FORMAT.tokenKFormat(component.tokens.cachedInputTokens)} cached`}
                    />
                    <DetailRow
                      label="Output tokens"
                      value={FORMAT.tokenKFormat(component.tokens.outputTokens)}
                    />
                    <DetailRow
                      label="API calls"
                      value={FORMAT.tokenKFormat(component.callCount)}
                    />
                    {component.details.cachedSavingsUsd > 0 && (
                      <DetailRow
                        label="Caching savings"
                        value={`-${FORMAT.usd(component.details.cachedSavingsUsd)}/mo`}
                        className="text-success"
                      />
                    )}
                    {pricingSource === "aws-bedrock" &&
                      component.details.bedrockDeltaUsd !== 0 && (
                        <DetailRow
                          label="Bedrock vs Direct API"
                          value={`${component.details.bedrockDeltaUsd > 0 ? "+" : ""}${FORMAT.usd(component.details.bedrockDeltaUsd)}/mo`}
                          className={
                            component.details.bedrockDeltaUsd > 0
                              ? "text-warning"
                              : "text-success"
                          }
                        />
                      )}
                    {component.details.fixedCosts > 0 && (
                      <DetailRow
                        label="Fixed costs"
                        value={`${FORMAT.usd(component.details.fixedCosts)}/mo`}
                      />
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Agent View */}
      {viewMode === "agent" && (
        <div className="divide-y divide-card-border">
          {agentBreakdowns.length === 0 && (
            <p className="px-4 py-6 text-xs text-muted text-center">
              No agents configured
            </p>
          )}
          {agentBreakdowns.map((agent) => {
            const pct =
              totalCost > 0 ? (agent.costUsd / totalCost) * 100 : 0;
            const isExpanded = expandedId === agent.agentId;

            return (
              <div key={agent.agentId}>
                <button
                  onClick={() =>
                    setExpandedId(isExpanded ? null : agent.agentId)
                  }
                  className="w-full px-4 py-2.5 flex items-center gap-3 hover:bg-black/[0.03] transition-colors text-left"
                >
                  <span className="w-2 h-2 rounded-full bg-accent flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <span className="text-xs text-foreground truncate block">
                      {agent.agentName}
                    </span>
                    <span className="text-[10px] text-muted">
                      {agent.llmCallsPerTask} calls/task
                    </span>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span className="text-xs font-mono text-foreground block">
                      {FORMAT.usd(agent.costUsd)}/mo
                    </span>
                    <span className="text-[10px] text-muted font-mono">
                      {pct.toFixed(1)}%
                    </span>
                  </div>
                  <svg
                    className={`w-3 h-3 text-muted transition-transform flex-shrink-0 ${isExpanded ? "rotate-180" : ""}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>
                {isExpanded && (
                  <div className="px-4 pb-3 pl-9 space-y-1.5">
                    <DetailRow
                      label="Monthly LLM calls"
                      value={FORMAT.tokenKFormat(agent.totalMonthlyLlmCalls)}
                    />
                    <DetailRow
                      label="Input tokens (uncached)"
                      value={FORMAT.tokenKFormat(agent.tokens.uncachedInputTokens)}
                    />
                    <DetailRow
                      label="Input tokens (cached)"
                      value={FORMAT.tokenKFormat(agent.tokens.cachedInputTokens)}
                    />
                    <DetailRow
                      label="Output tokens"
                      value={FORMAT.tokenKFormat(agent.tokens.outputTokens)}
                    />
                    {agent.tokens.reasoningTokens > 0 && (
                      <DetailRow
                        label="Reasoning tokens"
                        value={FORMAT.tokenKFormat(agent.tokens.reasoningTokens)}
                      />
                    )}
                    {/* Nested stack breakdown */}
                    {agent.stackBreakdown.length > 0 && (
                      <div className="mt-2 space-y-1">
                        <p className="text-[10px] text-muted uppercase tracking-wider">
                          Stack Components
                        </p>
                        {agent.stackBreakdown.map((sc) => (
                          <div
                            key={sc.componentId}
                            className="flex justify-between text-xs"
                          >
                            <span className="text-muted flex items-center gap-1.5">
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${CATEGORY_COLORS[sc.category] ?? "bg-gray-500"}`}
                              />
                              {sc.componentName}
                            </span>
                            <span className="font-mono text-foreground">
                              {FORMAT.usd(sc.costUsd)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Bar visualization at bottom */}
      {stackBreakdown.length > 0 && (
        <div className="px-4 py-3 border-t border-card-border">
          <div className="flex h-2 rounded-full overflow-hidden">
            {stackBreakdown.map((c) => {
              const pct = totalCost > 0 ? (c.costUsd / totalCost) * 100 : 0;
              if (pct < 0.5) return null;
              return (
                <div
                  key={c.componentId}
                  className={`${CATEGORY_COLORS[c.category] ?? "bg-gray-500"} opacity-80`}
                  style={{ width: `${pct}%` }}
                  title={`${c.componentName}: ${pct.toFixed(1)}%`}
                />
              );
            })}
          </div>
          {/* Legend */}
          <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
            {stackBreakdown
              .filter(
                (c) =>
                  totalCost > 0 && (c.costUsd / totalCost) * 100 >= 0.5
              )
              .map((c) => (
                <span
                  key={c.componentId}
                  className="flex items-center gap-1 text-[10px] text-muted"
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${CATEGORY_COLORS[c.category] ?? "bg-gray-500"}`}
                  />
                  {c.componentName}
                </span>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}

function DetailRow({
  label,
  value,
  className = "",
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className="flex justify-between text-xs">
      <span className="text-muted">{label}</span>
      <span className={`font-mono ${className || "text-foreground"}`}>
        {value}
      </span>
    </div>
  );
}
