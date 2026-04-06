"use client";

interface SelectOption {
  value: string;
  label: string;
}

interface SelectInputProps {
  label: string;
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
}

export function SelectInput({
  label,
  value,
  options,
  onChange,
}: SelectInputProps) {
  return (
    <div className="space-y-1">
      <label className="text-xs text-muted">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-background border border-card-border rounded-lg px-2.5 py-1.5 text-sm text-foreground focus:outline-none focus:border-accent"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
