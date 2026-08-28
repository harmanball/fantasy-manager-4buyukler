import { supabase } from "./supabase";
import { Formation, FORMATIONS, FORMATION_LAYOUT, TeamCode, TEAM_LIMIT } from "./teams";
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

// Mevkiye göre puana-azalan-sıralı bir havuzdan, TAKIM LİMİTİNİ (bir
// takımdan en fazla TEAM_LIMIT kişi — kadro kurma ekranındaki AYNI kural)
// aşmadan, en yüksek puanlı `count` kişiyi seçer. Bir takım limite
// ulaşınca o takımdan sıradaki oyuncu atlanır, havuzdaki bir sonrakine
// geçilir. teamCounts parametresi çağrılar arası PAYLAŞILIR — böylece
// örneğin DEF'te 3 kişi alınan bir takım, MID/FWD seçiminde de artık
// hiç alınmaz (limit tüm 11'e göre, tek pozisyona göre değil).
function pickPositionGreedy(
  pool: TeamOfWeekPlayer[],
  count: number,
  teamCounts: Record<string, number>
): TeamOfWeekPlayer[] | null {
  const picked: TeamOfWeekPlayer[] = [];
  for (const p of pool) {
    if (picked.length >= count) break;
    const current = teamCounts[p.team] ?? 0;
    if (current >= TEAM_LIMIT) continue;
    picked.push(p);
    teamCounts[p.team] = current + 1;
  }
  return picked.length === count ? picked : null;
}

// Mevkiye göre puana-azalan-sıralı oyuncu listelerinden en iyi 11'i kurar.
// Sabit bir dizilişe (örn. hep 4-3-3) ZORLAMAZ — geçerli dizilişler
// arasından, elindeki puanlarla en yüksek toplamı veren kombinasyonu
// seçer. Kaleci her zaman zorunlu (1 kişi); DEF/MID/FWD sayıları ise
// seçilen dizilişe göre değişir. Hem tek hafta hem genel toplam view'i
// bu ortak mantığı kullanır.
//
// Oyun kuralı gereği bir takımdan en fazla TEAM_LIMIT kişi olabilir —
// bu, kadro kurma ekranındaki kısıtla AYNI. Seçim GK -> DEF -> MID -> FWD
// sırasıyla açgözlü (greedy) yapılır; bu, matematiksel olarak mutlak
// en yüksek toplamı garanti etmez (ör. bazı nadir durumlarda farklı bir
// sıralama daha yüksek toplam verebilir) ama kadro kurma ekranındaki
// aynı basit mantığı izler ve pratikte neredeyse her zaman en iyi ya da
// en iyiye çok yakın kombinasyonu bulur.
function pickBestXI(byPosition: Record<Position, TeamOfWeekPlayer[]>): TeamOfWeekResult {
  if (byPosition.GK.length === 0) return EMPTY_RESULT;

  let best: {
    formation: Formation;
    total: number;
    gk: TeamOfWeekPlayer;
    def: TeamOfWeekPlayer[];
    mid: TeamOfWeekPlayer[];
    fwd: TeamOfWeekPlayer[];
  } | null = null;

  for (const formation of FORMATIONS) {
    const layout = FORMATION_LAYOUT[formation];
    const needed: Record<Position, number> = {
      GK: 1,
      DEF: layout.DEF,
      MID: layout.MID,
      FWD: layout.FWD,
    };

    // Tüm adaylar (mevkiden bağımsız) TEK bir havuzda, puana göre azalan
    // sırayla birleştirilir. Seçim bu birleşik sırayla yapılır — böylece
    // örn. çok yüksek puanlı bir forvet, sırf DEF/GK önce "işlendiği" için
    // değil, GERÇEKTEN en yüksek puanlı olduğu için önceliği alır. Önceki
    // sürümde seçim mevki mevki (önce GK, sonra DEF, ...) yapıldığından,
    // bir takımın en iyi oyuncuları erken mevkilerde kotayı doldurup daha
    // sonraki mevkideki (örn. forvet) gerçekten en yüksek puanlı oyuncuyu
    // haksız yere dışarıda bırakabiliyordu.
    const allCandidates = [
      ...byPosition.GK,
      ...byPosition.DEF,
      ...byPosition.MID,
      ...byPosition.FWD,
    ].sort((a, b) => b.points - a.points);

    const teamCounts: Record<string, number> = {};
    const picked: Record<Position, TeamOfWeekPlayer[]> = {
      GK: [],
      DEF: [],
      MID: [],
      FWD: [],
    };

    for (const p of allCandidates) {
      if (picked[p.position].length >= needed[p.position]) continue;
      const current = teamCounts[p.team] ?? 0;
      if (current >= TEAM_LIMIT) continue;
      picked[p.position].push(p);
      teamCounts[p.team] = current + 1;
    }

    if (
      picked.GK.length < 1 ||
      picked.DEF.length < layout.DEF ||
      picked.MID.length < layout.MID ||
      picked.FWD.length < layout.FWD
    ) {
      continue; // takım limitiyle birlikte bu diziliş doldurulamadı
    }

    const total =
      picked.GK[0].points +
      picked.DEF.reduce((s, x) => s + x.points, 0) +
      picked.MID.reduce((s, x) => s + x.points, 0) +
      picked.FWD.reduce((s, x) => s + x.points, 0);

    if (!best || total > best.total) {
      best = {
        formation,
        total,
        gk: picked.GK[0],
        def: picked.DEF,
        mid: picked.MID,
        fwd: picked.FWD,
      };
    }
  }

  // Hiçbir geçerli diziliş takım limitiyle birlikte dolmuyorsa (çok erken
  // bir hafta, veri az) bile en azından kaleciyi göster — boş sayfa yerine.
  if (!best) return { formation: "4-3-3", players: [byPosition.GK[0]] };

  return {
    formation: best.formation,
    players: [...best.fwd, ...best.mid, ...best.def, best.gk],
  };
}

