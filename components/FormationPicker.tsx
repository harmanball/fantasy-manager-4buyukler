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
      className="flex shrink-0 gap-1.5 overflow-x-auto pb-1 -mx-1 px-1 [&::-webkit-scrollbar]:hidden"
      style={{ scrollbarWidth: "none" }}
    >
      {FORMATIONS.map((f) => {
        const active = f === value;
        return (
          <button
            key={f}
            onClick={() => onChange(f)}
            aria-pressed={active}
            className={`flex h-7 shrink-0 items-center justify-center whitespace-nowrap rounded-full px-3 text-xs font-medium transition-colors ${
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
