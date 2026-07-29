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
