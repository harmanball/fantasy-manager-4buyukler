import { supabase } from "./supabase";
import { fetchFinishedGameweeks } from "./gameweekResult";

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

// Kadro ekranındaki "Genel Lig Sıralaman" / "Genel Toplam Puanın" için
export async function fetchUserOverallRank(
  userId: string
): Promise<{ rank: number; total: number } | null> {
  const rows = await fetchLeaderboard();
  const idx = rows.findIndex((r) => r.user_id === userId);
  if (idx === -1) return null;
  return { rank: idx + 1, total: rows[idx].total_points };
}

// Kadro ekranındaki "Bu Haftaki Lig Sıralaman" için
export async function fetchUserGameweekRank(
  userId: string,
  gameweekId: number
): Promise<{ rank: number; total: number } | null> {
  const rows = await fetchGameweekLeaderboard(gameweekId);
  const idx = rows.findIndex((r) => r.user_id === userId);
  if (idx === -1) return null;
  return { rank: idx + 1, total: rows[idx].total_points };
}

export type RankChange = "up" | "down" | "same" | null;

export interface LeaderboardRowWithTrend extends LeaderboardRow {
  rankChange: RankChange;
}

// Genel Toplam sıralamasında bir önceki haftaya göre yükseliş/düşüş bilgisi
export async function fetchLeaderboardWithTrend(): Promise<LeaderboardRowWithTrend[]> {
  const current = await fetchLeaderboard();
  const weeks = await fetchFinishedGameweeks(); // en yeni hafta en başta

  // Karşılaştıracak bir "önceki hafta" yoksa (ilk hafta) ok göstermek anlamsız
  if (weeks.length < 2) {
    return current.map((r) => ({ ...r, rankChange: null }));
  }

  const latestGwId = weeks[0].id;
  const { data: latestScores } = await supabase
    .from("user_gameweek_scores")
    .select("user_id, points")
    .eq("gameweek_id", latestGwId);

  const latestMap = new Map(
    (latestScores ?? []).map((s) => [s.user_id as string, s.points as number])
  );

  // Son haftanın puanı çıkarılınca ortaya çıkan "bir önceki haftadaki toplam"
  const previous = current
    .map((r) => ({
      user_id: r.user_id,
      prevTotal: r.total_points - (latestMap.get(r.user_id) ?? 0),
    }))
    .sort((a, b) => b.prevTotal - a.prevTotal);

  const prevRankIndex = new Map(previous.map((r, i) => [r.user_id, i]));

  return current.map((r, i) => {
    const prevIdx = prevRankIndex.get(r.user_id);
    let rankChange: RankChange = null;
    if (prevIdx !== undefined) {
      if (i < prevIdx) rankChange = "up";
      else if (i > prevIdx) rankChange = "down";
      else rankChange = "same";
    }
    return { ...r, rankChange };
  });
}
