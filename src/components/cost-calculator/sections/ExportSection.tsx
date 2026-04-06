"use client";

import { useState, useCallback } from "react";
import type { CostResult, UsageConfig, CalculatorState, CalculatorAction } from "@/lib/cost-calculator/types";
import { downloadCsv } from "@/lib/cost-calculator/csv-export";
import { serializeState } from "@/lib/cost-calculator/url-state";
import { saveNamedConfig, loadAllConfigs, deleteConfig } from "@/lib/cost-calculator/storage";

interface Props {
  result: CostResult;
  usage: UsageConfig;
  state: CalculatorState;
  dispatch: React.Dispatch<CalculatorAction>;
}

export function ExportSection({ result, usage, state, dispatch }: Props) {
  const [copied, setCopied] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [savedConfigs, setSavedConfigs] = useState<ReturnType<typeof loadAllConfigs>>([]);
  const [showSaved, setShowSaved] = useState(false);

  const refreshConfigs = useCallback(() => {
    setSavedConfigs(loadAllConfigs());
  }, []);

  const toggleSaved = () => {
    const next = !showSaved;
    setShowSaved(next);
    if (next) refreshConfigs();
  };

  const copyShareableUrl = () => {
    const encoded = serializeState(state);
    const url = new URL(window.location.href);
    url.searchParams.set("config", encoded);
    navigator.clipboard.writeText(url.toString());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = () => {
    if (!saveName.trim()) return;
    saveNamedConfig(saveName.trim(), state);
    setSaveName("");
    refreshConfigs();
  };

  const handleDelete = (id: string) => {
    deleteConfig(id);
    setSavedConfigs((prev) => prev.filter((c) => c.id !== id));
  };

  return (
    <div className="border border-card-border rounded-xl bg-card p-4 space-y-3">
      <h3 className="text-sm font-semibold text-foreground">Export & Share</h3>

      <div className="flex gap-2">
        <button
          onClick={() => downloadCsv(result, usage)}
          className="flex-1 px-3 py-2 bg-background border border-card-border rounded-lg text-xs text-foreground hover:border-accent transition-colors"
        >
          Export CSV
        </button>
        <button
          onClick={copyShareableUrl}
          className="flex-1 px-3 py-2 bg-background border border-card-border rounded-lg text-xs text-foreground hover:border-accent transition-colors"
        >
          {copied ? "Copied!" : "Copy Share URL"}
        </button>
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          value={saveName}
          onChange={(e) => setSaveName(e.target.value)}
          placeholder="Config name..."
          className="flex-1 bg-background border border-card-border rounded-lg px-2.5 py-2 text-xs text-foreground focus:outline-none focus:border-accent"
          onKeyDown={(e) => e.key === "Enter" && handleSave()}
        />
        <button
          onClick={handleSave}
          disabled={!saveName.trim()}
          className="px-3 py-2 bg-accent text-white rounded-lg text-xs disabled:opacity-50 hover:bg-accent-hover transition-colors"
        >
          Save
        </button>
      </div>

      <button
        onClick={toggleSaved}
        className="text-xs text-muted hover:text-foreground transition-colors"
      >
        {showSaved ? "Hide" : "Show"} saved configs
        {savedConfigs.length > 0 && ` (${savedConfigs.length})`}
      </button>

      {showSaved && savedConfigs.length > 0 && (
        <div className="space-y-1">
          {savedConfigs.map((config) => (
            <div
              key={config.id}
              className="flex items-center justify-between bg-background rounded-lg px-2.5 py-1.5"
            >
              <button
                onClick={() =>
                  dispatch({ type: "LOAD_STATE", payload: config.state })
                }
                className="text-xs text-foreground hover:text-accent transition-colors text-left flex-1"
              >
                {config.name}
                <span className="text-muted ml-2">
                  {new Date(config.savedAt).toLocaleDateString()}
                </span>
              </button>
              <button
                onClick={() => handleDelete(config.id)}
                className="text-xs text-danger hover:text-danger/80 ml-2"
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
