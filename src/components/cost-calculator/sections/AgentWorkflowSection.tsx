"use client";

import type {
  AgenticWorkflowConfig,
  CalculatorAction,
  AgentDefinition,
  OrchestrationPattern,
  ContextStrategy,
  AgentRole,
} from "@/lib/cost-calculator/types";
import { DEFAULTS, LIMITS } from "@/lib/cost-calculator/constants";
import { MODEL_CATALOG } from "@/lib/cost-calculator/models";
import { CollapsiblePanel } from "../primitives/CollapsiblePanel";
import { SliderInput } from "../primitives/SliderInput";
import { SelectInput } from "../primitives/SelectInput";
import { NumberInput } from "../primitives/NumberInput";

interface Props {
  workflow: AgenticWorkflowConfig;
  dispatch: React.Dispatch<CalculatorAction>;
}

const PATTERN_OPTIONS = [
  { value: "sequential", label: "Sequential Chain" },
  { value: "parallel-fanout", label: "Parallel Fan-out" },
  { value: "hierarchical", label: "Hierarchical (Manager/Worker)" },
  { value: "iterative-loop", label: "Iterative Loop" },
  { value: "custom", label: "Custom" },
];

const CONTEXT_OPTIONS = [
  { value: "full-history", label: "Full History" },
  { value: "sliding-window", label: "Sliding Window" },
  { value: "summary-compression", label: "Summary Compression" },
  { value: "stateless", label: "Stateless" },
];

const ROLE_OPTIONS = [
  { value: "orchestrator", label: "Orchestrator" },
  { value: "worker", label: "Worker" },
  { value: "classifier", label: "Classifier/Router" },
  { value: "evaluator", label: "Evaluator/Reviewer" },
];

const LLM_MODELS = MODEL_CATALOG.filter((m) => !m.isEmbeddingModel);

