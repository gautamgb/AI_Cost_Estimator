"use client";

import { useState } from "react";
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
  const [showSaved, setShowSaved] = useState(false);
  const savedConfigs = showSaved ? loadAllConfigs() : [];

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
  };

  return (
    <div className="border border-card-border rounded-lg bg-card p-4 space-y-3">
      <h3 className="text-sm font-semibold text-foreground">Export & Share</h3>

      <div className="flex gap-2">
        <button
          onClick={() => downloadCsv(result, usage)}
          className="flex-1 px-3 py-1.5 bg-background border border-card-border rounded text-xs text-foreground hover:border-accent transition-colors"
        >
          Export CSV
        </button>
        <button
          onClick={copyShareableUrl}
          className="flex-1 px-3 py-1.5 bg-background border border-card-border rounded text-xs text-foreground hover:border-accent transition-colors"
        >
          {copied ? "Copied!" : "Copy Share URL"}
        </button>
      </div>

      {/* Save Config */}
      <div className="flex gap-2">
        <input
          type="text"
          value={saveName}
          onChange={(e) => setSaveName(e.target.value)}
          placeholder="Config name..."
          className="flex-1 bg-background border border-card-border rounded px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:border-accent"
          onKeyDown={(e) => e.key === "Enter" && handleSave()}
        />
        <button
          onClick={handleSave}
          disabled={!saveName.trim()}
          className="px-3 py-1.5 bg-accent text-white rounded text-xs disabled:opacity-50 hover:bg-accent-hover transition-colors"
        >
          Save
        </button>
      </div>

      {/* Load Saved */}
      <button
        onClick={() => setShowSaved(!showSaved)}
        className="text-xs text-muted hover:text-foreground transition-colors"
      >
        {showSaved ? "Hide" : "Show"} saved configs ({loadAllConfigs().length})
      </button>

      {showSaved && savedConfigs.length > 0 && (
        <div className="space-y-1">
          {savedConfigs.map((config) => (
            <div
              key={config.id}
              className="flex items-center justify-between bg-background rounded px-2.5 py-1.5"
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
                onClick={() => {
                  deleteConfig(config.id);
                  setShowSaved(false);
                  setTimeout(() => setShowSaved(true), 0);
                }}
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
