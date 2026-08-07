import { supabase } from "./supabase";

export async function fetchSquadFrozen(
  userId: string,
  gameweekId: number
): Promise<boolean> {
  const { data, error } = await supabase
    .from("user_squad_freeze")
    .select("frozen")
    .eq("user_id", userId)
    .eq("gameweek_id", gameweekId)
    .maybeSingle();

  if (error || !data) return false;
  return data.frozen as boolean;
}

export async function setSquadFrozen(
  userId: string,
  gameweekId: number,
  frozen: boolean
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from("user_squad_freeze")
    .upsert(
      { user_id: userId, gameweek_id: gameweekId, frozen, updated_at: new Date().toISOString() },
      { onConflict: "user_id,gameweek_id" }
    );

  return { error: error?.message ?? null };
}
