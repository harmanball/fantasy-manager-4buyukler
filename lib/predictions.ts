import { supabase } from "./supabase";
import { TrackedFixture, TrackedTeamCode } from "./fixtures";

export interface Prediction {
  team: TrackedTeamCode;
  teamGoals: number;
  opponentGoals: number;
}

function norm(s: string): string {
  return s
    .toLocaleLowerCase("tr")
    .replace(/ş/g, "s")
    .replace(/ç/g, "c")
    .replace(/ğ/g, "g")
    .replace(/ı/g, "i")
    .replace(/ö/g, "o")
    .replace(/ü/g, "u");
}

const NAME_TO_CODE: [string, TrackedTeamCode][] = [
  ["galatasaray", "GS"],
  ["fenerbahce", "FB"],
  ["besiktas", "BJK"],
  ["trabzonspor", "TS"],
];

function opponentCode(name: string): TrackedTeamCode | null {
  const n = norm(name);
  for (const [key, code] of NAME_TO_CODE) {
    if (n.includes(key)) return code;
  }
  return null;
}

// 4 büyükten ikisi birbiriyle oynuyorsa (örn. Trabzonspor - Beşiktaş) fikstür
// listesinde aynı maç iki satır olarak yer alır. Tahmin için tek maça
// indirilir: rakibi de 4 büyükten biriyse, sadece alfabetik olarak önce gelen
// takımın satırı tutulur (BJK < FB < GS < TS). Karşı satır yoksa dokunulmaz.
export function dedupeFixtures(list: TrackedFixture[]): TrackedFixture[] {
  return list.filter((f) => {
    const oppCode = opponentCode(f.opponent);
    if (!oppCode) return true;
    const mirrorExists = list.some((x) => x.team === oppCode && x.date === f.date);
    if (!mirrorExists) return true;
    return f.team < oppCode;
  });
}

export async function fetchUserPredictions(
  userId: string,
  gameweekId: number
): Promise<Record<string, Prediction>> {
  const { data, error } = await supabase
    .from("fixture_predictions")
    .select("team, team_goals, opponent_goals")
    .eq("user_id", userId)
    .eq("gameweek_id", gameweekId);
  if (error || !data) return {};
  const map: Record<string, Prediction> = {};
  for (const row of data) {
    map[row.team as string] = {
      team: row.team as TrackedTeamCode,
      teamGoals: row.team_goals as number,
      opponentGoals: row.opponent_goals as number,
    };
  }
  return map;
}

export async function savePrediction(
  userId: string,
  gameweekId: number,
  team: TrackedTeamCode,
  teamGoals: number,
  opponentGoals: number
): Promise<string | null> {
  const { error } = await supabase.from("fixture_predictions").upsert(
    {
      user_id: userId,
      gameweek_id: gameweekId,
      team,
      team_goals: teamGoals,
      opponent_goals: opponentGoals,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,gameweek_id,team" }
  );
  return error ? error.message : null;
}

export async function deletePrediction(
  userId: string,
  gameweekId: number,
  team: TrackedTeamCode
): Promise<string | null> {
  const { error } = await supabase
    .from("fixture_predictions")
    .delete()
    .eq("user_id", userId)
    .eq("gameweek_id", gameweekId)
    .eq("team", team);
  return error ? error.message : null;
}
