"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Formation, TEAM_LIMIT, SQUAD_SIZE } from "@/lib/teams";
import { fetchPlayers, Player, Position } from "@/lib/players";
import { fetchOpenGameweek, fetchUserSquad, saveSquad, buildSquadFromPicks } from "@/lib/squad";
import { fetchPlayerPointsMap, fetchLastFinishedGameweekPoints } from "@/lib/playerPoints";
import { fetchGameweekResult } from "@/lib/gameweekResult";
import { fetchUserOverallRank, fetchUserGameweekRank } from "@/lib/leaderboard";
import { useSession } from "@/lib/useSession";
import { supabase } from "@/lib/supabase";
import { AppHeader } from "@/components/AppHeader";
import { FormationPicker } from "@/components/FormationPicker";
import { Pitch, SquadSlot, buildSlots } from "@/components/Pitch";
import { StatCards } from "@/components/StatCards";
import { PlayerSheet } from "@/components/PlayerSheet";
import { PlayerPointsModal } from "@/components/PlayerPointsModal";
import { CaptainPickerSheet } from "@/components/CaptainPickerSheet";
import { Skeleton } from "@/components/Skeleton";
import { shareText, getSiteUrl } from "@/lib/share";

export default function KadroPage() {
  const { session, loading: sessionLoading } = useSession();
  const router = useRouter();

  const [players, setPlayers] = useState<Player[]>([]);
  const [playersLoading, setPlayersLoading] = useState(true);
  const [pointsMap, setPointsMap] = useState<Record<string, number>>({});
  const [lastWeekPoints, setLastWeekPoints] = useState<Record<string, number>>({});
  const [lastWeekName, setLastWeekName] = useState<string | null>(null);
  const [lastWeekGameweekId, setLastWeekGameweekId] = useState<number | null>(null);
  const [lastWeekTotal, setLastWeekTotal] = useState<number | null>(null);
  const [overallRank, setOverallRank] = useState<number | null>(null);
  const [squadName, setSquadName] = useState<string | null>(null);
  const [overallTotal, setOverallTotal] = useState<number | null>(null);
  const [weeklyRank, setWeeklyRank] = useState<number | null>(null);
  const [gameweek, setGameweek] = useState<{ id: number; name: string | null } | null>(null);
  const [gameweekLoading, setGameweekLoading] = useState(true);

  const [formation, setFormation] = useState<Formation>("4-3-3");
  const [slots, setSlots] = useState<SquadSlot[]>(() => buildSlots("4-3-3"));
  const [captainId, setCaptainId] = useState<string | null>(null);
  const [pickerPosition, setPickerPosition] = useState<Position | null>(null);
  const [activeSlotId, setActiveSlotId] = useState<string | null>(null);
  const [modalPlayer, setModalPlayer] = useState<Player | null>(null);
  const [captainPickerOpen, setCaptainPickerOpen] = useState(false);

  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [squadLoaded, setSquadLoaded] = useState(false);

  useEffect(() => {
    if (!sessionLoading && !session) {
      router.push("/giris");
    }
  }, [sessionLoading, session, router]);

  useEffect(() => {
    fetchPlayers().then((p) => {
      setPlayers(p);
      setPlayersLoading(false);
    });
    fetchOpenGameweek().then((gw) => {
      setGameweek(gw);
      setGameweekLoading(false);
    });
    fetchPlayerPointsMap().then(setPointsMap);
    fetchLastFinishedGameweekPoints().then(({ gameweekId, gameweekName, map }) => {
      setLastWeekGameweekId(gameweekId);
      setLastWeekName(gameweekName);
      setLastWeekPoints(map);
    });
  }, []);

  // Kullanıcının son bitmiş haftadaki gerçek (çarpanlı) toplam puanı
  useEffect(() => {
    if (!session || !lastWeekGameweekId) return;
    fetchGameweekResult(session.user.id, lastWeekGameweekId).then(({ total }) => {
      setLastWeekTotal(total);
    });
  }, [session, lastWeekGameweekId]);

  // Genel lig sıralaman ve genel toplam puanın
  useEffect(() => {
    if (!session) return;
    fetchUserOverallRank(session.user.id).then((r) => {
      if (r) {
        setOverallRank(r.rank);
        setOverallTotal(r.total);
      }
    });
  }, [session]);

  // Takım adı (profil)
  useEffect(() => {
    if (!session) return;
    supabase
      .from("profiles")
      .select("squad_name, username")
      .eq("id", session.user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setSquadName(data.squad_name || data.username);
      });
  }, [session]);

  // Bu haftaki lig sıralaman
  useEffect(() => {
    if (!session || !lastWeekGameweekId) return;
    fetchUserGameweekRank(session.user.id, lastWeekGameweekId).then((r) => {
      if (r) setWeeklyRank(r.rank);
    });
  }, [session, lastWeekGameweekId]);

  // Kaydedilmiş kadroyu bir kez geri yükle (oyuncular ve hafta bilgisi hazır olunca)
  useEffect(() => {
    if (playersLoading || gameweekLoading || squadLoaded || !session) return;

    async function loadSavedSquad() {
      if (!gameweek) {
        setSquadLoaded(true);
        return;
      }
      const saved = await fetchUserSquad(session!.user.id, gameweek.id);
      const result = buildSquadFromPicks(saved, players);
      if (result) {
        setFormation(result.formation);
        setSlots(result.slots);
        setCaptainId(result.captainId);
      }
      setSquadLoaded(true);
    }

    loadSavedSquad();
  }, [playersLoading, gameweekLoading, squadLoaded, session, gameweek, players]);

  function changeFormation(f: Formation) {
    const newSlots = buildSlots(f);
    const existing = slots.filter((s) => s.player);
    for (const pos of ["GK", "DEF", "MID", "FWD"] as Position[]) {
      const ps = existing.filter((s) => s.position === pos);
      const targets = newSlots.filter((s) => s.position === pos);
      ps.forEach((p, i) => {
        if (targets[i]) targets[i].player = p.player;
      });
    }
    setFormation(f);
    setSlots(newSlots);
  }

  // Dolu bir slota (avatar ya da puan rozeti — ikisi de aynı alan) dokunmak
  // birleşik puan detayı + kaptan/çıkarma penceresini açar. Boş slot ise
  // oyuncu ekleme panelini açar.
  function handleSlotTap(slot: SquadSlot) {
    if (slot.player) {
      setModalPlayer(slot.player);
      setActiveSlotId(slot.id);
    } else {
      setActiveSlotId(slot.id);
      setPickerPosition(slot.position);
    }
  }

  function assignPlayer(p: Player) {
    setSlots((prev) =>
      prev.map((s) => (s.id === activeSlotId ? { ...s, player: p } : s))
    );
    setPickerPosition(null);
    setActiveSlotId(null);
  }

  function removeFromSlot() {
    if (!activeSlotId) return;
    setSlots((prev) =>
      prev.map((s) => (s.id === activeSlotId ? { ...s, player: null } : s))
    );
    if (modalPlayer?.id === captainId) setCaptainId(null);
    setModalPlayer(null);
    setActiveSlotId(null);
  }

  const teamCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const s of slots) {
      if (s.player) counts[s.player.team] = (counts[s.player.team] ?? 0) + 1;
    }
    return counts;
  }, [slots]);

  const usedPlayerIds = useMemo(
    () => slots.filter((s) => s.player).map((s) => s.player!.id),
    [slots]
  );

  const squadPlayers = useMemo(
    () => slots.filter((s) => s.player).map((s) => s.player!),
    [slots]
  );

  const filledCount = slots.filter((s) => s.player).length;
  const captainName =
    slots.find((s) => s.player?.id === captainId)?.player?.name ?? null;

  const canSave =
    filledCount === SQUAD_SIZE &&
    !Object.values(teamCounts).some((c) => c > TEAM_LIMIT) &&
    !!captainId &&
    !!gameweek &&
    !!session;

  async function handleSave() {
    if (!session || !gameweek) return;
    setSaving(true);
    setSaveMessage(null);
    const picks = slots
      .filter((s) => s.player)
      .map((s) => ({
        playerId: s.player!.id,
        isCaptain: s.player!.id === captainId,
      }));
    const { error } = await saveSquad({
      userId: session.user.id,
      gameweekId: gameweek.id,
      picks,
    });
    setSaving(false);
    setSaveMessage(error ? `Hata: ${error}` : "Kadron kaydedildi ✓");
  }

  if (sessionLoading || !session) {
    return (
      <>
        <AppHeader />
        <main className="mx-auto flex min-h-[calc(100dvh-57px)] max-w-3xl items-center justify-center px-3">
          <p className="text-sm text-foreground/50">Yükleniyor…</p>
        </main>
      </>
    );
  }

  return (
    <>
      <AppHeader />
      <main className="mx-auto flex max-w-3xl flex-col gap-4 px-3 py-4 sm:px-6 sm:py-6">

      {squadName && (
        <h2 className="text-center font-display text-2xl font-bold text-charcoal sm:text-3xl">
          {squadName} Takım Kadro
        </h2>
      )}

      {(overallRank !== null || lastWeekTotal !== null) && (
        <div className="flex flex-col divide-y divide-gold/25 rounded-lg border border-gold/40 bg-gold/10 px-4 py-1">
          <div className="flex items-center justify-between py-2 text-sm">
            <span className="text-foreground/60">Genel Lig Sıralaman:</span>
            <span className="font-display font-semibold text-charcoal">
              {overallRank !== null ? `#${overallRank}` : "—"}
            </span>
          </div>
          <div className="flex items-center justify-between py-2 text-sm">
            <span className="text-foreground/60">Bu Haftaki Lig Sıralaman:</span>
            <span className="font-display font-semibold text-charcoal">
              {weeklyRank !== null ? `#${weeklyRank}` : "—"}
            </span>
          </div>
          <div className="flex items-center justify-between py-2 text-sm">
            <span className="text-foreground/60">Genel Toplam Puanın:</span>
            <span className="font-display font-semibold text-charcoal">
              {overallTotal ?? "—"}
            </span>
          </div>
          <div className="flex items-center justify-between py-2 text-sm">
            <span className="text-foreground/60">Bu Haftaki Toplam Puanın:</span>
            <span className="font-display font-semibold text-charcoal">
              {lastWeekTotal ?? "—"}
            </span>
          </div>
        </div>
      )}

      {lastWeekTotal !== null && (
        <button
          onClick={() =>
            shareText(
              `Fantasy Manager: 4 Büyükler'de ${lastWeekName ?? "bu hafta"} ${lastWeekTotal} puan aldım! ${getSiteUrl()}`
            )
          }
          className="rounded-lg border border-charcoal/15 py-2.5 text-sm font-medium text-foreground hover:bg-charcoal/5"
        >
          Sonucunu paylaş
        </button>
      )}

      {!gameweek && !playersLoading && (
        <p className="rounded-lg border border-gold/40 bg-gold/10 px-3 py-2 text-xs text-charcoal">
          Henüz açık bir hafta yok — kadro kaydı yakında açılacak.
        </p>
      )}

      {squadLoaded && filledCount === 0 && (
        <div className="relative overflow-hidden rounded-lg bg-pitch px-5 py-7 text-center">
          <svg
            viewBox="0 0 300 160"
            className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.15]"
            aria-hidden="true"
          >
            <circle cx="150" cy="80" r="40" fill="none" stroke="#F5F1E8" strokeWidth="1.5" />
          </svg>
          <div className="relative">
            <svg width="34" height="34" viewBox="0 0 24 24" className="mx-auto text-gold" aria-hidden="true">
              <path
                d="M8 3 L12 5 L16 3 L20 6 L18 9 L16 8 L16 20 L8 20 L8 8 L6 9 L4 6 Z"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <p className="mt-2 font-display text-base font-semibold text-ivory sm:text-lg">
              Henüz kadron boş
            </p>
            <p className="mx-auto mt-1.5 max-w-[220px] text-xs leading-relaxed text-ivory/65">
              11 oyuncunu seç, kaptanını belirle, ilk haftana hazırlan.
            </p>
          </div>
        </div>
      )}

      <FormationPicker value={formation} onChange={changeFormation} />

      {lastWeekName && (
        <p className="text-center text-[11px] text-foreground/50">
          Oyuncu rozetlerindeki puanlar son hafta ({lastWeekName}) sonuçlarını gösterir
        </p>
      )}

      {playersLoading || !squadLoaded ? (
        <Skeleton className="mx-auto aspect-[3/4] w-full max-w-[360px] sm:max-w-[440px]" />
      ) : (
        <Pitch
          slots={slots}
          captainId={captainId}
          lastWeekPoints={lastWeekPoints}
          onSlotTap={handleSlotTap}
        />
      )}

      <StatCards
        filledCount={filledCount}
        totalSlots={SQUAD_SIZE}
        captainName={captainName}
        onCaptainClick={() => setCaptainPickerOpen(true)}
      />

      <button
        disabled={!canSave || saving}
        onClick={handleSave}
        className="rounded-lg bg-pitch py-3 text-sm font-medium text-ivory disabled:cursor-not-allowed disabled:opacity-30"
      >
        {saving ? "Kaydediliyor…" : "Kadromu kaydet"}
      </button>

      {saveMessage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-charcoal/50"
          onClick={() => setSaveMessage(null)}
        >
          <div
            className="mx-4 rounded-2xl bg-background px-6 py-8 text-center shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <p
              className={`font-display text-lg font-semibold ${
                saveMessage.startsWith("Hata") ? "text-red-600" : "text-pitch"
              }`}
            >
              {saveMessage}
            </p>
            <button
              onClick={() => setSaveMessage(null)}
              className="mt-4 rounded-lg bg-pitch px-6 py-2 text-sm font-medium text-ivory"
            >
              Tamam
            </button>
          </div>
        </div>
      )}

      {pickerPosition && (
        <PlayerSheet
          position={pickerPosition}
          players={players}
          teamCounts={teamCounts}
          excludeIds={usedPlayerIds}
          pointsMap={pointsMap}
          onPick={assignPlayer}
          onClose={() => {
            setPickerPosition(null);
            setActiveSlotId(null);
          }}
        />
      )}

      {modalPlayer && (
        <PlayerPointsModal
          player={modalPlayer}
          gameweekId={lastWeekGameweekId}
          isCaptain={modalPlayer.id === captainId}
          onMakeCaptain={() => {
            setCaptainId(modalPlayer.id);
            setModalPlayer(null);
          }}
          onRemove={removeFromSlot}
          onClose={() => setModalPlayer(null)}
        />
      )}

      {captainPickerOpen && (
        <CaptainPickerSheet
          players={squadPlayers}
          captainId={captainId}
          onPick={(id) => {
            setCaptainId(id);
            setCaptainPickerOpen(false);
          }}
          onClose={() => setCaptainPickerOpen(false)}
        />
      )}
      </main>
    </>
  );
}
