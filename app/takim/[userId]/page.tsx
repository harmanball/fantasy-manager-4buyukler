"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "@/lib/useSession";
import { supabase } from "@/lib/supabase";
import { Formation, SQUAD_SIZE } from "@/lib/teams";
import { fetchPlayers, Player } from "@/lib/players";
import {
  fetchOpenGameweek,
  fetchUserSquad,
  fetchPreviousWeekSquad,
  buildSquadFromPicks,
} from "@/lib/squad";
import { fetchFinishedGameweeks } from "@/lib/gameweekResult";
import { fetchLastFinishedGameweekPoints } from "@/lib/playerPoints";
import { fetchIsTransferWindowOpen } from "@/lib/transferWindow";
import { AppHeader } from "@/components/AppHeader";
import { FormationPicker } from "@/components/FormationPicker";
import { Pitch, SquadSlot, buildSlots } from "@/components/Pitch";
import { StatCards } from "@/components/StatCards";
import { PlayerPointsModal } from "@/components/PlayerPointsModal";

export default function TakimPage() {
  const { session, loading: sessionLoading } = useSession();
  const router = useRouter();
  const params = useParams<{ userId: string }>();
  const targetUserId = params.userId;

  const [ownerName, setOwnerName] = useState<string | null>(null);
  const [lastWeekPoints, setLastWeekPoints] = useState<Record<string, number>>({});
  const [lastWeekGameweekId, setLastWeekGameweekId] = useState<number | null>(null);
  const [lastWeekName, setLastWeekName] = useState<string | null>(null);

  // Gösterilen kadronun "bu haftanın canlı seçimi" değil, kilitli bir
  // önceki hafta olduğunu belirtmek için — sadece bilgi notu amaçlı.
  const [showingLockedPrevWeek, setShowingLockedPrevWeek] = useState(false);

  const [formation, setFormation] = useState<Formation>("4-3-3");
  const [slots, setSlots] = useState<SquadSlot[]>(() => buildSlots("4-3-3"));
  const [captainId, setCaptainId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [modalPlayer, setModalPlayer] = useState<Player | null>(null);

  useEffect(() => {
    if (!sessionLoading && !session) router.push("/giris");
  }, [sessionLoading, session, router]);

  useEffect(() => {
    if (!session) return;
    let cancelled = false;

    async function load() {
      const { data: profile } = await supabase
        .from("profiles")
        .select("username, squad_name")
        .eq("id", targetUserId)
        .maybeSingle();
      if (cancelled) return;
      setOwnerName(profile?.squad_name || profile?.username || "Bilinmeyen kullanıcı");

      const allPlayers = await fetchPlayers();
      if (cancelled) return;

      const openGw = await fetchOpenGameweek();
      const windowOpen = await fetchIsTransferWindowOpen();
      if (cancelled) return;

      let saved: Awaited<ReturnType<typeof fetchUserSquad>> = [];
      let fromPrevWeek = false;

      if (openGw) {
        if (windowOpen) {
          // Transfer penceresi açık — bu haftanın seçimleri henüz
          // kesinleşmemiş sayılır (herkes değiştirebilir), bu yüzden
          // başkalarına gösterilmez. Bunun yerine bir önceki, artık
          // kilitli haftanın kadrosu gösterilir.
          saved = await fetchPreviousWeekSquad(targetUserId, openGw.week_number);
          fromPrevWeek = saved.length > 0;
        } else {
          // Pencere kapalı — bu haftanın kadrosu artık kilitli, güvenle
          // gösterilebilir.
          saved = await fetchUserSquad(targetUserId, openGw.id);
        }
      }

      if (saved.length === 0) {
        const finished = await fetchFinishedGameweeks();
        if (finished.length > 0) {
          saved = await fetchUserSquad(targetUserId, finished[0].id);
          fromPrevWeek = false;
        }
      }
      if (cancelled) return;

      const result = buildSquadFromPicks(saved, allPlayers);
      if (result) {
        setFormation(result.formation);
        setSlots(result.slots);
        setCaptainId(result.captainId);
        setShowingLockedPrevWeek(fromPrevWeek);
      } else {
        setNotFound(true);
      }

      const lastWeek = await fetchLastFinishedGameweekPoints();
      if (cancelled) return;
      setLastWeekGameweekId(lastWeek.gameweekId);
      setLastWeekName(lastWeek.gameweekName);
      setLastWeekPoints(lastWeek.map);
      setLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [session, targetUserId]);

  const filledCount = slots.filter((s) => s.player).length;
  const captainName =
    slots.find((s) => s.player?.id === captainId)?.player?.name ?? null;

  if (sessionLoading || !session || loading) {
    return (
      <>
        <AppHeader />
        <main className="mx-auto flex min-h-[calc(100dvh-57px)] max-w-3xl items-center justify-center px-3 py-4">
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
      <main className="mx-auto max-w-3xl px-3 py-4 sm:px-6 sm:py-6">
      <div className="flex flex-col gap-4 rounded-xl bg-background p-4 sm:p-6">
        <h1 className="font-display text-lg font-semibold sm:text-xl">{ownerName}</h1>

      {notFound ? (
        <p className="rounded-lg border border-charcoal/10 bg-white px-4 py-6 text-center text-sm text-foreground/60">
          Bu kullanıcının görüntülenebilir bir kadrosu bulunamadı.
        </p>
      ) : (
        <>
          {showingLockedPrevWeek && (
            <p className="rounded-lg border border-gold/40 bg-gold/10 px-3 py-2 text-xs text-charcoal">
              Transfer penceresi açık olduğu için bu haftaki kadrosu henüz
              gösterilmiyor — gördüğün, bir önceki (kilitli) haftanın
              kadrosu.
            </p>
          )}

          <FormationPicker value={formation} onChange={() => {}} />

          {lastWeekName && (
            <p className="text-center text-[11px] text-foreground/50">
              Oyuncu rozetlerindeki puanlar son hafta ({lastWeekName}) sonuçlarını gösterir
            </p>
          )}

          <Pitch
            slots={slots}
            captainId={captainId}
            lastWeekPoints={lastWeekPoints}
            onSlotTap={(slot) => {
              if (slot.player) setModalPlayer(slot.player);
            }}
          />

          <StatCards
            filledCount={filledCount}
            totalSlots={SQUAD_SIZE}
            captainName={captainName}
          />
        </>
      )}

      {modalPlayer && (
        <PlayerPointsModal
          player={modalPlayer}
          gameweekId={lastWeekGameweekId}
          onClose={() => setModalPlayer(null)}
        />
      )}
      </div>
      </main>
    </>
  );
}
