"use client";

import { useEffect, useRef, useState } from "react";
import { fetchUpcomingFixtures, TrackedFixture, TrackedTeamCode } from "@/lib/fixtures";
import {
  dedupeFixtures,
  fetchUserPredictions,
  savePrediction,
  deletePrediction,
} from "@/lib/predictions";
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

// Kutular EKRANDA her zaman "ev sahibi - deplasman" sırasındadır: l = soldaki
// (ev sahibi) takımın golü, r = sağdaki (deplasman). Veritabanında ise
// "fikstürdeki takımın golü / rakibin golü" saklanır — çevirme burada yapılır.
type Box = { l: string; r: string };

// "4 Büyükler Kimlerle Oynuyor - Tahmin Yap": maç başına skor tahmini.
// Oyunun gerçek puanlamasıyla ilgisi yoktur. userId verilirse kutular açılır;
// locked true ise (transfer penceresi kapalı) kutular pasif kalır.
export function WeeklyFixtures({
  userId,
  locked = false,
}: {
  userId?: string | null;
  locked?: boolean;
}) {
  const [fixtures, setFixtures] = useState<TrackedFixture[] | null>(null);
  const [openTeam, setOpenTeam] = useState<TrackedFixture | null>(null);
  const [boxes, setBoxes] = useState<Record<string, Box>>({});
  const [status, setStatus] = useState<string | null>(null);
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const statusTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fetchUpcomingFixtures().then((f) => setFixtures(dedupeFixtures(f)));
  }, []);

  useEffect(() => {
    if (!userId || !fixtures || fixtures.length === 0) return;
    let cancelled = false;
    fetchUserPredictions(userId, fixtures[0].gameweekId).then((preds) => {
      if (cancelled) return;
      const next: Record<string, Box> = {};
      for (const f of fixtures) {
        const p = preds[f.team];
        if (!p) continue;
        const home = f.isHome ? p.teamGoals : p.opponentGoals;
        const away = f.isHome ? p.opponentGoals : p.teamGoals;
        next[f.team] = { l: String(home), r: String(away) };
      }
      setBoxes(next);
    });
    return () => {
      cancelled = true;
    };
  }, [userId, fixtures]);

  function flash(msg: string) {
    setStatus(msg);
    if (statusTimer.current) clearTimeout(statusTimer.current);
    statusTimer.current = setTimeout(() => setStatus(null), 1800);
  }

  function handleChange(f: TrackedFixture, side: "l" | "r", raw: string) {
    if (!userId || locked) return;
    const value = raw.replace(/\D/g, "").slice(0, 2);
    const cur = boxes[f.team] ?? { l: "", r: "" };
    const next: Box = { ...cur, [side]: value };
    setBoxes((prev) => ({ ...prev, [f.team]: next }));

    if (timers.current[f.team]) clearTimeout(timers.current[f.team]);
    timers.current[f.team] = setTimeout(async () => {
      // İkisi de doluysa kaydet, ikisi de boşsa tahmini sil, biri boşsa bekle.
      if (next.l !== "" && next.r !== "") {
        const home = Number(next.l);
        const away = Number(next.r);
        const err = await savePrediction(
          userId,
          f.gameweekId,
          f.team,
          f.isHome ? home : away,
          f.isHome ? away : home
        );
        flash(err ? "Kaydedilemedi" : "Kaydedildi ✓");
      } else if (next.l === "" && next.r === "") {
        const err = await deletePrediction(userId, f.gameweekId, f.team);
        flash(err ? "Kaydedilemedi" : "Kaydedildi ✓");
      }
    }, 600);
  }

  if (!fixtures || fixtures.length === 0) return null;

  const showBoxes = !!userId;

  return (
    <>
      <div className="rounded-xl bg-pitch px-4 py-[1.1rem]">
        <h3 className="text-center text-[13px] font-medium uppercase tracking-wide text-gold">
          4 Büyükler Kimlerle Oynuyor -{" "}
          <span className="text-sm font-bold text-red-400">Tahmin Yap</span>
        </h3>
        {showBoxes && !locked && (
          <p className="mb-3.5 mt-1.5 text-center text-[11px] text-ivory/60">
            Skorları yaz, otomatik kaydedilir. Transfer penceresi kapanınca
            kilitlenir.
          </p>
        )}
        {(!showBoxes || locked) && <div className="mb-3.5" />}

        <div className="flex flex-col gap-2">
          {fixtures.map((f) => {
            const finished = f.teamScore !== null && f.opponentScore !== null;
            const teamName = TEAM_LABELS[f.team];
            const leftName = f.isHome ? teamName : f.opponent;
            const rightName = f.isHome ? f.opponent : teamName;
            const box = boxes[f.team] ?? { l: "", r: "" };
            return (
              <div
                key={f.team}
                className="rounded-lg bg-ivory/[0.06] px-3 py-2.5"
              >
                {/* Oyuncu puanları penceresi sadece maç bittiyse (skor girildiyse)
                    anlamlı — oynanmamış maçta hiç istatistik olmadığı için
                    "Puanlar" bağlantısı o zaman gösterilmez. */}
                <div className="mb-2 flex w-full items-center justify-between gap-2 text-[11px] leading-snug text-ivory/60">
                  <span>
                    {teamName} {f.isHome ? "iç sahada" : "deplasmanda"} ·{" "}
                    {formatDate(f.date)}
                    {f.time && ` ${f.time}`}
                  </span>
                  {finished && (
                    <button
                      onClick={() => setOpenTeam(f)}
                      className="shrink-0 text-ivory/70 underline underline-offset-2"
                    >
                      Puanlar ›
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <span className="min-w-0 flex-1 break-words text-sm font-medium text-ivory">
                    {leftName}
                  </span>
                  {showBoxes ? (
                    <div className="flex shrink-0 items-center gap-1.5">
                      <input
                        type="text"
                        inputMode="numeric"
                        maxLength={2}
                        placeholder="–"
                        disabled={locked}
                        value={box.l}
                        onChange={(e) => handleChange(f, "l", e.target.value)}
                        aria-label={`${leftName} skoru`}
                        className="h-10 w-10 rounded-lg border border-gold/50 bg-pitch text-center font-display text-lg font-bold text-ivory placeholder:text-ivory/30 focus:border-gold focus:outline-none disabled:opacity-60"
                      />
                      <span className="font-bold text-ivory/50">–</span>
                      <input
                        type="text"
                        inputMode="numeric"
                        maxLength={2}
                        placeholder="–"
                        disabled={locked}
                        value={box.r}
                        onChange={(e) => handleChange(f, "r", e.target.value)}
                        aria-label={`${rightName} skoru`}
                        className="h-10 w-10 rounded-lg border border-gold/50 bg-pitch text-center font-display text-lg font-bold text-ivory placeholder:text-ivory/30 focus:border-gold focus:outline-none disabled:opacity-60"
                      />
                    </div>
                  ) : (
                    <span className="shrink-0 text-xs text-ivory/50">vs</span>
                  )}
                  <span className="min-w-0 flex-1 break-words text-right text-sm font-medium text-ivory">
                    {rightName}
                  </span>
                </div>

                {finished && (
                  <p className="mt-1.5 text-right text-[11px] text-ivory/70">
                    Bitti ·{" "}
                    {f.isHome
                      ? `${f.teamScore} - ${f.opponentScore}`
                      : `${f.opponentScore} - ${f.teamScore}`}
                  </p>
                )}
              </div>
            );
          })}
        </div>

        <p className="mt-2.5 h-4 text-center text-[11px] text-green-300">
          {status ?? ""}
        </p>
        {showBoxes && locked && (
          <p className="text-center text-[11px] text-red-300">
            Transfer penceresi kapandı, tahminler kilitlendi.
          </p>
        )}
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
