import { supabase } from "./supabase";
import { Formation, FORMATIONS, FORMATION_LAYOUT } from "./teams";
import { Player, Position } from "./players";
import { buildSlots, SquadSlot } from "@/components/Pitch";

export interface OpenGameweek {
  id: number;
  week_number: number;
  name: string | null;
}

export async function fetchOpenGameweek(): Promise<OpenGameweek | null> {
  const { data, error } = await supabase
    .from("gameweeks")
    .select("id, week_number, name")
    .in("status", ["open", "upcoming"])
    .order("week_number", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("Hafta bilgisi çekilemedi:", error.message);
    return null;
  }
  return data;
}

export interface SavedPick {
  playerId: string;
  isCaptain: boolean;
}

export async function fetchUserSquad(
  userId: string,
  gameweekId: number
): Promise<SavedPick[]> {
  const { data, error } = await supabase
    .from("user_picks")
    .select("player_id, is_captain")
    .eq("user_id", userId)
    .eq("gameweek_id", gameweekId);

  if (error) {
    console.error("Kayıtlı kadro çekilemedi:", error.message);
    return [];
  }
  return (data ?? []).map((row) => ({
    playerId: row.player_id as string,
    isCaptain: row.is_captain as boolean,
  }));
}

// Kayıtlı seçimlerden (playerId + kaptan bilgisi) diziliş, saha slotları ve
// kaptan id'sini yeniden kurar. Hem kendi kadro ekranında hem başkasının
// kadrosunu salt-okunur gösterirken AYNI mantık kullanılır — sonuç asla farklılaşmaz.
export function buildSquadFromPicks(
  saved: SavedPick[],
  players: Player[]
): { formation: Formation; slots: SquadSlot[]; captainId: string | null } | null {
  if (saved.length === 0) return null;

  const byId = new Map(players.map((p) => [p.id, p]));
  const withPlayer = saved
    .map((s) => ({ ...s, player: byId.get(s.playerId) }))
    .filter((s): s is SavedPick & { player: Player } => !!s.player);

  if (withPlayer.length === 0) return null;

  const counts: Record<Position, number> = { GK: 0, DEF: 0, MID: 0, FWD: 0 };
  withPlayer.forEach((s) => counts[s.player.position]++);

  const matchedFormation = FORMATIONS.find((f) => {
    const l = FORMATION_LAYOUT[f];
    return l.DEF === counts.DEF && l.MID === counts.MID && l.FWD === counts.FWD;
  });
  const formation = matchedFormation ?? "4-3-3";

  const slots = buildSlots(formation);
  (["GK", "DEF", "MID", "FWD"] as Position[]).forEach((pos) => {
    const inPos = withPlayer.filter((s) => s.player.position === pos);
    const targets = slots.filter((s) => s.position === pos);
    inPos.forEach((s, i) => {
      if (targets[i]) targets[i].player = s.player;
    });
  });

  const captain = withPlayer.find((s) => s.isCaptain);
  return { formation, slots, captainId: captain?.player.id ?? null };
}

export async function saveSquad({
  userId,
  gameweekId,
  picks,
}: {
  userId: string;
  gameweekId: number;
  picks: { playerId: string; isCaptain: boolean }[];
}): Promise<{ error: string | null }> {
  const { error: deleteError } = await supabase
    .from("user_picks")
    .delete()
    .eq("user_id", userId)
    .eq("gameweek_id", gameweekId);

  if (deleteError) {
    return { error: deleteError.message };
  }

  const rows = picks.map((p) => ({
    user_id: userId,
    gameweek_id: gameweekId,
    player_id: p.playerId,
    is_captain: p.isCaptain,
  }));

  const { error: insertError } = await supabase.from("user_picks").insert(rows);

  if (insertError) {
    return { error: insertError.message };
  }
  return { error: null };
}
