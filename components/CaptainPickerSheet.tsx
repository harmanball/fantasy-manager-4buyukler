"use client";

import { Player } from "@/lib/players";
import { positionLabel } from "@/lib/positionLabels";
import { TeamBadge } from "./TeamBadge";

export function CaptainPickerSheet({
  players,
  captainId,
  onPick,
  onClose,
}: {
  players: Player[];
  captainId: string | null;
  onPick: (playerId: string) => void;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-charcoal/50 sm:items-center"
      onClick={onClose}
    >
      <div
        className="flex max-h-[80vh] w-full flex-col rounded-t-2xl bg-background sm:max-w-sm sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-charcoal/10 px-4 py-3">
          <h2 className="font-display text-base font-medium">Kaptan Seç</h2>
          <button
            onClick={onClose}
            aria-label="Kapat"
            className="flex h-8 w-8 items-center justify-center rounded-full text-foreground/60 hover:bg-charcoal/5"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3">
          {players.length === 0 ? (
            <p className="py-6 text-center text-sm text-foreground/50">
              Önce kadronu tamamla.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {players.map((p) => {
                const active = p.id === captainId;
                return (
                  <li
                    key={p.id}
                    onClick={() => onPick(p.id)}
                    className={`flex cursor-pointer items-center justify-between rounded-lg border px-3 py-2.5 transition-colors ${
                      active
                        ? "border-gold bg-gold/10"
                        : "border-charcoal/10 bg-white active:bg-charcoal/5"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <TeamBadge team={p.team} size={26} />
                      <div>
                        <p className="text-sm font-medium leading-tight">{p.name}</p>
                        <p className="text-xs text-foreground/50">
                          {p.team} · {positionLabel(p.position)}
                        </p>
                      </div>
                    </div>
                    {active && (
                      <span className="text-xs font-medium text-gold">Kaptan</span>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
