"use client";

import { useEffect, useState } from "react";
import { fetchUpcomingFixtures, TrackedFixture, TrackedTeamCode } from "@/lib/fixtures";

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

// Otomatik çekilir — admin'in elle bir şey girmesine gerek yok. Kaynağa
// ulaşılamazsa ya da veri boşsa sessizce hiçbir şey göstermez, sayfanın
// geri kalanını bozmaz.
export function WeeklyFixtures() {
  const [fixtures, setFixtures] = useState<TrackedFixture[] | null>(null);

  useEffect(() => {
    fetchUpcomingFixtures().then(setFixtures);
  }, []);

  if (!fixtures || fixtures.length === 0) return null;

  return (
    <div className="rounded-xl bg-pitch px-4 py-[1.1rem]">
      <h3 className="mb-3.5 text-center text-[13px] font-medium uppercase tracking-wide text-gold">
        4 Büyükler Kimlerle Oynuyor
      </h3>
      <div className="flex flex-col gap-2">
        {fixtures.map((f) => (
          <div
            key={f.team}
            className="flex items-center justify-between gap-2.5 rounded-lg bg-ivory/[0.06] px-3 py-2.5"
          >
            <span className="text-sm font-medium text-ivory">
              {TEAM_LABELS[f.team]}
            </span>
            <span className="text-right text-xs leading-snug text-ivory/60">
              {f.isHome ? "İç saha" : "Deplasman"} · {f.opponent}
              <br />
              {formatDate(f.date)}
              {f.time && ` ${f.time}`}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
