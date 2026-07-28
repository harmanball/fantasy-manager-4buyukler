import { supabase } from "./supabase";

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

export async function saveSquad({
  userId,
  gameweekId,
  picks,
}: {
  userId: string;
  gameweekId: number;
  picks: { playerId: string; isCaptain: boolean; isVice: boolean }[];
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
    is_vice: p.isVice,
  }));

  const { error: insertError } = await supabase.from("user_picks").insert(rows);

  if (insertError) {
    return { error: insertError.message };
  }
  return { error: null };
}