export function AgentWorkflowSection({ workflow, dispatch }: Props) {
  const addAgent = () => {
    const id = `agent-${Date.now()}`;
    const newAgent: AgentDefinition = {
      id,
      name: `Agent ${workflow.agents.length + 1}`,
      modelId: "claude-sonnet-4",
      role: "worker",
      avgStepsPerTask: 3,
      avgToolCallsPerStep: 2,
      toolDefinitionCount: 5,
      systemPromptTokens: DEFAULTS.systemPromptTokens,
      avgInputTokensPerStep: DEFAULTS.avgInputTokensPerStep,
      avgOutputTokensPerStep: DEFAULTS.avgOutputTokensPerStep,
      reflectionPasses: 0,
      contextStrategy: "full-history",
      cacheableInputFraction: DEFAULTS.cacheableInputFraction,
      stackComponents: [
        {
          id: `${id}-gen`,
          name: "LLM Generation",
          category: "llm",
          modelId: "claude-sonnet-4",
          avgInputTokens: 3500,
          avgOutputTokens: 800,
          cacheable: true,
          cacheHitRate: 0.5,
          callsPerInvocation: 3,
        },
      ],
    };
    dispatch({ type: "ADD_AGENT", payload: newAgent });
  };

  const updateAgent = (index: number, updates: Partial<AgentDefinition>) => {
    dispatch({ type: "SET_AGENT", payload: { index, agent: updates } });
  };

  return (
    <CollapsiblePanel
      title="Agentic Workflow"
      subtitle={`${workflow.agents.length} agent${workflow.agents.length !== 1 ? "s" : ""} · ${PATTERN_OPTIONS.find((p) => p.value === workflow.pattern)?.label}`}
    >
      <div className="space-y-4">
        {/* Orchestration Pattern */}
        <div className="grid grid-cols-2 gap-3">
          <SelectInput
            label="Orchestration Pattern"
            value={workflow.pattern}
            options={PATTERN_OPTIONS}
            onChange={(v) =>
              dispatch({
                type: "SET_WORKFLOW",
                payload: { pattern: v as OrchestrationPattern },
              })
            }
          />
          {workflow.pattern === "parallel-fanout" && (
            <NumberInput
              label="Parallel Branches"
              value={workflow.parallelBranches ?? 3}
              min={2}
              max={LIMITS.maxParallelBranches}
              onChange={(v) =>
                dispatch({
                  type: "SET_WORKFLOW",
                  payload: { parallelBranches: v },
                })
              }
            />
          )}
          {workflow.pattern === "iterative-loop" && (
            <NumberInput
              label="Avg Iterations"
              value={workflow.avgIterations ?? 3}
              min={1}
              max={LIMITS.maxIterations}
              onChange={(v) =>
                dispatch({
                  type: "SET_WORKFLOW",
                  payload: { avgIterations: v },
                })
              }
            />
          )}
        </div>

        <SliderInput
          label="Error/Retry Rate"
          value={workflow.errorRetryRate}
          min={0}
          max={0.3}
          step={0.01}
          onChange={(v) =>
            dispatch({
              type: "SET_WORKFLOW",
              payload: { errorRetryRate: v },
            })
          }
          formatValue={(v) => `${(v * 100).toFixed(0)}%`}
        />

        {/* Agent Cards */}
        <div className="space-y-3">
          {workflow.agents.map((agent, index) => (
            <div
              key={agent.id}
              className="border border-card-border rounded-xl bg-background p-3 space-y-3"
            >
              {/* Agent Header */}
              <div className="flex items-center justify-between">
                <input
                  type="text"
                  value={agent.name}
                  onChange={(e) =>
                    updateAgent(index, { name: e.target.value })
                  }
                  className="bg-transparent text-sm font-medium text-foreground border-none focus:outline-none"
                />
                {workflow.agents.length > 1 && (
                  <button
                    onClick={() =>
                      dispatch({
                        type: "REMOVE_AGENT",
                        payload: { index },
                      })
                    }
                    className="text-xs text-danger hover:text-danger/80 transition-colors"
                  >
                    Remove
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <SelectInput
                  label="Model"
                  value={agent.modelId}
                  options={LLM_MODELS.map((m) => ({
                    value: m.id,
                    label: `${m.name} ($${m.pricing.inputPer1M}/$${m.pricing.outputPer1M})`,
                  }))}
                  onChange={(v) => updateAgent(index, { modelId: v })}
                />
                <SelectInput
                  label="Role"
                  value={agent.role}
                  options={ROLE_OPTIONS}
                  onChange={(v) =>
                    updateAgent(index, { role: v as AgentRole })
                  }
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <SliderInput
                  label="Steps per Task"
                  value={agent.avgStepsPerTask}
                  min={1}
                  max={LIMITS.maxStepsPerTask}
                  onChange={(v) =>
                    updateAgent(index, { avgStepsPerTask: v })
                  }
                />
                <SliderInput
                  label="Tool Calls per Step"
                  value={agent.avgToolCallsPerStep}
                  min={0}
                  max={LIMITS.maxToolCallsPerStep}
                  onChange={(v) =>
                    updateAgent(index, { avgToolCallsPerStep: v })
                  }
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <NumberInput
                  label="Tool Definitions"
                  value={agent.toolDefinitionCount}
                  min={0}
                  max={LIMITS.maxToolDefinitions}
                  onChange={(v) =>
                    updateAgent(index, { toolDefinitionCount: v })
                  }
                />
                <NumberInput
                  label="System Prompt Tokens"
                  value={agent.systemPromptTokens}
                  min={0}
                  max={50000}
                  step={100}
                  onChange={(v) =>
                    updateAgent(index, { systemPromptTokens: v })
                  }
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <SelectInput
                  label="Context Strategy"
                  value={agent.contextStrategy}
                  options={CONTEXT_OPTIONS}
                  onChange={(v) =>
                    updateAgent(index, {
                      contextStrategy: v as ContextStrategy,
                    })
                  }
                />
                <SliderInput
                  label="Reflection Passes"
                  value={agent.reflectionPasses}
                  min={0}
                  max={5}
                  onChange={(v) =>
                    updateAgent(index, { reflectionPasses: v })
                  }
                />
              </div>

              {agent.contextStrategy === "sliding-window" && (
                <NumberInput
                  label="Window Size (tokens)"
                  value={agent.slidingWindowSize ?? 32000}
                  min={1000}
                  max={200000}
                  step={1000}
                  onChange={(v) =>
                    updateAgent(index, { slidingWindowSize: v })
                  }
                />
              )}

              <SliderInput
                label="Cacheable Input Fraction"
                value={agent.cacheableInputFraction}
                min={0}
                max={1}
                step={0.05}
                onChange={(v) =>
                  updateAgent(index, { cacheableInputFraction: v })
                }
                formatValue={(v) => `${(v * 100).toFixed(0)}%`}
              />
            </div>
          ))}
        </div>

        {workflow.agents.length < LIMITS.maxAgents && (
          <button
            onClick={addAgent}
            className="w-full py-2 border border-dashed border-card-border rounded-xl text-xs text-muted hover:text-foreground hover:border-accent transition-colors"
          >
            + Add Agent
          </button>
        )}
      </div>
    </CollapsiblePanel>
  );
}
