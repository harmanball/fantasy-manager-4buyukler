"use client";

import { useEffect, useState } from "react";
import { fetchUpcomingFixtures, TrackedFixture, TrackedTeamCode } from "@/lib/fixtures";
import { dedupeFixtures, fetchUserPredictions, Prediction } from "@/lib/predictions";

const TEAM_LABELS: Record<TrackedTeamCode, string> = {
  GS: "Galatasaray",
  FB: "Fenerbahçe",
  BJK: "Beşiktaş",
  TS: "Trabzonspor",
};

// Başka bir kullanıcının takım sayfasında, o kişinin skor tahminlerini
// salt-okunur gösterir. Transfer penceresi açıkken (hidden) tahminler
// gizlidir — veritabanı da zaten bu satırları başkasına vermez.
export function PredictionsView({
  userId,
  ownerName,
  hidden,
}: {
  userId: string;
  ownerName: string | null;
  hidden: boolean;
}) {
  const [fixtures, setFixtures] = useState<TrackedFixture[] | null>(null);
  const [preds, setPreds] = useState<Record<string, Prediction>>({});

  useEffect(() => {
    let cancelled = false;
    fetchUpcomingFixtures().then(async (f) => {
      const list = dedupeFixtures(f);
      if (cancelled) return;
      setFixtures(list);
      if (!hidden && list.length > 0) {
        const p = await fetchUserPredictions(userId, list[0].gameweekId);
        if (!cancelled) setPreds(p);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [userId, hidden]);

  if (!fixtures || fixtures.length === 0) return null;

  return (
    <div className="rounded-xl bg-pitch px-4 py-[1.1rem]">
      <h3 className="text-center text-[13px] font-medium uppercase tracking-wide text-gold">
        {ownerName ? `${ownerName} Tahminleri` : "Tahminler"}
      </h3>

      {hidden ? (
        <p className="mt-3 text-center text-xs text-ivory/60">
          Tahminler transfer penceresi kapanınca görünür.
        </p>
      ) : (
        <div className="mt-3.5 flex flex-col gap-2">
          {fixtures.map((f) => {
            const p = preds[f.team];
            const teamName = TEAM_LABELS[f.team];
            const leftName = f.isHome ? teamName : f.opponent;
            const rightName = f.isHome ? f.opponent : teamName;
            const left = p ? (f.isHome ? p.teamGoals : p.opponentGoals) : null;
            const right = p ? (f.isHome ? p.opponentGoals : p.teamGoals) : null;
            return (
              <div
                key={f.team}
                className="flex items-center gap-2 rounded-lg bg-ivory/[0.06] px-3 py-2.5"
              >
                <span className="min-w-0 flex-1 break-words text-sm font-medium text-ivory">
                  {leftName}
                </span>
                {p ? (
                  <span className="shrink-0 font-display text-lg font-bold text-gold">
                    {left} – {right}
                  </span>
                ) : (
                  <span className="shrink-0 text-xs text-ivory/40">Tahmin yok</span>
                )}
                <span className="min-w-0 flex-1 break-words text-right text-sm font-medium text-ivory">
                  {rightName}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
