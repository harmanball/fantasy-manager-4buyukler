import { supabase } from "./supabase";
import { DEFAULT_COLOR1 } from "./emblems";

export interface TeamProgress {
  userId: string;
  name: string;
  color: string;
  weekly: Record<number, number>; // hafta numarası -> o haftaki puan
}

// Onaylı tüm takımların haftalık puanları ("Puan yarışı" grafiği için).
export async function fetchTeamsProgress(): Promise<{ teams: TeamProgress[]; lastWeek: number }> {
  const [{ data: profiles }, { data: scores }] = await Promise.all([
    supabase.from("profiles").select("id, username, squad_name, team_color1").eq("approved", true),
    supabase.from("user_gameweek_scores").select("user_id, points, gameweeks(week_number)").range(0, 9999),
  ]);

  const map = new Map<string, TeamProgress>();
  for (const p of profiles ?? []) {
    map.set(p.id as string, {
      userId: p.id as string,
      name: (p.squad_name as string | null) || (p.username as string),
      color: (p.team_color1 as string | null) || DEFAULT_COLOR1,
      weekly: {},
    });
  }

  let lastWeek = 0;
  for (const row of scores ?? []) {
    const team = map.get(row.user_id as string);
    if (!team) continue;
    const gwRel = row.gameweeks as unknown as { week_number: number } | { week_number: number }[] | null;
    const gw = Array.isArray(gwRel) ? gwRel[0] : gwRel;
    const wn = gw?.week_number;
    if (!wn) continue;
    team.weekly[wn] = (team.weekly[wn] ?? 0) + ((row.points as number) ?? 0);
    if (wn > lastWeek) lastWeek = wn;
  }
  return { teams: [...map.values()], lastWeek };
}
