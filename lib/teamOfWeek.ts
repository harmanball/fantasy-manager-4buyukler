import { supabase } from "./supabase";
import { Formation, FORMATIONS, FORMATION_LAYOUT, TeamCode } from "./teams";
import { Position } from "./players";

export interface TeamOfWeekPlayer {
  id: string;
  name: string;
  team: TeamCode;
  position: Position;
  points: number;
  isMotm: boolean;
}

export interface TeamOfWeekResult {
  formation: Formation;
  players: TeamOfWeekPlayer[];
}

const EMPTY_RESULT: TeamOfWeekResult = { formation: "4-3-3", players: [] };

// O haftanın "Haftanın Takımı"nı kurar. Sabit bir dizilişe (örn. hep 4-3-3)
// ZORLAMAZ — geçerli dizilişler arasından, o haftaki gerçek puanlarla en
// yüksek toplamı veren kombinasyonu seçer. Kaleci her zaman zorunlu (1
// kişi); DEF/MID/FWD sayıları ise seçilen dizilişe göre değişir.
export async function fetchTeamOfWeek(gameweekId: number): Promise<TeamOfWeekResult> {
  const { data: stats, error } = await supabase
    .from("player_stats")
    .select("player_id, points, is_motm, players(name, position, teams(short_code))")
    .eq("gameweek_id", gameweekId)
    .order("points", { ascending: false });

  if (error || !stats) return EMPTY_RESULT;

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

    byPosition[player.position].push({
      id: row.player_id as string,
      name: player.name,
      team: teamCode,
      position: player.position,
      points: row.points as number,
      isMotm: row.is_motm as boolean,
    });
  }

  // Sorgu zaten puana göre azalan geldi, ama mevkiye bölünce sırayı
  // garantiye almak için tekrar sıralıyoruz.
  (["GK", "DEF", "MID", "FWD"] as Position[]).forEach((pos) =>
    byPosition[pos].sort((a, b) => b.points - a.points)
  );

  if (byPosition.GK.length === 0) return EMPTY_RESULT;
  const gk = byPosition.GK[0];

  let best: {
    formation: Formation;
    total: number;
    def: TeamOfWeekPlayer[];
    mid: TeamOfWeekPlayer[];
    fwd: TeamOfWeekPlayer[];
  } | null = null;

  for (const formation of FORMATIONS) {
    const layout = FORMATION_LAYOUT[formation];
    if (
      byPosition.DEF.length < layout.DEF ||
      byPosition.MID.length < layout.MID ||
      byPosition.FWD.length < layout.FWD
    ) {
      continue; // o hafta bu dizilişi dolduracak kadar oyuncu yok
    }
    const def = byPosition.DEF.slice(0, layout.DEF);
    const mid = byPosition.MID.slice(0, layout.MID);
    const fwd = byPosition.FWD.slice(0, layout.FWD);
    const total =
      gk.points +
      def.reduce((s, p) => s + p.points, 0) +
      mid.reduce((s, p) => s + p.points, 0) +
      fwd.reduce((s, p) => s + p.points, 0);

    if (!best || total > best.total) {
      best = { formation, total, def, mid, fwd };
    }
  }

  // Hiçbir geçerli diziliş dolmuyorsa (çok erken bir hafta, veri az) bile
  // en azından kaleciyi göster — boş sayfa yerine.
  if (!best) return { formation: "4-3-3", players: [gk] };

  return {
    formation: best.formation,
    players: [...best.fwd, ...best.mid, ...best.def, gk],
  };
}
