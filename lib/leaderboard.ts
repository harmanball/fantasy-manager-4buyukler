import { supabase } from "./supabase";
import { fetchFinishedGameweeks } from "./gameweekResult";
import { EmblemId } from "./emblems";

export interface LeaderboardRow {
  user_id: string;
  username: string;
  squad_name: string | null;
  emblem: EmblemId;
  team_color1: string;
  team_color2: string;
  total_points: number;
}

interface TiebreakStats {
  bestWeek: number;
  firstPlaceCount: number;
}

// Genel Toplam'da puanlar eşitse kullanılacak belirleme kuralı:
// 1) en yüksek tek hafta puanı, 2) hâlâ eşitse en çok haftalık 1.lik sayısı.
// Bir haftada birden fazla kişi aynı en yüksek puanı almışsa, o hafta için
// hepsi "1. sıra" sayılır (hiç kimse haksız yere dışarıda bırakılmaz).
async function fetchTiebreakStats(): Promise<Map<string, TiebreakStats>> {
  const { data, error } = await supabase
    .from("user_gameweek_scores")
    .select("user_id, gameweek_id, points");

  const stats = new Map<string, TiebreakStats>();
  if (error || !data) return stats;

  const byGameweek = new Map<number, { user_id: string; points: number }[]>();
  for (const row of data) {
    const gwId = row.gameweek_id as number;
    const entry = { user_id: row.user_id as string, points: row.points as number };
    if (!byGameweek.has(gwId)) byGameweek.set(gwId, []);
    byGameweek.get(gwId)!.push(entry);
  }

  function ensure(userId: string): TiebreakStats {
    if (!stats.has(userId)) stats.set(userId, { bestWeek: 0, firstPlaceCount: 0 });
    return stats.get(userId)!;
  }

  for (const rows of byGameweek.values()) {
    const maxPoints = Math.max(...rows.map((r) => r.points));
    for (const r of rows) {
      const s = ensure(r.user_id);
      if (r.points > s.bestWeek) s.bestWeek = r.points;
      if (r.points === maxPoints) s.firstPlaceCount += 1;
    }
  }

  return stats;
}

export async function fetchLeaderboard(): Promise<LeaderboardRow[]> {
  const { data, error } = await supabase
    .from("leaderboard")
    .select("user_id, username, squad_name, emblem, team_color1, team_color2, total_points");

  if (error) {
    console.error("Sıralama çekilemedi:", error.message);
    return [];
  }

  const tiebreak = await fetchTiebreakStats();

  const rows = (data ?? []).map((r) => {
    const t = tiebreak.get(r.user_id as string);
    return {
      row: r as LeaderboardRow,
      bestWeek: t?.bestWeek ?? 0,
      firstPlaceCount: t?.firstPlaceCount ?? 0,
    };
  });

  rows.sort((a, b) => {
    if (b.row.total_points !== a.row.total_points) {
      return b.row.total_points - a.row.total_points;
    }
    if (b.bestWeek !== a.bestWeek) return b.bestWeek - a.bestWeek;
    return b.firstPlaceCount - a.firstPlaceCount;
  });

  return rows.map((r) => r.row);
}

// Sıralama sayfasındaki hafta filtresi için: tek bir haftanın sıralaması
export async function fetchGameweekLeaderboard(
  gameweekId: number
): Promise<LeaderboardRow[]> {
  const { data, error } = await supabase
    .from("user_gameweek_scores")
    .select("user_id, points, profiles(username, squad_name, emblem, team_color1, team_color2)")
    .eq("gameweek_id", gameweekId)
    .order("points", { ascending: false });

  if (error) {
    console.error("Haftalık sıralama çekilemedi:", error.message);
    return [];
  }

  return (data ?? []).map((row) => {
    const profileRel = row.profiles as unknown as
      | {
          username: string;
          squad_name: string | null;
          emblem: EmblemId;
          team_color1: string;
          team_color2: string;
        }
      | {
          username: string;
          squad_name: string | null;
          emblem: EmblemId;
          team_color1: string;
          team_color2: string;
        }[];
    const profile = Array.isArray(profileRel) ? profileRel[0] : profileRel;
    return {
      user_id: row.user_id as string,
      username: profile?.username ?? "?",
      squad_name: profile?.squad_name ?? null,
      emblem: profile?.emblem ?? "shield",
      team_color1: profile?.team_color1 ?? "#123524",
      team_color2: profile?.team_color2 ?? "#E8C766",
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
