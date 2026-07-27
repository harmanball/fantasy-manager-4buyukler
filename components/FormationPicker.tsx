"use client";

import { FORMATIONS, Formation } from "@/lib/teams";

export function FormationPicker({
  value,
  onChange,
}: {
  value: Formation;
  onChange: (f: Formation) => void;
}) {
  return (
    <div
      className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none"
      style={{ scrollbarWidth: "none" }}
    >
      {FORMATIONS.map((f) => {
        const active = f === value;
        return (
          <button
            key={f}
            onClick={() => onChange(f)}
            aria-pressed={active}
            className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              active
                ? "bg-pitch text-ivory"
                : "border border-charcoal/20 text-foreground/70 hover:border-charcoal/40"
            }`}
          >
            {f}
          </button>
        );
      })}
    </div>
  );
}