// Belirli bir haftanın "Haftanın Takımı"nı kurar (o haftaki puanlarla).
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

  (["GK", "DEF", "MID", "FWD"] as Position[]).forEach((pos) =>
    byPosition[pos].sort((a, b) => b.points - a.points)
  );

  return pickBestXI(byPosition);
}

// Sezon başından bu yana biriken GENEL TOPLAM puanlara göre en iyi 11'i
// kurar. Tekil bir hafta yerine "Futbolcu Puanları" ve "Sıralama"
// sayfalarındaki "Genel Toplam" görünümüyle aynı kaynağı (player_points_breakdown)
// kullanır. Maçın Yıldızı tekil bir maça ait bir ödül olduğu için burada
// anlamsızdır, bu yüzden isMotm hep false döner.
export async function fetchOverallTeamOfWeek(): Promise<TeamOfWeekResult> {
  const { data, error } = await supabase
    .from("player_points_breakdown")
    .select("player_id, name, team, position, toplam_puan")
    .order("toplam_puan", { ascending: false });

  if (error || !data) return EMPTY_RESULT;

  const byPosition: Record<Position, TeamOfWeekPlayer[]> = {
    GK: [],
    DEF: [],
    MID: [],
    FWD: [],
  };

  for (const row of data) {
    const pos = row.position as Position;
    if (!byPosition[pos]) continue;
    byPosition[pos].push({
      id: row.player_id as string,
      name: row.name as string,
      team: row.team as TeamCode,
      position: pos,
      points: row.toplam_puan as number,
      isMotm: false,
    });
  }

  (["GK", "DEF", "MID", "FWD"] as Position[]).forEach((pos) =>
    byPosition[pos].sort((a, b) => b.points - a.points)
  );

  return pickBestXI(byPosition);
}
