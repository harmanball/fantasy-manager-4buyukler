"use client";

import { useMemo, useState } from "react";
import { Formation, TEAM_LIMIT, SQUAD_SIZE } from "@/lib/teams";
import { MOCK_PLAYERS, Player, Position } from "@/lib/players";
import { FormationPicker } from "@/components/FormationPicker";
import { Pitch, SquadSlot, buildSlots } from "@/components/Pitch";
import { StatCards } from "@/components/StatCards";
import { PlayerSheet } from "@/components/PlayerSheet";
import { PlayerActionSheet } from "@/components/PlayerActionSheet";

export default function KadroPage() {
  const [formation, setFormation] = useState<Formation>("4-3-3");
  const [slots, setSlots] = useState<SquadSlot[]>(() => buildSlots("4-3-3"));
  const [captainId, setCaptainId] = useState<string | null>(null);
  const [viceId, setViceId] = useState<string | null>(null);
  const [pickerPosition, setPickerPosition] = useState<Position | null>(null);
  const [activeSlotId, setActiveSlotId] = useState<string | null>(null);
  const [actionPlayer, setActionPlayer] = useState<Player | null>(null);

  function changeFormation(f: Formation) {
    const newSlots = buildSlots(f);
    // mevcut oyuncuları mevkiye göre yeniden yerleştirmeyi dene
    const existing = slots.filter((s) => s.player);
    for (const pos of ["GK", "DEF", "MID", "FWD"] as Position[]) {
      const players = existing.filter((s) => s.position === pos);
      const targets = newSlots.filter((s) => s.position === pos);
      players.forEach((p, i) => {
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
    if (actionPlayer?.id === viceId) setViceId(null);
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

  const filledCount = slots.filter((s) => s.player).length;
  const captainName =
    slots.find((s) => s.player?.id === captainId)?.player?.name ?? null;

  return (
    <main className="mx-auto flex min-h-dvh max-w-3xl flex-col gap-4 px-3 py-4 sm:px-6 sm:py-6">
      <header className="flex items-center justify-between">
        <h1 className="font-display text-lg font-semibold sm:text-xl">
          Kadromu kur
        </h1>
        <span className="rounded-full bg-gold/15 px-3 py-1 text-xs font-medium text-gold">
          Fantasy Manager: 4 Büyükler
        </span>
      </header>

      <FormationPicker value={formation} onChange={changeFormation} />

      <Pitch
        slots={slots}
        captainId={captainId}
        viceId={viceId}
        onSlotTap={handleSlotTap}
      />

      <StatCards
        filledCount={filledCount}
        totalSlots={SQUAD_SIZE}
        teamCounts={teamCounts}
        captainName={captainName}
      />

      <button
        disabled={
          filledCount !== SQUAD_SIZE ||
          Object.values(teamCounts).some((c) => c > TEAM_LIMIT) ||
          !captainId
        }
        className="rounded-lg bg-pitch py-3 text-sm font-medium text-ivory disabled:cursor-not-allowed disabled:opacity-30"
      >
        Kadromu kaydet
      </button>

      {pickerPosition && (
        <PlayerSheet
          position={pickerPosition}
          players={MOCK_PLAYERS}
          teamCounts={teamCounts}
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
          isVice={actionPlayer.id === viceId}
          onMakeCaptain={() => {
            setCaptainId(actionPlayer.id);
            if (viceId === actionPlayer.id) setViceId(null);
            setActionPlayer(null);
          }}
          onMakeVice={() => {
            setViceId(actionPlayer.id);
            if (captainId === actionPlayer.id) setCaptainId(null);
            setActionPlayer(null);
          }}
          onRemove={removeFromSlot}
          onClose={() => setActionPlayer(null)}
        />
      )}
    </main>
  );
}
