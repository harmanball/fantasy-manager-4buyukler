import { supabase } from "./supabase";

export interface PlayerPointsBreakdown {
  player_id: string;
  name: string;
  team: string;
  position: string;
  mac_sayisi: number;
  oynama_puani: number;
  gol_puani: number;
  asist_puani: number;
  temiz_kale_puani: number;
  kart_puani: number;
  kk_gol_puani: number;
  pen_kacan_puani: number;
  mac_puani_bonusu: number;
  toplam_puan: number;
}

export async function fetchPlayerPointsBreakdown(): Promise<PlayerPointsBreakdown[]> {
  const { data, error } = await supabase
    .from("player_points_breakdown")
    .select("*")
    .order("toplam_puan", { ascending: false });

  if (error) {
    console.error("Puan dökümü çekilemedi:", error.message);
    return [];
  }
  return data ?? [];
}

// Kadro kurma ekranında oyuncu adının yanında göstermek için: playerId -> toplam puan
// Kadro kurma ekranında "geçen hafta bu oyuncu kaç puan kazandırdı" bilgisi için
export async function fetchLastFinishedGameweekPoints(): Promise<{
  gameweekId: number | null;
  gameweekName: string | null;
  map: Record<string, number>;
}> {
  const { data: gw } = await supabase
    .from("gameweeks")
    .select("id, week_number, name")
    .eq("status", "finished")
    .order("week_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!gw) return { gameweekId: null, gameweekName: null, map: {} };

  const { data, error } = await supabase
    .from("player_stats")
    .select("player_id, points")
    .eq("gameweek_id", gw.id);

  if (error) {
    console.error("Geçen hafta puanları çekilemedi:", error.message);
    return { gameweekId: gw.id, gameweekName: gw.name, map: {} };
  }

  const map: Record<string, number> = {};
  for (const row of data ?? []) {
    map[row.player_id as string] = row.points as number;
  }
  return { gameweekId: gw.id, gameweekName: gw.name, map };
}

export async function fetchPlayerPointsMap(): Promise<Record<string, number>> {
  const { data, error } = await supabase
    .from("player_points_breakdown")
    .select("player_id, toplam_puan");

  if (error) {
    console.error("Puan haritası çekilemedi:", error.message);
    return {};
  }
  const map: Record<string, number> = {};
  for (const row of data ?? []) {
    map[row.player_id as string] = row.toplam_puan as number;
  }
  return map;
}

// Futbolcu Puanları sayfasındaki hafta filtresi için: tek bir haftada
// TÜM oyuncuların kriter bazlı puan dökümü (Genel Toplam view'iyle aynı şekilde)
export async function fetchGameweekPlayersBreakdown(
  gameweekId: number
): Promise<PlayerPointsBreakdown[]> {
  const { data: stats, error: statsErr } = await supabase
    .from("player_stats")
    .select(
      "player_id, minutes, goals, assists, clean_sheet, yellow_card, red_card, own_goals, penalty_missed, match_rating, points"
    )
    .eq("gameweek_id", gameweekId);

  if (statsErr || !stats || stats.length === 0) return [];

  const playerIds = stats.map((s) => s.player_id as string);
  const { data: playersData } = await supabase
    .from("players")
    .select("id, name, position, teams(short_code)")
    .in("id", playerIds);

  const playerMap = new Map((playersData ?? []).map((p) => [p.id as string, p]));

  const { data: rules } = await supabase
    .from("scoring_rules")
    .select("stat_key, position, points");
  const { data: settings } = await supabase.from("game_settings").select("key, value");

  function rule(key: string, pos: string): number {
    return (
      (rules ?? []).find((r) => r.stat_key === key && r.position === pos)?.points ?? 0
    );
  }
  function setting(key: string): number {
    return (settings ?? []).find((s) => s.key === key)?.value ?? 0;
  }
  const threshold = setting("rating_bonus_threshold");
  const bonusPoints = setting("rating_bonus_points");

  const rows: PlayerPointsBreakdown[] = stats.map((s) => {
    const player = playerMap.get(s.player_id as string);
    const teamRel = player?.teams as unknown as
      | { short_code: string }
      | { short_code: string }[];
    const teamCode = Array.isArray(teamRel) ? teamRel[0]?.short_code : teamRel?.short_code;
    const position = (player?.position as string) ?? "?";
    const minutes = s.minutes as number;

    const oynama =
      minutes > 0 ? rule(minutes >= 60 ? "played_60_plus" : "played_under_60", "ALL") : 0;
    const gol = (s.goals as number) * rule("goals", position);
    const asist = (s.assists as number) * rule("assists", "ALL");
    const temizKale = s.clean_sheet && minutes >= 60 ? rule("clean_sheet", position) : 0;
    const kart =
      (s.yellow_card as number) * rule("yellow_card", "ALL") +
      (s.red_card as number) * rule("red_card", "ALL");
    const kkGol = (s.own_goals as number) * rule("own_goal", "ALL");
    const penKacan = (s.penalty_missed as number) * rule("penalty_missed", "ALL");
    const macBonus =
      s.match_rating !== null && (s.match_rating as number) >= threshold ? bonusPoints : 0;

    return {
      player_id: s.player_id as string,
      name: (player?.name as string) ?? "?",
      team: teamCode ?? "?",
      position,
      mac_sayisi: minutes > 0 ? 1 : 0,
      oynama_puani: oynama,
      gol_puani: gol,
      asist_puani: asist,
      temiz_kale_puani: temizKale,
      kart_puani: kart,
      kk_gol_puani: kkGol,
      pen_kacan_puani: penKacan,
      mac_puani_bonusu: macBonus,
      toplam_puan: s.points as number,
    };
  });

  rows.sort((a, b) => b.toplam_puan - a.toplam_puan);
  return rows;
}
