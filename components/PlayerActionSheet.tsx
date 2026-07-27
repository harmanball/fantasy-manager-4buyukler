"use client";

import { Player } from "@/lib/players";
import { TeamBadge } from "./TeamBadge";

export function PlayerActionSheet({
  player,
  isCaptain,
  isVice,
  onMakeCaptain,
  onMakeVice,
  onRemove,
  onClose,
}: {
  player: Player;
  isCaptain: boolean;
  isVice: boolean;
  onMakeCaptain: () => void;
  onMakeVice: () => void;
  onRemove: () => void;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-charcoal/50 sm:items-center"
      onClick={onClose}
    >
      <div
        className="w-full rounded-t-2xl bg-background p-4 sm:max-w-sm sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center gap-3">
          <TeamBadge team={player.team} size={36} />
          <div>
            <p className="font-medium leading-tight">{player.name}</p>
            <p className="text-xs text-foreground/50">
              {player.team} · {player.position}
            </p>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <button
            onClick={onMakeCaptain}
            disabled={isCaptain}
            className="rounded-lg border border-charcoal/15 px-4 py-2.5 text-left text-sm font-medium disabled:text-foreground/30"
          >
            {isCaptain ? "Kaptan (seçili)" : "Kaptan yap"}
          </button>
          <button
            onClick={onMakeVice}
            disabled={isVice}
            className="rounded-lg border border-charcoal/15 px-4 py-2.5 text-left text-sm font-medium disabled:text-foreground/30"
          >
            {isVice ? "Yardımcı (seçili)" : "Yardımcı yap"}
          </button>
          <button
            onClick={onRemove}
            className="rounded-lg border border-red-200 px-4 py-2.5 text-left text-sm font-medium text-red-600"
          >
            Kadrodan çıkar
          </button>
          <button
            onClick={onClose}
            className="mt-1 rounded-lg px-4 py-2.5 text-center text-sm text-foreground/60"
          >
            Vazgeç
          </button>
        </div>
      </div>
    </div>
  );
}
