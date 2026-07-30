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

// Sıralama sayfasındaki hafta filtresi için: tek bir haftanın sıralaması
export async function fetchGameweekLeaderboard(
  gameweekId: number
): Promise<LeaderboardRow[]> {
  const { data, error } = await supabase
    .from("user_gameweek_scores")
    .select("user_id, points, profiles(username, squad_name)")
    .eq("gameweek_id", gameweekId)
    .order("points", { ascending: false });

  if (error) {
    console.error("Haftalık sıralama çekilemedi:", error.message);
    return [];
  }

  return (data ?? []).map((row) => {
    const profileRel = row.profiles as unknown as
      | { username: string; squad_name: string | null }
      | { username: string; squad_name: string | null }[];
    const profile = Array.isArray(profileRel) ? profileRel[0] : profileRel;
    return {
      user_id: row.user_id as string,
      username: profile?.username ?? "?",
      squad_name: profile?.squad_name ?? null,
      total_points: row.points as number,
    };
  });
}
