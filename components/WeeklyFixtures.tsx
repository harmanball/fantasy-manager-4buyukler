"use client";

import { useEffect, useState } from "react";
import { fetchUpcomingFixtures, TrackedFixture, TrackedTeamCode } from "@/lib/fixtures";
import { TeamWeekPointsModal } from "./TeamWeekPointsModal";

const TEAM_LABELS: Record<TrackedTeamCode, string> = {
  GS: "Galatasaray",
  FB: "Fenerbahçe",
  BJK: "Beşiktaş",
  TS: "Trabzonspor",
};

function formatDate(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00`);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("tr-TR", {
    day: "numeric",
    month: "long",
    weekday: "long",
  });
}

// Artık dış kaynağa canlı gitmiyor — sadece bu haftaya kaydedilmiş
// enstantane veriyi (gameweek_fixtures) gösteriyor. Maç bitip skor
// girildiğinde otomatik "Bitti — X-Y" haline geçer; satıra dokununca o
// takımın o haftaki oyuncu puanları listelenir.
export function WeeklyFixtures() {
  const [fixtures, setFixtures] = useState<TrackedFixture[] | null>(null);
  const [openTeam, setOpenTeam] = useState<TrackedFixture | null>(null);

  useEffect(() => {
    fetchUpcomingFixtures().then(setFixtures);
  }, []);

  if (!fixtures || fixtures.length === 0) return null;

  return (
    <>
      <div className="rounded-xl bg-pitch px-4 py-[1.1rem]">
        <h3 className="mb-3.5 text-center text-[13px] font-medium uppercase tracking-wide text-gold">
          4 Büyükler Kimlerle Oynuyor
        </h3>
        <div className="flex flex-col gap-2">
          {fixtures.map((f) => {
            const finished = f.teamScore !== null && f.opponentScore !== null;
            return (
              <button
                key={f.team}
                onClick={() => setOpenTeam(f)}
                className="flex w-full items-center justify-between gap-2.5 rounded-lg bg-ivory/[0.06] px-3 py-2.5 text-left active:bg-ivory/[0.1]"
              >
                <span className="text-sm font-medium text-ivory">
                  {TEAM_LABELS[f.team]}
                </span>
                {finished ? (
                  <span className="text-right text-xs leading-snug text-ivory/70">
                    Bitti · {f.teamScore} - {f.opponentScore} {f.opponent}
                  </span>
                ) : (
                  <span className="text-right text-xs leading-snug text-ivory/60">
                    {f.isHome ? "İç saha" : "Deplasman"} · {f.opponent}
                    <br />
                    {formatDate(f.date)}
                    {f.time && ` ${f.time}`}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {openTeam && (
        <TeamWeekPointsModal
          gameweekId={openTeam.gameweekId}
          team={openTeam.team}
          opponent={openTeam.opponent}
          teamScore={openTeam.teamScore}
          opponentScore={openTeam.opponentScore}
          onClose={() => setOpenTeam(null)}
        />
      )}
    </>
  );
}
