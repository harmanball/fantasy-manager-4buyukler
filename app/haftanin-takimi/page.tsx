"use client";

import { useEffect, useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import { PageHeader } from "@/components/PageHeader";
import { Pitch, SquadSlot, buildSlots } from "@/components/Pitch";
import { PlayerPointsModal } from "@/components/PlayerPointsModal";
import { Skeleton } from "@/components/Skeleton";
import { fetchFinishedGameweeks, FinishedGameweek } from "@/lib/gameweekResult";
import { fetchTeamOfWeek, TeamOfWeekPlayer } from "@/lib/teamOfWeek";
import { Player } from "@/lib/players";

export default function HaftaninTakimiPage() {
  const [weeks, setWeeks] = useState<FinishedGameweek[]>([]);
  const [selectedGw, setSelectedGw] = useState<number | null>(null);
  const [slots, setSlots] = useState<SquadSlot[]>(() => buildSlots("4-3-3"));
  const [pointsMap, setPointsMap] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [modalPlayer, setModalPlayer] = useState<Player | null>(null);

  useEffect(() => {
    fetchFinishedGameweeks().then((w) => {
      setWeeks(w);
      if (w.length > 0) setSelectedGw(w[0].id);
      else setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!selectedGw) return;
    let cancelled = false;
    async function load() {
      setLoading(true);
      const team = await fetchTeamOfWeek(selectedGw!);
      if (cancelled) return;

      const newSlots = buildSlots("4-3-3");
      (["GK", "DEF", "MID", "FWD"] as const).forEach((pos) => {
        const inPos = team.filter((p: TeamOfWeekPlayer) => p.position === pos);
        const targets = newSlots.filter((s) => s.position === pos);
        inPos.forEach((p, i) => {
          if (targets[i]) {
            targets[i].player = { id: p.id, name: p.name, team: p.team, position: p.position };
          }
        });
      });

      const map: Record<string, number> = {};
      team.forEach((p) => (map[p.id] = p.points));

      setSlots(newSlots);
      setPointsMap(map);
      setLoading(false);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [selectedGw]);

  return (
    <>
      <AppHeader />
      <main className="mx-auto max-w-3xl px-3 py-4 sm:px-6 sm:py-6">
      <div className="flex flex-col gap-4 rounded-xl bg-background p-4 sm:p-6">
        <PageHeader icon="star" title="Haftanın Takımı" />

        {weeks.length === 0 && !loading ? (
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

            {loading ? (
              <Skeleton className="mx-auto aspect-[3/4] w-full max-w-[360px] sm:max-w-[440px]" />
            ) : (
              <Pitch
                slots={slots}
                captainId={null}
                lastWeekPoints={pointsMap}
                onSlotTap={(slot) => {
                  if (slot.player) setModalPlayer(slot.player);
                }}
              />
            )}

            <p className="text-center text-[11px] text-foreground/40">
              O haftanın istatistiklerine göre otomatik oluşturulur — 4-3-3 diziliş, her
              mevkide en yüksek puanı alan oyuncular.
            </p>
          </>
        )}

        {modalPlayer && selectedGw && (
          <PlayerPointsModal
            player={modalPlayer}
            gameweekId={selectedGw}
            onClose={() => setModalPlayer(null)}
          />
        )}
      </div>
      </main>
    </>
  );
}
