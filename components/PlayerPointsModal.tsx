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
  { key: "macPuaniBonusu", label: "Maç reytingi bonusu" },
];

export interface ModalPlayerInfo {
  id: string;
  name: string;
  team: TeamCode;
  position: string;
}

export function PlayerPointsModal({
  player,
  gameweekId,
  extraHeader,
  isCaptain,
  onMakeCaptain,
  onRemove,
  onClose,
}: {
  player: ModalPlayerInfo;
  gameweekId: number | null;
  extraHeader?: React.ReactNode;
  isCaptain?: boolean;
  onMakeCaptain?: () => void;
  onRemove?: () => void;
  onClose: () => void;
}) {
  const [data, setData] = useState<PlayerGameweekBreakdown | null | undefined>(
    undefined
  );

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setData(undefined);
      if (!gameweekId) {
        setData(null);
        return;
      }
      const result = await fetchPlayerGameweekBreakdown(player.id, gameweekId);
      if (!cancelled) setData(result);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [player.id, gameweekId]);

  const showActions = !!onMakeCaptain || !!onRemove;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-charcoal/50 sm:items-center"
      onClick={onClose}
    >
      <div
        className="w-full rounded-t-2xl bg-background p-4 sm:max-w-sm sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Başlık her zaman anında görünür — parent'tan gelen player bilgisinden,
            istatistik yüklenmesini beklemez */}
        <div className="mb-4 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <JerseyIcon team={player.team} size={56} />
            <div>
              <p className="font-display text-base font-semibold leading-tight">
                {player.name}
              </p>
              <p className="text-xs text-foreground/50">
                {player.team} · {positionLabel(player.position)}
                {data && ` · ${data.minutes} dk`}
                {data?.matchRating !== null && data?.matchRating !== undefined &&
                  ` · maç reytingi ${data.matchRating}`}
                {data?.isMotm && " · Maçın Yıldızı"}
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

        {data === undefined ? (
          <p className="py-4 text-center text-sm text-foreground/50">
            Puan detayı yükleniyor…
          </p>
        ) : data === null ? (
          <p className="py-4 text-center text-sm text-foreground/50">
            Bu hafta için istatistik bulunamadı.
          </p>
        ) : (
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

            <p className="mt-2 text-center text-[10px] text-foreground/40">
              Bu istatistikler için{" "}
              <a
                href="https://www.fotmob.com"
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-2"
              >
                www.fotmob.com
              </a>{" "}
              referans alınır.
            </p>
          </div>
        )}

        {showActions && (
          <div className="mt-4 flex flex-col gap-2 border-t border-charcoal/10 pt-4">
            {onMakeCaptain && (
              <button
                onClick={onMakeCaptain}
                disabled={isCaptain}
                className="rounded-lg border border-charcoal/15 px-4 py-2.5 text-left text-sm font-medium disabled:text-foreground/30"
              >
                {isCaptain ? "Kaptan (seçili)" : "Kaptan yap"}
              </button>
            )}
            {onRemove && (
              <button
                onClick={onRemove}
                className="rounded-lg border border-red-200 px-4 py-2.5 text-left text-sm font-medium text-red-600"
              >
                Kadrodan çıkar
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
