"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useSession } from "@/lib/useSession";
import { supabase } from "@/lib/supabase";
import { Formation, SQUAD_SIZE } from "@/lib/teams";
import { fetchPlayers } from "@/lib/players";
import { fetchOpenGameweek, fetchUserSquad, buildSquadFromPicks } from "@/lib/squad";
import { fetchFinishedGameweeks } from "@/lib/gameweekResult";
import { fetchLastFinishedGameweekPoints } from "@/lib/playerPoints";
import { FormationPicker } from "@/components/FormationPicker";
import { Pitch, SquadSlot, buildSlots } from "@/components/Pitch";
import { StatCards } from "@/components/StatCards";

export default function TakimPage() {
  const { session, loading: sessionLoading } = useSession();
  const router = useRouter();
  const params = useParams<{ userId: string }>();
  const targetUserId = params.userId;

  const [ownerName, setOwnerName] = useState<string | null>(null);
  const [lastWeekPoints, setLastWeekPoints] = useState<Record<string, number>>({});
  const [lastWeekGameweekId, setLastWeekGameweekId] = useState<number | null>(null);
  const [lastWeekName, setLastWeekName] = useState<string | null>(null);

  const [formation, setFormation] = useState<Formation>("4-3-3");
  const [slots, setSlots] = useState<SquadSlot[]>(() => buildSlots("4-3-3"));
  const [captainId, setCaptainId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

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

      // Önce açık/yaklaşan haftanın kadrosunu dene, yoksa son bitmiş haftaya düş
      const openGw = await fetchOpenGameweek();
      let saved = openGw ? await fetchUserSquad(targetUserId, openGw.id) : [];
      if (saved.length === 0) {
        const finished = await fetchFinishedGameweeks();
        if (finished.length > 0) {
          saved = await fetchUserSquad(targetUserId, finished[0].id);
        }
      }
      if (cancelled) return;

      const result = buildSquadFromPicks(saved, allPlayers);
      if (result) {
        setFormation(result.formation);
        setSlots(result.slots);
        setCaptainId(result.captainId);
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
      <main className="mx-auto flex min-h-dvh max-w-3xl items-center justify-center px-3">
        <p className="text-sm text-foreground/50">Yükleniyor…</p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-3xl flex-col gap-4 px-3 py-4 sm:px-6 sm:py-6">
      <header className="flex items-center justify-between">
        <h1 className="font-display text-lg font-semibold sm:text-xl">
          {ownerName}
        </h1>
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="text-xs text-foreground/50 underline underline-offset-2"
          >
            Anasayfa
          </Link>
          <Link
            href="/siralama"
            className="text-xs text-foreground/50 underline underline-offset-2"
          >
            Sıralama
          </Link>
        </div>
      </header>

      {notFound ? (
        <p className="rounded-lg border border-charcoal/10 bg-white px-4 py-6 text-center text-sm text-foreground/60">
          Bu kullanıcının görüntülenebilir bir kadrosu bulunamadı.
        </p>
      ) : (
        <>
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
            lastWeekGameweekId={lastWeekGameweekId}
            onSlotTap={() => {}}
          />

          <StatCards
            filledCount={filledCount}
            totalSlots={SQUAD_SIZE}
            captainName={captainName}
          />
        </>
      )}
    </main>
  );
}
