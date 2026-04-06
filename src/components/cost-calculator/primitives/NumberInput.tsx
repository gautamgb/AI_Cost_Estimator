"use client";

interface NumberInputProps {
  label: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  onChange: (value: number) => void;
}

export function NumberInput({
  label,
  value,
  min = 0,
  max,
  step = 1,
  unit,
  onChange,
}: NumberInputProps) {
  return (
    <div className="space-y-1">
      <label className="text-xs text-muted">{label}</label>
      <div className="flex items-center gap-2">
        <input
          type="number"
          value={value}
          min={min}
          max={max}
          step={step}
          onChange={(e) => {
            const v = Number(e.target.value);
            if (!isNaN(v)) onChange(v);
          }}
          className="w-full bg-background border border-card-border rounded px-2.5 py-1.5 text-sm font-mono text-foreground focus:outline-none focus:border-accent"
        />
        {unit && <span className="text-xs text-muted whitespace-nowrap">{unit}</span>}
      </div>
    </div>
  );
}
