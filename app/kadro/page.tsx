"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Formation, TEAM_LIMIT, SQUAD_SIZE } from "@/lib/teams";
import { fetchPlayers, Player, Position } from "@/lib/players";
import { fetchOpenGameweek, saveSquad } from "@/lib/squad";
import { useSession } from "@/lib/useSession";
import { supabase } from "@/lib/supabase";
import { FormationPicker } from "@/components/FormationPicker";
import { Pitch, SquadSlot, buildSlots } from "@/components/Pitch";
import { StatCards } from "@/components/StatCards";
import { PlayerSheet } from "@/components/PlayerSheet";
import { PlayerActionSheet } from "@/components/PlayerActionSheet";

export default function KadroPage() {
  const { session, loading: sessionLoading } = useSession();
  const router = useRouter();

  const [players, setPlayers] = useState<Player[]>([]);
  const [playersLoading, setPlayersLoading] = useState(true);
  const [gameweek, setGameweek] = useState<{ id: number; name: string | null } | null>(null);

  const [formation, setFormation] = useState<Formation>("4-3-3");
  const [slots, setSlots] = useState<SquadSlot[]>(() => buildSlots("4-3-3"));
  const [captainId, setCaptainId] = useState<string | null>(null);
  const [pickerPosition, setPickerPosition] = useState<Position | null>(null);
  const [activeSlotId, setActiveSlotId] = useState<string | null>(null);
  const [actionPlayer, setActionPlayer] = useState<Player | null>(null);

  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

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
    fetchOpenGameweek().then(setGameweek);
  }, []);

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

  function handleSlotTap(slot: SquadSlot) {
    if (slot.player) {
      setActionPlayer(slot.player);
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
    if (actionPlayer?.id === captainId) setCaptainId(null);
    setActionPlayer(null);
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

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/giris");
  }

  if (sessionLoading || !session) {
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
          Kadromu kur
        </h1>
        <div className="flex items-center gap-3">
          <Link
            href="/siralama"
            className="text-xs text-foreground/50 underline underline-offset-2"
          >
            Sıralama
          </Link>
          <button
            onClick={handleLogout}
            className="text-xs text-foreground/50 underline underline-offset-2"
          >
            Çıkış yap
          </button>
        </div>
      </header>

      {!gameweek && !playersLoading && (
        <p className="rounded-lg border border-gold/40 bg-gold/10 px-3 py-2 text-xs text-charcoal">
          Henüz açık bir hafta yok — kadro kaydı yakında açılacak.
        </p>
      )}

      <FormationPicker value={formation} onChange={changeFormation} />

      {playersLoading ? (
        <div className="mx-auto flex aspect-[3/4] w-full max-w-[360px] items-center justify-center rounded-lg bg-pitch sm:max-w-[440px]">
          <p className="text-sm text-ivory/60">Oyuncular yükleniyor…</p>
        </div>
      ) : (
        <Pitch slots={slots} captainId={captainId} onSlotTap={handleSlotTap} />
      )}

      <StatCards
        filledCount={filledCount}
        totalSlots={SQUAD_SIZE}
        captainName={captainName}
      />

      <button
        disabled={!canSave || saving}
        onClick={handleSave}
        className="rounded-lg bg-pitch py-3 text-sm font-medium text-ivory disabled:cursor-not-allowed disabled:opacity-30"
      >
        {saving ? "Kaydediliyor…" : "Kadromu kaydet"}
      </button>

      {saveMessage && (
        <p className="text-center text-sm text-foreground/70">{saveMessage}</p>
      )}

      {pickerPosition && (
        <PlayerSheet
          position={pickerPosition}
          players={players}
          teamCounts={teamCounts}
          excludeIds={usedPlayerIds}
          onPick={assignPlayer}
          onClose={() => {
            setPickerPosition(null);
            setActiveSlotId(null);
          }}
        />
      )}

      {actionPlayer && (
        <PlayerActionSheet
          player={actionPlayer}
          isCaptain={actionPlayer.id === captainId}
          onMakeCaptain={() => {
            setCaptainId(actionPlayer.id);
            setActionPlayer(null);
          }}
          onRemove={removeFromSlot}
          onClose={() => setActionPlayer(null)}
        />
      )}
    </main>
  );
}
