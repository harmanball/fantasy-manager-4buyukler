import { supabase } from "./supabase";
import { fetchTeamOfWeek } from "./teamOfWeek";

// "Alınabilecek en yüksek puan": o haftanın istatistikleriyle kurulabilecek en iyi 11
// (Haftanın Takımı ile AYNI seçim: geçerli diziliş + takım limiti) ve bu 11'in en
// yüksek puanlı oyuncusu kaptan olarak çarpanla sayılır.
// Biten haftalar değişmediği için sonuçlar sayfa açık kaldığı sürece önbellekte tutulur.
const cache = new Map<number, number | null>();
let captainMultCache: number | null = null;

async function getCaptainMult(): Promise<number> {
  if (captainMultCache !== null) return captainMultCache;
  const { data } = await supabase
    .from("game_settings")
    .select("value")
    .eq("key", "captain_multiplier")
    .maybeSingle();
  captainMultCache = (data?.value as number | undefined) ?? 2;
  return captainMultCache;
}

export async function fetchMaxPossibleScore(gameweekId: number): Promise<number | null> {
  if (cache.has(gameweekId)) return cache.get(gameweekId)!;
  const team = await fetchTeamOfWeek(gameweekId);
  if (team.players.length < 11) return null; // hafta henüz yarım girilmiş olabilir: önbelleğe alma
  const mult = await getCaptainMult();
  const sum = team.players.reduce((s, p) => s + p.points, 0);
  const best = Math.max(...team.players.map((p) => p.points));
  const result = sum + best * (mult - 1);
  cache.set(gameweekId, result);
  return result;
}

// Grafik için: hafta numarası -> o haftanın alınabilecek en yüksek puanı.
export async function fetchWeeklyMaxSeries(weekNumbers: number[]): Promise<Record<number, number>> {
  if (weekNumbers.length === 0) return {};
  const { data } = await supabase
    .from("gameweeks")
    .select("id, week_number")
    .in("week_number", weekNumbers);
  const out: Record<number, number> = {};
  await Promise.all(
    (data ?? []).map(async (g) => {
      const v = await fetchMaxPossibleScore(g.id as number);
      if (v !== null) out[g.week_number as number] = v;
    })
  );
  return out;
}
