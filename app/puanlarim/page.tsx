"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/useSession";
import {
  fetchFinishedGameweeks,
  fetchGameweekResult,
  fetchUserWeeklySeries,
  FinishedGameweek,
  GameweekResultRow,
  WeeklyPoint,
} from "@/lib/gameweekResult";
import { PlayerPointsModal } from "@/components/PlayerPointsModal";
import { AppHeader } from "@/components/AppHeader";
import { PageHeader } from "@/components/PageHeader";
import { PerformanceChart } from "@/components/PerformanceChart";
import { fetchMaxPossibleScore, fetchWeeklyMaxSeries } from "@/lib/maxScore";
import { SkeletonRow } from "@/components/Skeleton";
import { positionLabel } from "@/lib/positionLabels";
import { TeamCode } from "@/lib/teams";

export default function PuanlarimPage() {
  const { session, loading: sessionLoading } = useSession();
  const router = useRouter();

  const [weeks, setWeeks] = useState<FinishedGameweek[]>([]);
  const [selectedGw, setSelectedGw] = useState<number | null>(null);
  const [rows, setRows] = useState<GameweekResultRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedPlayer, setSelectedPlayer] = useState<GameweekResultRow | null>(
    null
  );
  const [weeklySeries, setWeeklySeries] = useState<WeeklyPoint[]>([]);
  const [maxByWeek, setMaxByWeek] = useState<Record<number, number> | undefined>(undefined);
  const [selectedMax, setSelectedMax] = useState<number | null>(null);

  // Grafikteki "alınabilecek en yüksek puan" çizgisi
  useEffect(() => {
    if (weeklySeries.length === 0) return;
    fetchWeeklyMaxSeries(weeklySeries.map((w) => w.weekNumber)).then(setMaxByWeek);
  }, [weeklySeries]);

  // Seçili haftanın alınabilecek en yüksek puanı
  useEffect(() => {
    if (!selectedGw) return;
    setSelectedMax(null);
    fetchMaxPossibleScore(selectedGw).then(setSelectedMax);
  }, [selectedGw]);

  useEffect(() => {
    if (!session) return;
    fetchUserWeeklySeries(session.user.id).then(setWeeklySeries);
  }, [session]);

  useEffect(() => {
    if (!sessionLoading && !session) router.push("/giris");
  }, [sessionLoading, session, router]);

  useEffect(() => {
    fetchFinishedGameweeks().then((w) => {
      setWeeks(w);
      if (w.length > 0) setSelectedGw(w[0].id);
      else setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!session || !selectedGw) return;
    let cancelled = false;
    async function load() {
      setLoading(true);
      const { rows, total } = await fetchGameweekResult(session!.user.id, selectedGw!);
      if (cancelled) return;
      setRows(rows);
      setTotal(total);
      setLoading(false);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [session, selectedGw]);

  if (sessionLoading || !session) {
    return (
      <>
        <AppHeader />
        <main className="mx-auto flex min-h-[calc(100dvh-57px)] max-w-2xl items-center justify-center px-3 py-4">
          <p className="rounded-xl bg-background px-6 py-4 text-sm text-foreground/50">
            Yükleniyor…
          </p>
        </main>
      </>
    );
  }

  return (
    <>
      <AppHeader />
      <main className="mx-auto max-w-2xl px-3 py-4 sm:px-6 sm:py-6">
      <div className="flex flex-col gap-4 rounded-xl bg-background p-4 sm:p-6">
        <PageHeader icon="chart" title="Puanlarım" />

      {weeks.length === 0 ? (
        <p className="rounded-lg border border-charcoal/10 bg-white px-4 py-6 text-center text-sm text-foreground/60">
          Henüz tamamlanmış bir hafta yok.
        </p>
      ) : (
        <>
          <select
            value={selectedGw ?? ""}
            onChange={(e) => setSelectedGw(Number(e.target.value))}
            className="h-10 w-full rounded-lg border border-charcoal/15 bg-white px-3 text-sm"
          >
            {weeks.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name || `${w.week_number}. Hafta`}
              </option>
            ))}
          </select>

          <PerformanceChart data={weeklySeries} maxByWeek={maxByWeek} />

          <div className="flex rounded-lg border border-gold/40 bg-gold/10 px-2 py-3 text-center">
            <div className="flex-1 px-2">
              <p className="text-xs text-foreground/60">Bu haftaki toplam puanın</p>
              <p className="font-display text-2xl font-semibold text-charcoal">
                {total}
              </p>
            </div>
            <div className="w-px flex-none bg-gold/40" />
            <div className="flex-1 px-2">
              <p className="text-xs text-foreground/60">Bu hafta alınabilecek en yüksek puan</p>
              <p className="font-display text-2xl font-semibold text-[#A67B1E]">
                {selectedMax ?? "—"}
              </p>
            </div>
          </div>

          {loading ? (
            <div className="flex flex-col gap-1.5">
              <SkeletonRow />
              <SkeletonRow />
              <SkeletonRow />
              <SkeletonRow />
            </div>
          ) : rows.length === 0 ? (
            <p className="rounded-lg border border-charcoal/10 bg-white px-4 py-6 text-center text-sm text-foreground/60">
              Bu hafta için kayıtlı bir kadron bulunamadı.
            </p>
          ) : (
            <div className="flex flex-col gap-1.5">
              {rows.map((r) => (
                <div
                  key={r.playerId}
                  onClick={() => setSelectedPlayer(r)}
                  className="flex cursor-pointer items-center justify-between rounded-lg border border-charcoal/10 bg-white px-3 py-2.5 transition-colors hover:bg-charcoal/5 active:bg-charcoal/10"
                >
                  <div>
                    <p className="text-sm font-medium leading-tight">
                      {r.name}
                      {r.isCaptain && (
                        <span className="ml-1.5 text-xs font-normal text-gold">
                          Kaptan
                        </span>
                      )}
                      {r.isMotm && (
                        <span className="ml-1.5 text-xs font-normal text-gold">
                          Maçın Yıldızı
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-foreground/50">
                      {r.team} · {positionLabel(r.position)} · toplam puan {r.basePoints}
                      {r.multiplier > 1 && ` × ${r.multiplier}`}
                      {!r.played && " · oynamadı"}
                    </p>
                  </div>
                  <span className="font-display text-base font-semibold">
                    {r.finalPoints}
                  </span>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {selectedPlayer && selectedGw && (
        <PlayerPointsModal
          player={{
            id: selectedPlayer.playerId,
            name: selectedPlayer.name,
            team: selectedPlayer.team as TeamCode,
            position: selectedPlayer.position,
          }}
          gameweekId={selectedGw}
          onClose={() => setSelectedPlayer(null)}
          extraHeader={
            selectedPlayer.multiplier > 1 ? (
              <p className="mt-1 text-xs font-medium text-gold">
                Çarpan ×{selectedPlayer.multiplier} uygulandı — nihai katkı{" "}
                {selectedPlayer.finalPoints}
              </p>
            ) : undefined
          }
        />
      )}
      </div>
      </main>
    </>
  );
}
