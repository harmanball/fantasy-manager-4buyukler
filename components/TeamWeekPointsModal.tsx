"use client";

import { useEffect, useState } from "react";
import {
  fetchTeamGameweekPoints,
  TeamGameweekPlayerPoints,
} from "@/lib/teamGameweekStats";
import { TrackedTeamCode } from "@/lib/fixtures";

const TEAM_LABELS: Record<TrackedTeamCode, string> = {
  GS: "Galatasaray",
  FB: "Fenerbahçe",
  BJK: "Beşiktaş",
  TS: "Trabzonspor",
};

export function TeamWeekPointsModal({
  gameweekId,
  team,
  opponent,
  teamScore,
  opponentScore,
  onClose,
}: {
  gameweekId: number;
  team: TrackedTeamCode;
  opponent: string;
  teamScore: number | null;
  opponentScore: number | null;
  onClose: () => void;
}) {
  const [rows, setRows] = useState<TeamGameweekPlayerPoints[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchTeamGameweekPoints(gameweekId, team).then((r) => {
      if (!cancelled) setRows(r);
    });
    return () => {
      cancelled = true;
    };
  }, [gameweekId, team]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-charcoal/50 sm:items-center"
      onClick={onClose}
    >
      <div
        className="max-h-[80vh] w-full max-w-sm overflow-y-auto rounded-t-2xl bg-background p-5 sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-center font-display text-lg font-semibold text-charcoal">
          {TEAM_LABELS[team]}
          {teamScore !== null && opponentScore !== null && (
            <span className="ml-2 text-foreground/60">
              {teamScore} - {opponentScore} {opponent}
            </span>
          )}
        </h3>

        <div className="mt-3 flex flex-col gap-1.5">
          {rows === null && (
            <p className="py-6 text-center text-sm text-foreground/50">
              Yükleniyor…
            </p>
          )}
          {rows !== null && rows.length === 0 && (
            <p className="py-6 text-center text-sm text-foreground/50">
              Bu hafta için henüz oyuncu istatistiği girilmemiş.
            </p>
          )}
          {rows?.map((r) => (
            <div
              key={r.name}
              className="flex items-center justify-between rounded-lg bg-white px-3 py-2"
            >
              <span className="flex items-center gap-1.5 text-sm">
                {r.name}
                {r.isMotm && <span className="text-gold">★</span>}
              </span>
              <span className="text-sm font-semibold text-charcoal">
                {r.points > 0 ? "+" : ""}
                {r.points}
              </span>
            </div>
          ))}
        </div>

        <button
          onClick={onClose}
          className="mt-4 w-full rounded-lg bg-pitch py-2.5 text-sm font-medium text-ivory"
        >
          Kapat
        </button>
      </div>
    </div>
  );
}
