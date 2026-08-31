import { supabase } from "./supabase";

export type TrackedTeamCode = "GS" | "FB" | "BJK" | "TS";

export interface TrackedFixture {
  gameweekId: number;
  team: TrackedTeamCode;
  opponent: string;
  isHome: boolean;
  date: string;
  time: string;
  venue: string | null;
  teamScore: number | null;
  opponentScore: number | null;
}

// Kadro sayfasındaki "4 Büyükler Kimlerle Oynuyor" kartının okuduğu yer
// burası — artık her seferinde dış kaynağa (ESPN) canlı gitmiyor, sadece
// hafta açılırken bir kere kaydedilmiş "enstantane" veriyi (gameweek_fixtures)
// okuyor. Bu sayede: (1) hafta boyunca sabit kalıyor, (2) admin skoru
// girdiğinde otomatik yansıyor, (3) "Haftayı Kapat" ile yeni haftaya geçtiğinde
// otomatik güncelleniyor.
export async function fetchGameweekFixturesFromDb(): Promise<TrackedFixture[]> {
  const { data: gw } = await supabase
    .from("gameweeks")
    .select("id")
    .in("status", ["open", "upcoming"])
    .order("week_number", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!gw) return [];

  const { data, error } = await supabase
    .from("gameweek_fixtures")
    .select(
      "gameweek_id, team, opponent, is_home, match_date, match_time, venue, team_score, opponent_score"
    )
    .eq("gameweek_id", gw.id);

  if (error || !data) return [];

  const fixtures: TrackedFixture[] = data.map((row) => ({
    gameweekId: row.gameweek_id as number,
    team: row.team as TrackedTeamCode,
    opponent: row.opponent as string,
    isHome: row.is_home as boolean,
    date: row.match_date as string,
    time: (row.match_time as string) ?? "",
    venue: row.venue as string | null,
    teamScore: row.team_score as number | null,
    opponentScore: row.opponent_score as number | null,
  }));

  fixtures.sort((a, b) => {
    const aKey = `${a.date}T${a.time || "00:00"}`;
    const bKey = `${b.date}T${b.time || "00:00"}`;
    return aKey.localeCompare(bKey);
  });

  return fixtures;
}
