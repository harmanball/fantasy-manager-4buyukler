import { supabase } from "./supabase";
import { TeamCode } from "./teams";
import { Position } from "./players";

export interface TeamOfWeekPlayer {
  id: string;
  name: string;
  team: TeamCode;
  position: Position;
  points: number;
  isMotm: boolean;
}

const SLOTS_PER_POSITION: Record<Position, number> = {
  GK: 1,
  DEF: 4,
  MID: 3,
  FWD: 3,
};

export async function fetchTeamOfWeek(gameweekId: number): Promise<TeamOfWeekPlayer[]> {
  const { data: stats, error } = await supabase
    .from("player_stats")
    .select("player_id, points, is_motm, players(name, position, teams(short_code))")
    .eq("gameweek_id", gameweekId)
    .order("points", { ascending: false });

  if (error || !stats) return [];

  const byPosition: Record<Position, TeamOfWeekPlayer[]> = {
    GK: [],
    DEF: [],
    MID: [],
    FWD: [],
  };

  for (const row of stats) {
    const playerRel = row.players as unknown as
      | { name: string; position: Position; teams: { short_code: TeamCode } | { short_code: TeamCode }[] }
      | { name: string; position: Position; teams: { short_code: TeamCode } | { short_code: TeamCode }[] }[];
    const player = Array.isArray(playerRel) ? playerRel[0] : playerRel;
    if (!player) continue;
    const teamRel = player.teams;
    const teamCode = Array.isArray(teamRel) ? teamRel[0]?.short_code : teamRel?.short_code;
    if (!teamCode) continue;

    const pos = player.position;
    if (byPosition[pos].length < SLOTS_PER_POSITION[pos]) {
      byPosition[pos].push({
        id: row.player_id as string,
        name: player.name,
        team: teamCode,
        position: pos,
        points: row.points as number,
        isMotm: row.is_motm as boolean,
      });
    }
  }

  return [...byPosition.FWD, ...byPosition.MID, ...byPosition.DEF, ...byPosition.GK];
}
