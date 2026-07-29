import { supabase } from "./supabase";

export interface PlayerGameweekBreakdown {
  name: string;
  team: string;
  position: string;
  minutes: number;
  matchRating: number | null;
  isMotm: boolean;
  oynamaPuani: number;
  golPuani: number;
  asistPuani: number;
  temizKalePuani: number;
  kartPuani: number;
  kkGolPuani: number;
  penKacanPuani: number;
  macPuaniBonusu: number;
  toplamPuan: number;
}

export async function fetchPlayerGameweekBreakdown(
  playerId: string,
  gameweekId: number
): Promise<PlayerGameweekBreakdown | null> {
  const { data: stat, error: statErr } = await supabase
    .from("player_stats")
    .select(
      "minutes, goals, assists, clean_sheet, yellow_card, red_card, own_goals, penalty_missed, match_rating, is_motm, points"
    )
    .eq("player_id", playerId)
    .eq("gameweek_id", gameweekId)
    .maybeSingle();

  if (statErr || !stat) return null;

  const { data: player } = await supabase
    .from("players")
    .select("name, position, teams(short_code)")
    .eq("id", playerId)
    .single();

  const teamRel = player?.teams as unknown as
    | { short_code: string }
    | { short_code: string }[];
  const teamCode = Array.isArray(teamRel) ? teamRel[0]?.short_code : teamRel?.short_code;
  const position = (player?.position as string) ?? "?";

  const { data: rules } = await supabase.from("scoring_rules").select("stat_key, position, points");
  const { data: settings } = await supabase.from("game_settings").select("key, value");

  function rule(key: string, pos: string): number {
    return (
      (rules ?? []).find((r) => r.stat_key === key && r.position === pos)?.points ?? 0
    );
  }
  function setting(key: string): number {
    return (settings ?? []).find((s) => s.key === key)?.value ?? 0;
  }

  const minutes = stat.minutes as number;
  const oynamaPuani =
    minutes > 0 ? rule(minutes >= 60 ? "played_60_plus" : "played_under_60", "ALL") : 0;
  const golPuani = (stat.goals as number) * rule("goals", position);
  const asistPuani = (stat.assists as number) * rule("assists", "ALL");
  const temizKalePuani =
    stat.clean_sheet && minutes >= 60 ? rule("clean_sheet", position) : 0;
  const kartPuani =
    (stat.yellow_card as number) * rule("yellow_card", "ALL") +
    (stat.red_card as number) * rule("red_card", "ALL");
  const kkGolPuani = (stat.own_goals as number) * rule("own_goal", "ALL");
  const penKacanPuani = (stat.penalty_missed as number) * rule("penalty_missed", "ALL");
  const threshold = setting("rating_bonus_threshold");
  const bonusPoints = setting("rating_bonus_points");
  const macPuaniBonusu =
    stat.match_rating !== null && (stat.match_rating as number) >= threshold ? bonusPoints : 0;

  return {
    name: (player?.name as string) ?? "?",
    team: teamCode ?? "?",
    position,
    minutes,
    matchRating: stat.match_rating as number | null,
    isMotm: stat.is_motm as boolean,
    oynamaPuani,
    golPuani,
    asistPuani,
    temizKalePuani,
    kartPuani,
    kkGolPuani,
    penKacanPuani,
    macPuaniBonusu,
    toplamPuan: stat.points as number,
  };
}
