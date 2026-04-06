"use client";

import type { UsageConfig, CalculatorAction } from "@/lib/cost-calculator/types";
import { LIMITS } from "@/lib/cost-calculator/constants";
import { CollapsiblePanel } from "../primitives/CollapsiblePanel";
import { NumberInput } from "../primitives/NumberInput";

interface Props {
  usage: UsageConfig;
  dispatch: React.Dispatch<CalculatorAction>;
}

export function UsageEstimatorSection({ usage, dispatch }: Props) {
  const monthlyTasks = usage.tasksPerDay * usage.daysPerMonth * usage.usersCount;

  return (
    <CollapsiblePanel
      title="Usage Parameters"
      subtitle={`${monthlyTasks.toLocaleString()} tasks/month`}
    >
      <div className="space-y-3">
        <div className="grid grid-cols-3 gap-3">
          <NumberInput
            label="Tasks / Day"
            value={usage.tasksPerDay}
            min={1}
            max={LIMITS.maxTasksPerDay}
            onChange={(v) =>
              dispatch({ type: "SET_USAGE", payload: { tasksPerDay: v } })
            }
          />
          <NumberInput
            label="Users"
            value={usage.usersCount}
            min={1}
            max={LIMITS.maxUsers}
            onChange={(v) =>
              dispatch({ type: "SET_USAGE", payload: { usersCount: v } })
            }
          />
          <NumberInput
            label="Days / Month"
            value={usage.daysPerMonth}
            min={1}
            max={31}
            onChange={(v) =>
              dispatch({ type: "SET_USAGE", payload: { daysPerMonth: v } })
            }
          />
        </div>
        <div className="bg-background rounded px-3 py-2">
          <p className="text-xs text-muted">
            Total:{" "}
            <span className="text-foreground font-mono">
              {monthlyTasks.toLocaleString()}
            </span>{" "}
            tasks/month
          </p>
        </div>
      </div>
    </CollapsiblePanel>
  );
}
