"use client";

import { useState } from "react";
import { MODEL_CATALOG } from "@/lib/cost-calculator/models";
import { CollapsiblePanel } from "../primitives/CollapsiblePanel";
import type { ModelProvider } from "@/lib/cost-calculator/types";

const PROVIDERS: { value: ModelProvider | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "openai", label: "OpenAI" },
  { value: "anthropic", label: "Anthropic" },
  { value: "google", label: "Google" },
  { value: "deepseek", label: "DeepSeek" },
  { value: "meta", label: "Meta" },
  { value: "mistral", label: "Mistral" },
  { value: "cohere", label: "Cohere" },
];

export function ModelCatalogSection() {
  const [filter, setFilter] = useState<ModelProvider | "all">("all");

  const models =
    filter === "all"
      ? MODEL_CATALOG
      : MODEL_CATALOG.filter((m) => m.provider === filter);

  return (
    <CollapsiblePanel
      title="Model Catalog"
      subtitle={`${MODEL_CATALOG.length} models · reference pricing`}
      defaultOpen={false}
    >
      <div className="space-y-3">
        {/* Provider Tabs */}
        <div className="flex flex-wrap gap-1">
          {PROVIDERS.map((p) => (
            <button
              key={p.value}
              onClick={() => setFilter(p.value)}
              className={`px-2 py-0.5 text-xs rounded transition-colors ${
                filter === p.value
                  ? "bg-accent text-white"
                  : "bg-background text-muted hover:text-foreground"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Model Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-muted border-b border-card-border">
                <th className="text-left py-1.5 pr-2 font-medium">Model</th>
                <th className="text-right py-1.5 px-2 font-medium">
                  Input/1M
                </th>
                <th className="text-right py-1.5 px-2 font-medium">
                  Output/1M
                </th>
                <th className="text-right py-1.5 px-2 font-medium">
                  Cached/1M
                </th>
                <th className="text-right py-1.5 pl-2 font-medium">Context</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-card-border/50">
              {models.map((m) => (
                <tr key={m.id} className="hover:bg-white/5 transition-colors">
                  <td className="py-1.5 pr-2">
                    <span className="text-foreground">{m.name}</span>
                    {m.isReasoningModel && (
                      <span className="ml-1 text-[10px] text-warning">
                        thinking
                      </span>
                    )}
                    {m.isEmbeddingModel && (
                      <span className="ml-1 text-[10px] text-purple-400">
                        embed
                      </span>
                    )}
                  </td>
                  <td className="text-right py-1.5 px-2 font-mono">
                    ${m.pricing.inputPer1M}
                  </td>
                  <td className="text-right py-1.5 px-2 font-mono">
                    ${m.pricing.outputPer1M}
                  </td>
                  <td className="text-right py-1.5 px-2 font-mono text-muted">
                    {m.pricing.cachedInputPer1M !== null
                      ? `$${m.pricing.cachedInputPer1M}`
                      : "—"}
                  </td>
                  <td className="text-right py-1.5 pl-2 font-mono text-muted">
                    {m.contextWindow >= 1_000_000
                      ? `${(m.contextWindow / 1_000_000).toFixed(0)}M`
                      : `${(m.contextWindow / 1_000).toFixed(0)}K`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </CollapsiblePanel>
  );
}
