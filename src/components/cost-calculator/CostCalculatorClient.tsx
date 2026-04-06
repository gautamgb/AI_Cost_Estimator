"use client";

import { useReducer, useMemo, useCallback, useEffect, useRef } from "react";
import type {
  CalculatorState,
  CalculatorAction,
  CostResult,
  AgentDefinition,
} from "@/lib/cost-calculator/types";
import { DEFAULTS } from "@/lib/cost-calculator/constants";
import { buildModelMap } from "@/lib/cost-calculator/models";
import { WORKFLOW_PRESETS, getPresetById } from "@/lib/cost-calculator/presets";
import { calculateAgenticWorkflowCost } from "@/lib/cost-calculator/agentic-engine";
import { readStateFromUrl, writeStateToUrl } from "@/lib/cost-calculator/url-state";
import { saveAutoState, loadAutoState } from "@/lib/cost-calculator/storage";
import { CostCalculatorShell } from "./CostCalculatorShell";

const DEFAULT_AGENT: AgentDefinition = {
  id: "agent-1",
  name: "Agent",
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
      id: "generation",
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

const initialState: CalculatorState = {
  workflow: {
    pattern: "sequential",
    agents: [DEFAULT_AGENT],
    errorRetryRate: DEFAULTS.errorRetryRate,
    orchestrationOverheadTokens: DEFAULTS.orchestrationOverheadTokens,
  },
  usage: {
    tasksPerDay: DEFAULTS.tasksPerDay,
    usersCount: DEFAULTS.usersCount,
    daysPerMonth: DEFAULTS.daysPerMonth,
  },
  pricing: {
    pricingSource: "direct-api",
    promptCachingEnabled: true,
    batchApiEnabled: false,
    batchEligibleFraction: 0.3,
  },
  infra: {
    vectorDbMonthlyCost: 0,
    observabilityMonthlyCost: 0,
    computeMonthlyCost: 0,
    customItems: [],
  },
  activePresetId: null,
  comparisonConfigs: [],
};

function calculatorReducer(
  state: CalculatorState,
  action: CalculatorAction
): CalculatorState {
  switch (action.type) {
    case "SET_WORKFLOW":
      return {
        ...state,
        activePresetId: null,
        workflow: { ...state.workflow, ...action.payload },
      };
    case "SET_AGENT": {
      const agents = [...state.workflow.agents];
      agents[action.payload.index] = {
        ...agents[action.payload.index],
        ...action.payload.agent,
      };
      return {
        ...state,
        activePresetId: null,
        workflow: { ...state.workflow, agents },
      };
    }
    case "ADD_AGENT":
      return {
        ...state,
        activePresetId: null,
        workflow: {
          ...state.workflow,
          agents: [...state.workflow.agents, action.payload],
        },
      };
    case "REMOVE_AGENT":
      return {
        ...state,
        activePresetId: null,
        workflow: {
          ...state.workflow,
          agents: state.workflow.agents.filter(
            (_, i) => i !== action.payload.index
          ),
        },
      };
    case "SET_USAGE":
      return {
        ...state,
        usage: { ...state.usage, ...action.payload },
      };
    case "SET_PRICING":
      return {
        ...state,
        pricing: { ...state.pricing, ...action.payload },
      };
    case "SET_INFRA":
      return {
        ...state,
        infra: { ...state.infra, ...action.payload },
      };
    case "LOAD_PRESET": {
      const preset = getPresetById(action.payload);
      if (!preset) return state;
      return {
        ...state,
        activePresetId: preset.id,
        workflow: preset.workflow,
        usage: preset.usage,
        infra: preset.infra,
      };
    }
    case "ADD_COMPARISON":
      return {
        ...state,
        comparisonConfigs: [
          ...state.comparisonConfigs,
          {
            id: crypto.randomUUID(),
            label: action.payload.label,
            workflow: state.workflow,
            pricing: state.pricing,
          },
        ],
      };
    case "REMOVE_COMPARISON":
      return {
        ...state,
        comparisonConfigs: state.comparisonConfigs.filter(
          (c) => c.id !== action.payload.id
        ),
      };
    case "LOAD_STATE":
      return action.payload;
    case "RESET":
      return initialState;
    default:
      return state;
  }
}

export function CostCalculatorClient() {
  const [state, dispatch] = useReducer(calculatorReducer, initialState);
  const modelMap = useMemo(() => buildModelMap(), []);
  const initialized = useRef(false);

  // Restore state from URL or localStorage on mount
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const urlState = readStateFromUrl();
    if (urlState) {
      dispatch({ type: "LOAD_STATE", payload: urlState });
      return;
    }

    const savedState = loadAutoState();
    if (savedState) {
      dispatch({ type: "LOAD_STATE", payload: savedState });
    }
  }, []);

  // Auto-save to localStorage (debounced)
  useEffect(() => {
    const timer = setTimeout(() => saveAutoState(state), 500);
    return () => clearTimeout(timer);
  }, [state]);

  const result: CostResult = useMemo(
    () =>
      calculateAgenticWorkflowCost(
        state.workflow,
        modelMap,
        state.usage,
        state.pricing,
        state.infra
      ),
    [state.workflow, state.usage, state.pricing, state.infra, modelMap]
  );

  const activePreset = state.activePresetId
    ? getPresetById(state.activePresetId) ?? null
    : null;

  const handleLoadPreset = useCallback(
    (presetId: string) => dispatch({ type: "LOAD_PRESET", payload: presetId }),
    []
  );

  return (
    <CostCalculatorShell
      state={state}
      result={result}
      presets={WORKFLOW_PRESETS}
      activePreset={activePreset}
      dispatch={dispatch}
      onLoadPreset={handleLoadPreset}
    />
  );
}
