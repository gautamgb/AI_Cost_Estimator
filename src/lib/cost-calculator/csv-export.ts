import type { CostResult, UsageConfig } from "./types";
import { FORMAT } from "./constants";

/** Generate CSV string from cost results */
export function generateCsv(result: CostResult, usage: UsageConfig): string {
  const monthlyTasks = usage.tasksPerDay * usage.daysPerMonth * usage.usersCount;
  const rows: string[][] = [];

  // Header
  rows.push(["LLM Agentic Cost Calculator — Export"]);
  rows.push([]);

  // Summary
  rows.push(["Summary"]);
  rows.push(["Cost per Invocation", FORMAT.usd(result.costPerInvocation)]);
  rows.push(["Monthly LLM Cost", FORMAT.usd(result.monthlyLlmCost, 2)]);
  rows.push(["Monthly Infrastructure", FORMAT.usd(result.monthlyInfraCost, 2)]);
  rows.push(["Total Monthly Cost", FORMAT.usd(result.totalMonthlyCost, 2)]);
  rows.push(["Annual Cost", FORMAT.usd(result.annualCost, 2)]);
  rows.push(["Cost per User/Month", FORMAT.usd(result.costPerUser, 2)]);
  rows.push(["Monthly Tasks", monthlyTasks.toString()]);
  rows.push(["Caching Savings", FORMAT.usd(result.cachingSavingsUsd, 2)]);
  rows.push(["Batch Savings", FORMAT.usd(result.batchSavingsUsd, 2)]);
  rows.push([]);

  // Stack Breakdown
  rows.push(["Stack Component", "Category", "Model", "Cost/Month", "Percentage", "API Calls"]);
  for (const sc of result.stackBreakdown) {
    rows.push([
      sc.componentName,
      sc.category,
      sc.modelName ?? "",
      FORMAT.usd(sc.costUsd),
      `${sc.percentage.toFixed(1)}%`,
      sc.callCount.toString(),
    ]);
  }
  rows.push([]);

  // Agent Breakdown
  rows.push(["Agent", "Model", "Cost/Month", "LLM Calls/Task", "Monthly Calls"]);
  for (const agent of result.agentBreakdowns) {
    rows.push([
      agent.agentName,
      agent.modelId,
      FORMAT.usd(agent.costUsd),
      agent.llmCallsPerTask.toString(),
      agent.totalMonthlyLlmCalls.toString(),
    ]);
  }

  // Convert to CSV string
  return rows
    .map((row) =>
      row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(",")
    )
    .join("\n");
}

/** Trigger CSV download in browser */
export function downloadCsv(result: CostResult, usage: UsageConfig): void {
  const csv = generateCsv(result, usage);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `llm-cost-estimate-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
