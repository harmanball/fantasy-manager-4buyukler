import { supabase } from "./supabase";
import { fetchTeamOfWeek } from "./teamOfWeek";

// "Bu hafta alınabilecek en yüksek puan": o haftanın istatistikleriyle kurulabilecek
// en iyi 11 (Haftanın Takımı ile AYNI seçim: geçerli diziliş + takım limiti) ve bu
// 11'in en yüksek puanlı oyuncusu kaptan olarak çarpanla sayılır.
export async function fetchMaxPossibleScore(gameweekId: number): Promise<number | null> {
  const team = await fetchTeamOfWeek(gameweekId);
  if (team.players.length < 11) return null;

  const { data: settings } = await supabase
    .from("game_settings")
    .select("value")
    .eq("key", "captain_multiplier")
    .maybeSingle();
  const captainMult = (settings?.value as number | undefined) ?? 2;

  const sum = team.players.reduce((s, p) => s + p.points, 0);
  const best = Math.max(...team.players.map((p) => p.points));
  return sum + best * (captainMult - 1);
}
