import { supabase } from "./supabase";

export interface GameweekResultRow {
  playerId: string;
  name: string;
  team: string;
  position: string;
  basePoints: number;
  played: boolean;
  isCaptain: boolean;
  isMotm: boolean;
  multiplier: number;
  finalPoints: number;
}

export interface FinishedGameweek {
  id: number;
  week_number: number;
  name: string | null;
}

export async function fetchFinishedGameweeks(): Promise<FinishedGameweek[]> {
  const { data, error } = await supabase
    .from("gameweeks")
    .select("id, week_number, name")
    .eq("status", "finished")
    .order("week_number", { ascending: false });

  if (error) {
    console.error("Bitmiş haftalar çekilemedi:", error.message);
    return [];
  }
  return data ?? [];
}

export async function fetchGameweekResult(
  userId: string,
  gameweekId: number
): Promise<{ rows: GameweekResultRow[]; total: number }> {
  const { data: settings } = await supabase
    .from("game_settings")
    .select("key, value");
  const settingsMap = Object.fromEntries(
    (settings ?? []).map((s) => [s.key as string, s.value as number])
  );
  const captainMult = settingsMap["captain_multiplier"] ?? 2;
  const motmMult = settingsMap["motm_multiplier"] ?? 2;

  const { data: picks, error: picksErr } = await supabase
    .from("user_picks")
    .select("player_id, is_captain, players(name, position, teams(short_code))")
    .eq("user_id", userId)
    .eq("gameweek_id", gameweekId);

  if (picksErr) {
    console.error("Kadro çekilemedi:", picksErr.message);
    return { rows: [], total: 0 };
  }

  const { data: stats } = await supabase
    .from("player_stats")
    .select("player_id, points, is_motm, minutes")
    .eq("gameweek_id", gameweekId);

  const statsMap = new Map(
    (stats ?? []).map((s) => [s.player_id as string, s])
  );

  const rows: GameweekResultRow[] = (picks ?? []).map((p) => {
    const stat = statsMap.get(p.player_id as string);
    const basePoints = (stat?.points as number) ?? 0;
    const isMotm = (stat?.is_motm as boolean) ?? false;
    const played = ((stat?.minutes as number) ?? 0) > 0;

    const playerRel = p.players as unknown as
      | { name: string; position: string; teams: { short_code: string } | { short_code: string }[] }
      | { name: string; position: string; teams: { short_code: string } | { short_code: string }[] }[];
    const player = Array.isArray(playerRel) ? playerRel[0] : playerRel;
    const teamRel = player?.teams;
    const teamCode = Array.isArray(teamRel) ? teamRel[0]?.short_code : teamRel?.short_code;

    const multiplier =
      (p.is_captain && played ? captainMult : 1) * (isMotm ? motmMult : 1);

    return {
      playerId: p.player_id as string,
      name: player?.name ?? "?",
      team: teamCode ?? "?",
      position: player?.position ?? "?",
      basePoints,
      played,
      isCaptain: p.is_captain as boolean,
      isMotm,
      multiplier,
      finalPoints: basePoints * multiplier,
    };
  });

  rows.sort((a, b) => b.finalPoints - a.finalPoints);
  const total = rows.reduce((sum, r) => sum + r.finalPoints, 0);
  return { rows, total };
}

export interface WeeklyPoint {
  weekNumber: number;
  points: number;
}

// Puanlarım sayfasındaki performans grafiği için: kullanıcının bitmiş
// haftalardaki gerçek (çarpanlı) toplam puanlarının zaman serisi.
export async function fetchUserWeeklySeries(userId: string): Promise<WeeklyPoint[]> {
  const { data, error } = await supabase
    .from("user_gameweek_scores")
    .select("points, gameweeks(week_number)")
    .eq("user_id", userId);

  if (error || !data) return [];

  const series = data.map((row) => {
    const gwRel = row.gameweeks as unknown as
      | { week_number: number }
      | { week_number: number }[];
    const gw = Array.isArray(gwRel) ? gwRel[0] : gwRel;
    return { weekNumber: gw?.week_number ?? 0, points: row.points as number };
  });

  series.sort((a, b) => a.weekNumber - b.weekNumber);
  return series;
}
