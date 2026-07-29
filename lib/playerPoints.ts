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
