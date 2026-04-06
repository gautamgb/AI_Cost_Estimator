import type { CalculatorState } from "./types";

/** Serialize calculator state to a URL-safe string */
export function serializeState(state: CalculatorState): string {
  const json = JSON.stringify(state);
  return btoa(encodeURIComponent(json));
}

/** Deserialize calculator state from a URL-safe string */
export function deserializeState(encoded: string): CalculatorState | null {
  try {
    const json = decodeURIComponent(atob(encoded));
    return JSON.parse(json) as CalculatorState;
  } catch {
    return null;
  }
}

/** Write state to URL search params (replaces history, no navigation) */
export function writeStateToUrl(state: CalculatorState): void {
  const encoded = serializeState(state);
  const url = new URL(window.location.href);
  url.searchParams.set("config", encoded);
  window.history.replaceState({}, "", url.toString());
}

/** Read state from URL search params */
export function readStateFromUrl(): CalculatorState | null {
  const params = new URLSearchParams(window.location.search);
  const encoded = params.get("config");
  if (!encoded) return null;
  return deserializeState(encoded);
}
