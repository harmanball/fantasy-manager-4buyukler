"use client";

import { useState } from "react";
import { Player, Position } from "@/lib/players";
import { TeamBadge } from "./TeamBadge";

export function PlayerSheet({
  position,
  players,
  teamCounts,
  onPick,
  onClose,
}: {
  position: Position;
  players: Player[];
  teamCounts: Record<string, number>;
  onPick: (p: Player) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const filtered = players.filter(
    (p) =>
      p.position === position &&
      p.name.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-charcoal/50 sm:items-center"
      onClick={onClose}
    >
      <div
        className="flex max-h-[80vh] w-full flex-col rounded-t-2xl bg-background sm:max-w-md sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-charcoal/10 px-4 py-3">
          <h2 className="font-display text-base font-medium">
            Oyuncu ekle — {position}
          </h2>
          <button
            onClick={onClose}
            aria-label="Kapat"
            className="flex h-8 w-8 items-center justify-center rounded-full text-foreground/60 hover:bg-charcoal/5"
          >
            ✕
          </button>
        </div>

        <div className="px-4 py-2">
          <input
            autoFocus
            type="text"
            inputMode="search"
            placeholder="Oyuncu ara"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-10 w-full rounded-lg border border-charcoal/15 bg-white px-3 text-sm outline-none focus:border-pitch"
          />
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-4">
          {filtered.length === 0 && (
            <p className="py-6 text-center text-sm text-foreground/50">
              Bu mevkide oyuncu bulunamadı.
            </p>
          )}
          <ul className="flex flex-col gap-2">
            {filtered.map((p) => {
              const atLimit = (teamCounts[p.team] ?? 0) >= 3;
              return (
                <li
                  key={p.id}
                  className="flex items-center justify-between rounded-lg border border-charcoal/10 bg-white px-3 py-2.5"
                >
                  <div className="flex items-center gap-3">
                    <TeamBadge team={p.team} size={26} />
                    <div>
                      <p className="text-sm font-medium leading-tight">{p.name}</p>
                      <p className="text-xs text-foreground/50">{p.team}</p>
                    </div>
                  </div>
                  <button
                    disabled={atLimit}
                    onClick={() => onPick(p)}
                    className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                      atLimit
                        ? "cursor-not-allowed border border-charcoal/10 text-foreground/30"
                        : "border border-charcoal/20 text-foreground hover:bg-pitch hover:text-ivory hover:border-pitch"
                    }`}
                  >
                    {atLimit ? "Limit doldu" : "Ekle"}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}
