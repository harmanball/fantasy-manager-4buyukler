import { supabase } from "./supabase";

export interface TeamGameweekPlayerPoints {
  name: string;
  points: number;
  minutes: number;
  isMotm: boolean;
}

// Fikstür kartına tıklandığında açılan panelde kullanılır — o takımın o
// haftaki tüm oyuncularını, aldıkları puana göre azalan sırada döndürür.
export async function fetchTeamGameweekPoints(
  gameweekId: number,
  team: string
): Promise<TeamGameweekPlayerPoints[]> {
  const { data, error } = await supabase
    .from("player_stats")
    .select("points, minutes, is_motm, players(name, team)")
    .eq("gameweek_id", gameweekId);

  if (error || !data) return [];

  const rows = data
    .map((row) => {
      const playerRel = row.players as unknown as
        | { name: string; team: string }
        | { name: string; team: string }[];
      const player = Array.isArray(playerRel) ? playerRel[0] : playerRel;
      return {
        name: player?.name ?? "?",
        team: player?.team ?? "",
        points: (row.points as number) ?? 0,
        minutes: (row.minutes as number) ?? 0,
        isMotm: !!row.is_motm,
      };
    })
    .filter((r) => r.team === team);

  rows.sort((a, b) => b.points - a.points);

  return rows.map(({ name, points, minutes, isMotm }) => ({
    name,
    points,
    minutes,
    isMotm,
  }));
}
