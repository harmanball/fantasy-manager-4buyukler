"use client";

import { useEffect, useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import { PageHeader } from "@/components/PageHeader";
import { Pitch, SquadSlot, buildSlots } from "@/components/Pitch";
import { PlayerPointsModal } from "@/components/PlayerPointsModal";
import { Skeleton } from "@/components/Skeleton";
import { fetchFinishedGameweeks, FinishedGameweek } from "@/lib/gameweekResult";
import {
  fetchTeamOfWeek,
  fetchOverallTeamOfWeek,
  TeamOfWeekPlayer,
} from "@/lib/teamOfWeek";
import { Player } from "@/lib/players";
import { Formation } from "@/lib/teams";

export default function HaftaninTakimiPage() {
  const [weeks, setWeeks] = useState<FinishedGameweek[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<"total" | number | null>(null);
  const [formation, setFormation] = useState<Formation>("4-3-3");
  const [slots, setSlots] = useState<SquadSlot[]>(() => buildSlots("4-3-3"));
  const [pointsMap, setPointsMap] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [modalPlayer, setModalPlayer] = useState<Player | null>(null);

  useEffect(() => {
    fetchFinishedGameweeks().then((w) => {
      setWeeks(w);
      // Varsayılan görünüm hâlâ "en son bitmiş hafta" — sayfanın adı
      // "Haftanın Takımı" olduğu için "Genel Toplam" ek bir seçenek,
      // varsayılan değil.
      if (w.length > 0) setSelectedFilter(w[0].id);
      else setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (selectedFilter === null) return;
    let cancelled = false;
    async function load() {
      setLoading(true);
      const result =
        selectedFilter === "total"
          ? await fetchOverallTeamOfWeek()
          : await fetchTeamOfWeek(selectedFilter as number);
      if (cancelled) return;

      // Diziliş artık sabit değil — o haftanın (ya da genel toplamın)
      // puanlarına göre hesaplanan gerçek diziliş (örn. 4-5-1) kullanılıyor.
      const newSlots = buildSlots(result.formation);
      (["GK", "DEF", "MID", "FWD"] as const).forEach((pos) => {
        const inPos = result.players.filter((p: TeamOfWeekPlayer) => p.position === pos);
        const targets = newSlots.filter((s) => s.position === pos);
        inPos.forEach((p, i) => {
          if (targets[i]) {
            targets[i].player = { id: p.id, name: p.name, team: p.team, position: p.position };
          }
        });
      });

      const map: Record<string, number> = {};
      result.players.forEach((p) => (map[p.id] = p.points));

      setFormation(result.formation);
      setSlots(newSlots);
      setPointsMap(map);
      setLoading(false);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [selectedFilter]);

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
              value={selectedFilter ?? ""}
              onChange={(e) =>
                setSelectedFilter(
                  e.target.value === "total" ? "total" : Number(e.target.value)
                )
              }
              className="h-10 w-full rounded-lg border border-charcoal/15 bg-white px-3 text-sm"
            >
              <option value="total">Genel Toplam</option>
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
              {selectedFilter === "total"
                ? `Sezon başından bu yana biriken genel toplam puanlara göre otomatik oluşturulur — geçerli dizilişler arasından en yüksek toplamı veren ${formation} seçildi.`
                : `O haftanın istatistiklerine göre otomatik oluşturulur — geçerli dizilişler arasından en yüksek toplam puanı veren ${formation} seçildi, mevkilere en yüksek puanlı oyuncular yerleştirildi.`}
            </p>
          </>
        )}

        {modalPlayer && (
          <PlayerPointsModal
            player={modalPlayer}
            gameweekId={typeof selectedFilter === "number" ? selectedFilter : null}
            onClose={() => setModalPlayer(null)}
          />
        )}
      </div>
      </main>
    </>
  );
}
