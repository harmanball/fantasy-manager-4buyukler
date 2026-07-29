import { supabase } from "./supabase";

export interface LeaderboardRow {
  user_id: string;
  username: string;
  squad_name: string | null;
  total_points: number;
}

export async function fetchLeaderboard(): Promise<LeaderboardRow[]> {
  const { data, error } = await supabase
    .from("leaderboard")
    .select("user_id, username, squad_name, total_points")
    .order("total_points", { ascending: false });

  if (error) {
    console.error("Sıralama çekilemedi:", error.message);
    return [];
  }
  return data ?? [];
}
