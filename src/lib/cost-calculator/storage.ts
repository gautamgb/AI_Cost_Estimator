import type { CalculatorState } from "./types";

const STORAGE_KEY = "llm-cost-calculator-state";
const SAVED_CONFIGS_KEY = "llm-cost-calculator-saved";

interface SavedConfig {
  id: string;
  name: string;
  state: CalculatorState;
  savedAt: string;
}

/** Save current state to localStorage (auto-save) */
export function saveAutoState(state: CalculatorState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // localStorage full or unavailable
  }
}

/** Load auto-saved state */
export function loadAutoState(): CalculatorState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as CalculatorState;
  } catch {
    return null;
  }
}

/** Save a named configuration */
export function saveNamedConfig(name: string, state: CalculatorState): void {
  const configs = loadAllConfigs();
  const config: SavedConfig = {
    id: crypto.randomUUID(),
    name,
    state,
    savedAt: new Date().toISOString(),
  };
  configs.push(config);
  localStorage.setItem(SAVED_CONFIGS_KEY, JSON.stringify(configs));
}

/** Load all saved configurations */
export function loadAllConfigs(): SavedConfig[] {
  try {
    const raw = localStorage.getItem(SAVED_CONFIGS_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as SavedConfig[];
  } catch {
    return [];
  }
}

/** Delete a saved configuration */
export function deleteConfig(id: string): void {
  const configs = loadAllConfigs().filter((c) => c.id !== id);
  localStorage.setItem(SAVED_CONFIGS_KEY, JSON.stringify(configs));
}
