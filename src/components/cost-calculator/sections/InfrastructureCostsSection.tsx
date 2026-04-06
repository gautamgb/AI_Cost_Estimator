"use client";

import type { InfraConfig, CalculatorAction } from "@/lib/cost-calculator/types";
import { CollapsiblePanel } from "../primitives/CollapsiblePanel";
import { NumberInput } from "../primitives/NumberInput";

interface Props {
  infra: InfraConfig;
  dispatch: React.Dispatch<CalculatorAction>;
}

export function InfrastructureCostsSection({ infra, dispatch }: Props) {
  const update = (payload: Partial<InfraConfig>) =>
    dispatch({ type: "SET_INFRA", payload });

  const totalInfra =
    infra.vectorDbMonthlyCost +
    infra.observabilityMonthlyCost +
    infra.computeMonthlyCost +
    infra.customItems.reduce((s, i) => s + i.monthlyCost, 0);

  return (
    <CollapsiblePanel
      title="Infrastructure Costs"
      subtitle={`$${totalInfra.toFixed(0)}/mo`}
      defaultOpen={false}
    >
      <div className="space-y-3">
        <div className="grid grid-cols-3 gap-3">
          <NumberInput
            label="Vector DB"
            value={infra.vectorDbMonthlyCost}
            unit="$/mo"
            onChange={(v) => update({ vectorDbMonthlyCost: v })}
          />
          <NumberInput
            label="Observability"
            value={infra.observabilityMonthlyCost}
            unit="$/mo"
            onChange={(v) => update({ observabilityMonthlyCost: v })}
          />
          <NumberInput
            label="Compute"
            value={infra.computeMonthlyCost}
            unit="$/mo"
            onChange={(v) => update({ computeMonthlyCost: v })}
          />
        </div>

        {/* Custom line items */}
        {infra.customItems.map((item, i) => (
          <div key={item.id} className="flex items-end gap-2">
            <div className="flex-1">
              <NumberInput
                label={item.name}
                value={item.monthlyCost}
                unit="$/mo"
                onChange={(v) => {
                  const items = [...infra.customItems];
                  items[i] = { ...items[i], monthlyCost: v };
                  update({ customItems: items });
                }}
              />
            </div>
            <button
              onClick={() => {
                const items = infra.customItems.filter((_, idx) => idx !== i);
                update({ customItems: items });
              }}
              className="text-xs text-danger hover:text-danger/80 pb-2"
            >
              Remove
            </button>
          </div>
        ))}

        <button
          onClick={() => {
            const items = [
              ...infra.customItems,
              {
                id: `custom-${Date.now()}`,
                name: `Custom ${infra.customItems.length + 1}`,
                monthlyCost: 0,
              },
            ];
            update({ customItems: items });
          }}
          className="w-full py-1.5 border border-dashed border-card-border rounded text-xs text-muted hover:text-foreground hover:border-accent transition-colors"
        >
          + Add Line Item
        </button>
      </div>
    </CollapsiblePanel>
  );
}
