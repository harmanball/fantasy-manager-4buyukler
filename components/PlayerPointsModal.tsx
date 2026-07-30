"use client";

import { useEffect, useState } from "react";
import { positionLabel } from "@/lib/positionLabels";
import { TeamCode } from "@/lib/teams";
import { JerseyIcon } from "./JerseyIcon";
import {
  fetchPlayerGameweekBreakdown,
  PlayerGameweekBreakdown,
} from "@/lib/gameweekBreakdown";

const ROWS: { key: keyof PlayerGameweekBreakdown; label: string }[] = [
  { key: "oynamaPuani", label: "Maça çıkma" },
  { key: "golPuani", label: "Gol" },
  { key: "asistPuani", label: "Asist" },
  { key: "temizKalePuani", label: "Temiz kale" },
  { key: "kartPuani", label: "Kart" },
  { key: "kkGolPuani", label: "Kendi kalesine gol" },
  { key: "penKacanPuani", label: "Penaltı kaçırma" },
  { key: "macPuaniBonusu", label: "Maç puanı bonusu" },
];

export function PlayerPointsModal({
  playerId,
  gameweekId,
  extraHeader,
  onClose,
}: {
  playerId: string;
  gameweekId: number;
  extraHeader?: React.ReactNode;
  onClose: () => void;
}) {
  const [data, setData] = useState<PlayerGameweekBreakdown | null | undefined>(
    undefined
  );

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setData(undefined);
      const result = await fetchPlayerGameweekBreakdown(playerId, gameweekId);
      if (!cancelled) setData(result);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [playerId, gameweekId]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-charcoal/50 sm:items-center"
      onClick={onClose}
    >
      <div
        className="w-full rounded-t-2xl bg-background p-4 sm:max-w-sm sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {data === undefined ? (
          <p className="py-8 text-center text-sm text-foreground/50">
            Yükleniyor…
          </p>
        ) : data === null ? (
          <>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-display text-base font-medium">
                Puan Detayı
              </h2>
              <button
                onClick={onClose}
                aria-label="Kapat"
                className="flex h-8 w-8 items-center justify-center rounded-full text-foreground/60 hover:bg-charcoal/5"
              >
                ✕
              </button>
            </div>
            <p className="py-6 text-center text-sm text-foreground/50">
              Bu hafta için istatistik bulunamadı.
            </p>
          </>
        ) : (
          <>
            <div className="mb-4 flex items-start justify-between">
              <div className="flex items-center gap-3">
                <JerseyIcon team={data.team as TeamCode} size={56} />
                <div>
                  <p className="font-display text-base font-semibold leading-tight">
                    {data.name}
                  </p>
                  <p className="text-xs text-foreground/50">
                    {data.team} · {positionLabel(data.position)} · {data.minutes} dk
                    {data.matchRating !== null && ` · maç puanı ${data.matchRating}`}
                    {data.isMotm && " · Maçın Yıldızı"}
                  </p>
                  {extraHeader}
                </div>
              </div>
              <button
                onClick={onClose}
                aria-label="Kapat"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-foreground/60 hover:bg-charcoal/5"
              >
                ✕
              </button>
            </div>

            <div className="flex flex-col gap-1">
              {ROWS.map((r) => {
                const val = data[r.key] as number;
                if (val === 0) return null;
                return (
                  <div
                    key={r.key}
                    className="flex items-center justify-between rounded-md px-2 py-1.5 text-sm odd:bg-charcoal/[0.03]"
                  >
                    <span className="text-foreground/70">{r.label}</span>
                    <span
                      className={`font-medium ${
                        val < 0 ? "text-red-600" : "text-foreground"
                      }`}
                    >
                      {val > 0 ? "+" : ""}
                      {val}
                    </span>
                  </div>
                );
              })}
              <div className="mt-1 flex items-center justify-between rounded-md bg-pitch px-2 py-2 text-sm">
                <span className="font-medium text-ivory">Toplam puan</span>
                <span className="font-display font-semibold text-ivory">
                  {data.toplamPuan}
                </span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
