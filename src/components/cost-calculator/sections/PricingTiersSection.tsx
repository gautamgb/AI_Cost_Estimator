"use client";

import type { PricingConfig, CalculatorAction, PricingSource } from "@/lib/cost-calculator/types";
import { CollapsiblePanel } from "../primitives/CollapsiblePanel";
import { SelectInput } from "../primitives/SelectInput";
import { SliderInput } from "../primitives/SliderInput";

interface Props {
  pricing: PricingConfig;
  dispatch: React.Dispatch<CalculatorAction>;
}

const PRICING_SOURCE_OPTIONS = [
  { value: "direct-api", label: "Direct API" },
  { value: "aws-bedrock", label: "AWS Bedrock" },
  { value: "azure", label: "Azure OpenAI" },
  { value: "gcp-vertex", label: "GCP Vertex AI" },
];

export function PricingTiersSection({ pricing, dispatch }: Props) {
  const update = (payload: Partial<PricingConfig>) =>
    dispatch({ type: "SET_PRICING", payload });

  return (
    <CollapsiblePanel
      title="Pricing Tier"
      subtitle={PRICING_SOURCE_OPTIONS.find((o) => o.value === pricing.pricingSource)?.label}
      defaultOpen={false}
    >
      <div className="space-y-3">
        <SelectInput
          label="Pricing Source"
          value={pricing.pricingSource}
          options={PRICING_SOURCE_OPTIONS}
          onChange={(v) => update({ pricingSource: v as PricingSource })}
        />

        <div className="space-y-2">
          <Toggle
            label="Prompt Caching"
            description="Up to 90% discount on cached input tokens"
            checked={pricing.promptCachingEnabled}
            onChange={(v) => update({ promptCachingEnabled: v })}
          />
          <Toggle
            label="Batch API"
            description="50% discount for async, non-realtime workloads"
            checked={pricing.batchApiEnabled}
            onChange={(v) => update({ batchApiEnabled: v })}
          />
        </div>

        {pricing.batchApiEnabled && (
          <SliderInput
            label="Batch-Eligible Fraction"
            value={pricing.batchEligibleFraction}
            min={0}
            max={1}
            step={0.05}
            onChange={(v) => update({ batchEligibleFraction: v })}
            formatValue={(v) => `${(v * 100).toFixed(0)}%`}
          />
        )}
      </div>
    </CollapsiblePanel>
  );
}

function Toggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className="w-full flex items-center justify-between bg-background rounded px-3 py-2 hover:bg-white/5 transition-colors text-left"
    >
      <div>
        <p className="text-xs text-foreground">{label}</p>
        <p className="text-[10px] text-muted">{description}</p>
      </div>
      <div
        className={`w-8 h-4 rounded-full transition-colors ${
          checked ? "bg-accent" : "bg-card-border"
        }`}
      >
        <div
          className={`w-3 h-3 rounded-full bg-white transition-transform mt-0.5 ${
            checked ? "translate-x-4.5" : "translate-x-0.5"
          }`}
        />
      </div>
    </button>
  );
}
