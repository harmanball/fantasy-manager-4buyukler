import { supabase } from "./supabase";
import { EmblemId, DEFAULT_EMBLEM, DEFAULT_COLOR1, DEFAULT_COLOR2 } from "./emblems";
import { fetchIsTransferWindowOpen } from "./transferWindow";

// ───────────────────────── Veri modeli ─────────────────────────

export interface GazeteTeam {
  userId: string;
  name: string;
  emblem: EmblemId;
  color1: string;
  color2: string;
}

interface WeekInfo {
  id: number;
  weekNumber: number;
  name: string | null;
}

interface PickSet {
  playerIds: string[];
  captainId: string | null;
}

interface StatRow {
  points: number;
  minutes: number;
  motm: boolean;
  yellow: number;
  red: number;
}

interface PlayerInfo {
  id: string;
  name: string;
  club: string; // GS / FB / BJK / TS
  position: string; // GK / DEF / MID / FWD
}

export interface GazeteData {
  weeks: WeekInfo[]; // biten haftalar, eskiden yeniye
  teams: Map<string, GazeteTeam>;
  scores: Map<string, Map<number, number>>; // kullanıcı -> hafta -> puan
  picks: Map<string, Map<number, PickSet>>; // kullanıcı -> hafta -> kadro
  stats: Map<number, Map<string, StatRow>>; // hafta -> oyuncu -> istatistik
  players: Map<string, PlayerInfo>;
  captainMult: number;
  // Tahmin Yap verisi (biten haftalar)
  fixtures: Map<number, FixtureResult[]>; // hafta -> maç sonuçları
  predictions: Map<string, Map<number, Map<string, { tg: number; og: number }>>>; // kullanıcı -> hafta -> takım -> tahmin
  // Transfer penceresi kapandıysa, şu an oynanan (henüz bitmemiş) haftanın kadroları
  lockedWeek: { weekNumber: number; picks: Map<string, PickSet> } | null;
  // Şu an açık olan hafta (tahmin raporu için; fikstür ve tahminler dahil)
  currentWeek: { id: number; weekNumber: number } | null;
}

interface FixtureResult {
  team: string; // GS / FB / BJK / TS
  opponent: string;
  isHome: boolean;
  ts: number | null; // takımın golü
  os: number | null; // rakibin golü
}

type Row = Record<string, unknown>;

// Supabase tek sorguda en fazla 1000 satır verir — sayfa sayfa çeker.
async function fetchAll(
  table: string,
  columns: string,
  orderCols: string[]
): Promise<Row[]> {
  const out: Row[] = [];
  const PAGE = 1000;
  for (let from = 0; ; from += PAGE) {
    let q = supabase.from(table).select(columns).order(orderCols[0]);
    for (const c of orderCols.slice(1)) q = q.order(c);
    const { data, error } = await q.range(from, from + PAGE - 1);
    if (error || !data) break;
    const rows = data as unknown as Row[];
    out.push(...rows);
    if (rows.length < PAGE) break;
  }
  return out;
}

export async function loadGazeteData(): Promise<GazeteData> {
  const { data: gwData } = await supabase
    .from("gameweeks")
    .select("id, week_number, name, status")
    .eq("status", "finished")
    .order("week_number", { ascending: true });

  const weeks: WeekInfo[] = ((gwData ?? []) as Row[]).map((g) => ({
    id: g.id as number,
    weekNumber: g.week_number as number,
    name: (g.name as string | null) ?? null,
  }));

  const empty: GazeteData = {
    weeks,
    teams: new Map(),
    scores: new Map(),
    picks: new Map(),
    stats: new Map(),
    players: new Map(),
    captainMult: 2,
    fixtures: new Map(),
    predictions: new Map(),
    lockedWeek: null,
    currentWeek: null,
  };
  if (weeks.length === 0) return empty;

  const [profiles, scoreRows, pickRows, statRows, playerRows, settingRows, fixtureRows, predRows] =
    await Promise.all([
      fetchAll(
        "profiles",
        "id, username, squad_name, emblem, team_color1, team_color2",
        ["id"]
      ),
      fetchAll("user_gameweek_scores", "user_id, gameweek_id, points", [
        "gameweek_id",
        "user_id",
      ]),
      fetchAll("user_picks", "user_id, gameweek_id, player_id, is_captain", [
        "gameweek_id",
        "user_id",
        "player_id",
      ]),
      fetchAll(
        "player_stats",
        "player_id, gameweek_id, points, minutes, is_motm, yellow_card, red_card",
        ["gameweek_id", "player_id"]
      ),
      fetchAll("players", "id, name, position, teams(short_code)", ["id"]),
      supabase.from("game_settings").select("key, value").eq("key", "captain_multiplier"),
      fetchAll("gameweek_fixtures", "gameweek_id, team, opponent, is_home, team_score, opponent_score", [
        "gameweek_id",
        "team",
      ]),
      fetchAll("fixture_predictions", "user_id, gameweek_id, team, team_goals, opponent_goals", [
        "gameweek_id",
        "user_id",
        "team",
      ]),
    ]);

  const finishedIds = new Set(weeks.map((w) => w.id));

  // Aynı isimli oyuncu veritabanında birden fazla kayıtsa (ör. transfer
  // güncellemesinde yeniden eklenmişse) tek oyuncu sayılır; aksi halde
  // sahiplik yüzdeleri ve "farklı oyuncu" sayıları bozulur.
  const normName = (n: string) =>
    n.toLocaleLowerCase("tr").replace(/\s+/g, " ").trim();
  const canonByName = new Map<string, string>();
  const canonById = new Map<string, string>();
  for (const r of playerRows) {
    const key = normName((r.name as string) ?? "");
    if (!canonByName.has(key)) canonByName.set(key, r.id as string);
    canonById.set(r.id as string, canonByName.get(key)!);
  }
  const canon = (id: string) => canonById.get(id) ?? id;

  const teams = new Map<string, GazeteTeam>();
  for (const p of profiles) {
    const id = p.id as string;
    teams.set(id, {
      userId: id,
      name: ((p.squad_name as string) || (p.username as string) || "Takım") as string,
      emblem: ((p.emblem as EmblemId) || DEFAULT_EMBLEM) as EmblemId,
      color1: (p.team_color1 as string) || DEFAULT_COLOR1,
      color2: (p.team_color2 as string) || DEFAULT_COLOR2,
    });
  }

  const scores = new Map<string, Map<number, number>>();
  for (const r of scoreRows) {
    const gw = r.gameweek_id as number;
    if (!finishedIds.has(gw)) continue;
    const u = r.user_id as string;
    if (!scores.has(u)) scores.set(u, new Map());
    scores.get(u)!.set(gw, (r.points as number) ?? 0);
  }

  const picks = new Map<string, Map<number, PickSet>>();
  for (const r of pickRows) {
    const gw = r.gameweek_id as number;
    if (!finishedIds.has(gw)) continue;
    const u = r.user_id as string;
    if (!picks.has(u)) picks.set(u, new Map());
    const byWeek = picks.get(u)!;
    if (!byWeek.has(gw)) byWeek.set(gw, { playerIds: [], captainId: null });
    const set = byWeek.get(gw)!;
    const pid = canon(r.player_id as string);
    if (!set.playerIds.includes(pid)) set.playerIds.push(pid);
    if (r.is_captain) set.captainId = pid;
  }

  const stats = new Map<number, Map<string, StatRow>>();
  for (const r of statRows) {
    const gw = r.gameweek_id as number;
    if (!finishedIds.has(gw)) continue;
    if (!stats.has(gw)) stats.set(gw, new Map());
    const row: StatRow = {
      points: (r.points as number) ?? 0,
      minutes: (r.minutes as number) ?? 0,
      motm: !!r.is_motm,
      yellow: (r.yellow_card as number) ?? 0,
      red: (r.red_card as number) ?? 0,
    };
    const pid = canon(r.player_id as string);
    const prev = stats.get(gw)!.get(pid);
    if (!prev || row.minutes > prev.minutes) stats.get(gw)!.set(pid, row);
  }

  const players = new Map<string, PlayerInfo>();
  for (const r of playerRows) {
    const rel = r.teams as { short_code: string } | { short_code: string }[] | null;
    const club = Array.isArray(rel) ? rel[0]?.short_code : rel?.short_code;
    players.set(r.id as string, {
      id: r.id as string,
      name: r.name as string,
      club: club ?? "?",
      position: ((r.position as string) ?? "").toUpperCase(),
    });
  }

  let openGw: Row | null = null;
  try {
    const { data: og } = await supabase
      .from("gameweeks")
      .select("id, week_number")
      .in("status", ["open", "upcoming"])
      .order("week_number", { ascending: true })
      .limit(1)
      .maybeSingle();
    openGw = (og as Row | null) ?? null;
  } catch {
    openGw = null;
  }
  const currentWeek = openGw ? { id: openGw.id as number, weekNumber: openGw.week_number as number } : null;
  const fixtureWeekIds = new Set(finishedIds);
  if (currentWeek) fixtureWeekIds.add(currentWeek.id);

  const fixtures = new Map<number, FixtureResult[]>();
  for (const r of fixtureRows) {
    const gw = r.gameweek_id as number;
    if (!fixtureWeekIds.has(gw)) continue;
    if (!fixtures.has(gw)) fixtures.set(gw, []);
    fixtures.get(gw)!.push({
      team: r.team as string,
      opponent: (r.opponent as string) ?? "?",
      isHome: r.is_home !== false,
      ts: (r.team_score as number | null) ?? null,
      os: (r.opponent_score as number | null) ?? null,
    });
  }

  const predictions = new Map<string, Map<number, Map<string, { tg: number; og: number }>>>();
  for (const r of predRows) {
    const gw = r.gameweek_id as number;
    if (!fixtureWeekIds.has(gw)) continue;
    const u = r.user_id as string;
    if (!predictions.has(u)) predictions.set(u, new Map());
    const byWeek = predictions.get(u)!;
    if (!byWeek.has(gw)) byWeek.set(gw, new Map());
    byWeek.get(gw)!.set(r.team as string, { tg: r.team_goals as number, og: r.opponent_goals as number });
  }

  // Transfer penceresi kapandıysa, şu an oynanan haftanın kadroları artık gizli değil.
  // Pencere AÇIKKEN kimsenin kadrosu gösterilmez.
  let lockedWeek: GazeteData["lockedWeek"] = null;
  try {
    if (openGw) {
      const windowOpen = await fetchIsTransferWindowOpen();
      if (!windowOpen) {
        const lockedPicks = new Map<string, PickSet>();
        for (const r of pickRows) {
          if ((r.gameweek_id as number) !== (openGw.id as number)) continue;
          const u = r.user_id as string;
          if (!lockedPicks.has(u)) lockedPicks.set(u, { playerIds: [], captainId: null });
          const set = lockedPicks.get(u)!;
          const pid = canon(r.player_id as string);
          if (!set.playerIds.includes(pid)) set.playerIds.push(pid);
          if (r.is_captain) set.captainId = pid;
        }
        if (lockedPicks.size > 0) lockedWeek = { weekNumber: openGw.week_number as number, picks: lockedPicks };
      }
    }
  } catch {
    lockedWeek = null;
  }

  const mult = ((settingRows.data ?? []) as Row[])[0]?.value;
  const captainMult = typeof mult === "number" ? mult : Number(mult ?? 2) || 2;

  return { weeks, teams, scores, picks, stats, players, captainMult, fixtures, predictions, lockedWeek, currentWeek };
}

// ───────────────────────── Gazete içeriği ─────────────────────────

export interface Part {
  text: string;
  hot?: boolean; // kırmızı vurgu
}

export interface Story {
  id: string;
  kicker: string;
  headline: Part[];
  deck?: string;
  team?: GazeteTeam;
  bigNumber?: string;
  bigLabel?: string;
  after?: string;
  bars?: { label: string; pct: number }[];
  rows?: { team: GazeteTeam; label: string; value: string }[];
  race?: { team: GazeteTeam; points: number; pct: number }[];
  quote?: Part[];
  fbars?: { label: string; pct: number; right: string; hot?: boolean }[];
  matrix?: { cols: string[]; rows: { team: GazeteTeam; cells: number[]; hiIdx: number }[] };
  table?: { head: string[]; rows: string[][] };
  full?: boolean;
}

export interface Section {
  title: string;
  stories: Story[];
}

export interface Issue {
  weekNumber: number;
  weekName: string;
  hero: Story | null;
  sections: Section[];
}

interface Entry {
  userId: string;
  value: number;
  extra?: string;
}

const CLUB_NAMES: Record<string, string> = {
  GS: "Galatasaray",
  FB: "Fenerbahçe",
  BJK: "Beşiktaş",
  TS: "Trabzonspor",
};
const CLUB_ADJ: Record<string, string> = {
  GS: "Galatasaraylı",
  FB: "Fenerbahçeli",
  BJK: "Beşiktaşlı",
  TS: "Trabzonsporlu",
};

function sortDesc(list: Entry[]): Entry[] {
  return [...list].sort((a, b) => b.value - a.value);
}
function sortAsc(list: Entry[]): Entry[] {
  return [...list].sort((a, b) => a.value - b.value);
}

interface Facts {
  collector: Entry[];
  loyal: Entry[];
  transfers: Entry[];
  bestWeek: (Entry & { weekId: number; weekLabel: string }) | null;
  bestWeekRunners: Entry[];
  weekBest: { userId: string; value: number; isRecord: boolean } | null; // sadece bu haftanın en yüksek puanı
  weekBestRunners: Entry[];
  stable: (Entry & { min: number; max: number })[];
  champions: Entry[];
  longestStreak: Map<string, number>;
  riser: (Entry & { weekLabel: string }) | null;
  faller: (Entry & { weekLabel: string }) | null;
  captainHits: Entry[];
  captainGain: Entry[];
  ownership: { label: string; pct: number }[];
  differential: { userId: string; player: string; pct: number; points: number; weeks: number } | null;
  motmHunters: Entry[];
  cards: (Entry & { yellow: number; red: number })[];
  clubFans: { userId: string; club: string; pct: number }[];
  weekWinner: { userId: string; points: number } | null; // son haftanın birincisi
  closestWeek: { userId: string; secondId: string; diff: number; weekLabel: string; points: number; secondPoints: number } | null;
  comeback: { userId: string; gain: number; from: number; to: number; weekLabel: string } | null;
  comebackRunners: Entry[];
  worstWeek: { userId: string; points: number; weekLabel: string; avg: number } | null;
  // Yalnızca sayının kendi haftası (rekor tablosu için olanlar sezon geneli kalır)
  weekClosest: { userId: string; secondId: string; diff: number; points: number; secondPoints: number } | null;
  weekWorst: { userId: string; points: number; avg: number } | null;
  weekComeback: { userId: string; gain: number; from: number; to: number } | null;
  weekComebackRunners: Entry[];
  race: { userId: string; total: number }[];
  gapNow: number;
  gapBefore: number | null;
  captainChangers: Entry[];
  weekAvg: number;
  latestCaptainStar: { userId: string; player: string; points: number } | null;
  formations: FormationFacts;
}

interface FormationFacts {
  total: number; // toplam kadro sayısı
  dist: { formation: string; count: number }[]; // çoktan aza
  avgPoints: { formation: string; avg: number; count: number }[]; // yüksekten düşüğe
  changers: (Entry & { list: string[] })[]; // en çok farklı diziliş
  loyal: (Entry & { formation: string })[]; // hep aynı diziliş
  attack: Entry[]; // ortalama forvet
  defence: Entry[]; // ortalama defans
  matrixCols: string[];
  matrix: { userId: string; cells: number[]; hiIdx: number }[];
}

function weekLabel(w: WeekInfo): string {
  return w.name || `${w.weekNumber}. hafta`;
}

function computeFacts(data: GazeteData, W: WeekInfo[]): Facts {
  const weekIds = W.map((w) => w.id);
  const latest = W[W.length - 1];

  const coverage = new Map<string, number>();
  for (const [u, byWeek] of data.picks) {
    coverage.set(u, weekIds.filter((id) => byWeek.has(id)).length);
  }
  // Tüm haftalarda kadrosu kayıtlı olmayan takımlar sayı kartlarına girmez.
  const minCoverage = W.length;
  const eligible = new Set(
    [...coverage.entries()].filter(([, c]) => c >= minCoverage).map(([u]) => u)
  );

  // Koleksiyoncu / Sadık
  const collector: Entry[] = [];
  for (const u of eligible) {
    const set = new Set<string>();
    for (const id of weekIds) data.picks.get(u)?.get(id)?.playerIds.forEach((p) => set.add(p));
    collector.push({ userId: u, value: set.size });
  }

  // Transfer delisi
  const transfers: Entry[] = [];
  for (const u of eligible) {
    let count = 0;
    for (let i = 1; i < weekIds.length; i++) {
      const prev = data.picks.get(u)?.get(weekIds[i - 1]);
      const cur = data.picks.get(u)?.get(weekIds[i]);
      if (!prev || !cur) continue;
      const prevSet = new Set(prev.playerIds);
      count += cur.playerIds.filter((p) => !prevSet.has(p)).length;
    }
    transfers.push({ userId: u, value: count });
  }

  // Haftalık puan serileri
  let bestWeek: Facts["bestWeek"] = null;
  const bestPerUser = new Map<string, number>();
  const stable: Facts["stable"] = [];
  for (const [u, byWeek] of data.scores) {
    const pts = weekIds.filter((id) => byWeek.has(id)).map((id) => byWeek.get(id)!);
    if (pts.length === 0) continue;
    for (const w of W) {
      const p = byWeek.get(w.id);
      if (p === undefined) continue;
      if (p > (bestPerUser.get(u) ?? -1)) bestPerUser.set(u, p);
      if (!bestWeek || p > bestWeek.value) {
        bestWeek = { userId: u, value: p, weekId: w.id, weekLabel: weekLabel(w) };
      }
    }
    if (pts.length >= 3) {
      const mean = pts.reduce((a, b) => a + b, 0) / pts.length;
      const sd = Math.sqrt(pts.reduce((a, b) => a + (b - mean) ** 2, 0) / pts.length);
      stable.push({ userId: u, value: sd, min: Math.min(...pts), max: Math.max(...pts) });
    }
  }
  const bestWeekRunners = sortDesc(
    [...bestPerUser.entries()]
      .filter(([u]) => u !== bestWeek?.userId)
      .map(([u, v]) => ({ userId: u, value: v }))
  );

  // Bu haftanın en yüksek puanı (sezon rekoruysa işaretlenir)
  let weekBest: Facts["weekBest"] = null;
  const weekBestRunners: Entry[] = [];
  {
    const cur: Entry[] = [];
    for (const [u, byWeek] of data.scores) {
      const p = byWeek.get(latest.id);
      if (p !== undefined && p > 0) cur.push({ userId: u, value: p });
    }
    cur.sort((a, b) => b.value - a.value);
    if (cur[0]) {
      let prevMax = 0;
      for (const w of W.slice(0, -1))
        for (const [, byWeek] of data.scores) prevMax = Math.max(prevMax, byWeek.get(w.id) ?? 0);
      weekBest = { userId: cur[0].userId, value: cur[0].value, isRecord: W.length > 1 && cur[0].value > prevMax };
      weekBestRunners.push(...cur.slice(1));
    }
  }

  // Hafta şampiyonu + seri
  const winsByWeek: string[][] = [];
  const winCount = new Map<string, number>();
  let weekWinner: Facts["weekWinner"] = null;
  for (const w of W) {
    let max = -Infinity;
    for (const [, byWeek] of data.scores) {
      const p = byWeek.get(w.id);
      if (p !== undefined && p > max) max = p;
    }
    const winners: string[] = [];
    if (max > 0) {
      for (const [u, byWeek] of data.scores) if (byWeek.get(w.id) === max) winners.push(u);
    }
    winsByWeek.push(winners);
    winners.forEach((u) => winCount.set(u, (winCount.get(u) ?? 0) + 1));
    if (w.id === latest.id && winners.length > 0) weekWinner = { userId: winners[0], points: max };
  }
  const champions = sortDesc([...winCount.entries()].map(([u, v]) => ({ userId: u, value: v })));
  const longestStreak = new Map<string, number>();
  for (const [u] of winCount) {
    let best = 0;
    let run = 0;
    for (const winners of winsByWeek) {
      if (winners.includes(u)) {
        run += 1;
        best = Math.max(best, run);
      } else run = 0;
    }
    longestStreak.set(u, best);
  }

  // Yükselen / düşen (genel sıralamadaki yer değişimi)
  function rankAt(k: number): Map<string, number> {
    const totals: [string, number][] = [];
    for (const [u, byWeek] of data.scores) {
      let t = 0;
      let has = false;
      for (let i = 0; i <= k; i++) {
        const p = byWeek.get(weekIds[i]);
        if (p !== undefined) {
          t += p;
          has = true;
        }
      }
      if (has) totals.push([u, t]);
    }
    totals.sort((a, b) => b[1] - a[1]);
    return new Map(totals.map(([u], i) => [u, i + 1]));
  }
  let riser: Facts["riser"] = null;
  let faller: Facts["faller"] = null;
  for (let k = Math.max(1, weekIds.length - 1); k < weekIds.length; k++) {
    const before = rankAt(k - 1);
    const after = rankAt(k);
    for (const [u, r] of after) {
      const b = before.get(u);
      if (b === undefined) continue;
      const change = b - r;
      if (change > 0 && (!riser || change > riser.value))
        riser = { userId: u, value: change, weekLabel: weekLabel(W[k]) };
      if (change < 0 && (!faller || -change > faller.value))
        faller = { userId: u, value: -change, weekLabel: weekLabel(W[k]) };
    }
  }

  // Kaptan isabeti / geliri
  const captainHits: Entry[] = [];
  const captainGain: Entry[] = [];
  for (const u of eligible) {
    let hits = 0;
    let gain = 0;
    for (const w of W) {
      const cap = data.picks.get(u)?.get(w.id)?.captainId;
      const weekStats = data.stats.get(w.id);
      if (!cap || !weekStats) continue;
      const s = weekStats.get(cap);
      if (!s) continue;
      let maxPts = 0;
      for (const st of weekStats.values()) if (st.points > maxPts) maxPts = st.points;
      if (maxPts > 0 && s.points >= maxPts) hits += 1;
      if (s.minutes > 0) gain += s.points * (data.captainMult - 1);
    }
    captainHits.push({ userId: u, value: hits });
    captainGain.push({ userId: u, value: Math.round(gain) });
  }

  // Kalabalık seçimi + Farklı düşünen (son haftanın kadroları)
  const latestSquads: [string, PickSet][] = [];
  for (const [u, byWeek] of data.picks) {
    const s = byWeek.get(latest.id);
    if (s && s.playerIds.length > 0) latestSquads.push([u, s]);
  }
  const owners = new Map<string, number>();
  for (const [, s] of latestSquads) for (const p of s.playerIds) owners.set(p, (owners.get(p) ?? 0) + 1);
  const squadCount = latestSquads.length;
  const ownership = [...owners.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([p, c]) => ({
      label: data.players.get(p)?.name ?? "?",
      pct: Math.round((c / Math.max(1, squadCount)) * 100),
    }));

  // Farklı düşünen: her hafta, o haftanın kadrolarının en fazla %25'inde bulunan bir
  // oyuncuyu seçen takımın, o haftalarda o oyuncudan aldığı puanlar toplanır.
  // (Sahiplik her hafta kendi haftasının kadrolarına göre ölçülür; sezon boyunca
  // herkesin tuttuğu bir oyuncu, sonradan terk edilince "farklı düşünen" sayılmaz.)
  const diffMap = new Map<string, { userId: string; playerId: string; points: number; weeks: number; pctSum: number }>();
  for (const w of W) {
    const squads: [string, PickSet][] = [];
    for (const [u, byWeek] of data.picks) {
      const sq = byWeek.get(w.id);
      if (sq && sq.playerIds.length > 0) squads.push([u, sq]);
    }
    if (squads.length < 4) continue;
    const own = new Map<string, number>();
    for (const [, sq] of squads) for (const p of sq.playerIds) own.set(p, (own.get(p) ?? 0) + 1);
    for (const [u, sq] of squads) {
      for (const p of sq.playerIds) {
        const pct = ((own.get(p) ?? 0) / squads.length) * 100;
        const st = data.stats.get(w.id)?.get(p);
        if (pct > 25 || !st || st.minutes <= 0 || st.points <= 0) continue;
        const key = u + "|" + p;
        const cur = diffMap.get(key) ?? { userId: u, playerId: p, points: 0, weeks: 0, pctSum: 0 };
        cur.points += st.points;
        cur.weeks += 1;
        cur.pctSum += pct;
        diffMap.set(key, cur);
      }
    }
  }
  let differential: Facts["differential"] = null;
  for (const d of diffMap.values()) {
    if (!differential || d.points > differential.points) {
      differential = {
        userId: d.userId,
        player: data.players.get(d.playerId)?.name ?? "?",
        pct: Math.round(d.pctSum / d.weeks),
        points: d.points,
        weeks: d.weeks,
      };
    }
  }

  // Yıldız avcısı + Centilmen/Haşin
  const motmHunters: Entry[] = [];
  const cards: Facts["cards"] = [];
  for (const u of eligible) {
    let motm = 0;
    let yellow = 0;
    let red = 0;
    for (const w of W) {
      const squad = data.picks.get(u)?.get(w.id);
      if (!squad) continue;
      for (const p of squad.playerIds) {
        const st = data.stats.get(w.id)?.get(p);
        if (!st) continue;
        if (st.motm) motm += 1;
        yellow += st.yellow;
        red += st.red;
      }
    }
    motmHunters.push({ userId: u, value: motm });
    cards.push({ userId: u, value: yellow + red, yellow, red });
  }

  // Kulüp hayranı (son hafta kadrosundaki kulüp yüzdesi)
  const clubBest = new Map<string, { userId: string; club: string; pct: number }>();
  for (const [u, s] of latestSquads) {
    const counts = new Map<string, number>();
    for (const p of s.playerIds) {
      const c = data.players.get(p)?.club;
      if (c && CLUB_NAMES[c]) counts.set(c, (counts.get(c) ?? 0) + 1);
    }
    for (const [club, n] of counts) {
      const pct = Math.round((n / s.playerIds.length) * 100);
      const cur = clubBest.get(club);
      if (!cur || pct > cur.pct) clubBest.set(club, { userId: u, club, pct });
    }
  }
  const clubFans = [...clubBest.values()].sort((a, b) => b.pct - a.pct);

  // Son dakika golü / Pes etmeyen / Kötü hafta
  let closestWeek: Facts["closestWeek"] = null;
  let worstWeek: Facts["worstWeek"] = null;
  const comebackAll: Entry[] = [];
  let comeback: Facts["comeback"] = null;
  const weekAvgOf = (id: number) => {
    const v = [...data.scores.values()].map((m) => m.get(id)).filter((x): x is number => x !== undefined && x > 0);
    return v.length ? v.reduce((a, b) => a + b, 0) / v.length : 0;
  };
  for (const w of W) {
    const list = [...data.scores.entries()]
      .map(([u, m]) => ({ u, p: m.get(w.id) }))
      .filter((x): x is { u: string; p: number } => x.p !== undefined && x.p > 0)
      .sort((a, b) => b.p - a.p);
    if (list.length >= 2 && list[0].p > list[1].p) {
      const diff = list[0].p - list[1].p;
      if (!closestWeek || diff < closestWeek.diff)
        closestWeek = { userId: list[0].u, secondId: list[1].u, diff, weekLabel: weekLabel(w), points: list[0].p, secondPoints: list[1].p };
    }
    const low = list[list.length - 1];
    if (low && list.length >= 3 && (!worstWeek || low.p < worstWeek.points))
      worstWeek = { userId: low.u, points: low.p, weekLabel: weekLabel(w), avg: Math.round(weekAvgOf(w.id)) };
  }
  for (const [u, byWeek] of data.scores) {
    let best: { gain: number; from: number; to: number; w: WeekInfo } | null = null;
    for (let i = 1; i < W.length; i++) {
      const a = byWeek.get(W[i - 1].id);
      const b = byWeek.get(W[i].id);
      if (a === undefined || b === undefined || a <= 0) continue;
      if (b - a > 0 && (!best || b - a > best.gain)) best = { gain: b - a, from: a, to: b, w: W[i] };
    }
    if (best) {
      comebackAll.push({ userId: u, value: best.gain });
      if (!comeback || best.gain > comeback.gain)
        comeback = { userId: u, gain: best.gain, from: best.from, to: best.to, weekLabel: weekLabel(best.w) };
    }
  }
  const comebackRunners = sortDesc(comebackAll).filter((e) => e.userId !== comeback?.userId);

  // Yalnızca bu haftanın (ve bir önceki haftaya göre farkın) verisi
  let weekClosest: Facts["weekClosest"] = null;
  let weekWorst: Facts["weekWorst"] = null;
  {
    const list = [...data.scores.entries()]
      .map(([u, m]) => ({ u, p: m.get(latest.id) }))
      .filter((x): x is { u: string; p: number } => x.p !== undefined && x.p > 0)
      .sort((a, b) => b.p - a.p);
    if (list.length >= 2 && list[0].p > list[1].p)
      weekClosest = { userId: list[0].u, secondId: list[1].u, diff: list[0].p - list[1].p, points: list[0].p, secondPoints: list[1].p };
    const low = list[list.length - 1];
    if (low && list.length >= 3) weekWorst = { userId: low.u, points: low.p, avg: Math.round(weekAvgOf(latest.id)) };
  }
  let weekComeback: Facts["weekComeback"] = null;
  const weekComebackAll: Entry[] = [];
  if (W.length >= 2) {
    const prevW = W[W.length - 2];
    for (const [u, byWeek] of data.scores) {
      const a = byWeek.get(prevW.id);
      const b = byWeek.get(latest.id);
      if (a === undefined || b === undefined || a <= 0 || b - a <= 0) continue;
      weekComebackAll.push({ userId: u, value: b - a });
      if (!weekComeback || b - a > weekComeback.gain) weekComeback = { userId: u, gain: b - a, from: a, to: b };
    }
  }
  const weekComebackRunners = sortDesc(weekComebackAll).filter((e) => e.userId !== weekComeback?.userId);

  // Zirve yarışı
  const totalsAt = (k: number) =>
    [...data.scores.entries()]
      .map(([u, m]) => {
        let t = 0;
        for (let i = 0; i <= k; i++) t += m.get(weekIds[i]) ?? 0;
        return { userId: u, total: t };
      })
      .filter((x) => x.total > 0)
      .sort((a, b) => b.total - a.total);
  const race = totalsAt(weekIds.length - 1).slice(0, 3);
  const gapNow = race.length >= 2 ? race[0].total - race[1].total : 0;
  let gapBefore: number | null = null;
  if (weekIds.length >= 3) {
    const t = totalsAt(weekIds.length - 2);
    if (t.length >= 2) gapBefore = t[0].total - t[1].total;
  }

  // Kaptan değiştiren
  const captainChangers: Entry[] = [];
  for (const u of eligible) {
    const set = new Set<string>();
    for (const id of weekIds) {
      const c = data.picks.get(u)?.get(id)?.captainId;
      if (c) set.add(c);
    }
    captainChangers.push({ userId: u, value: set.size });
  }

  // Son haftanın kaptan yıldızı (Haftanın haberi için)
  let latestCaptainStar: Facts["latestCaptainStar"] = null;
  for (const [u, byWeek] of data.picks) {
    const cap = byWeek.get(latest.id)?.captainId;
    const st = cap ? data.stats.get(latest.id)?.get(cap) : undefined;
    if (cap && st && st.minutes > 0) {
      const pts = Math.round(st.points * data.captainMult);
      if (!latestCaptainStar || pts > latestCaptainStar.points)
        latestCaptainStar = { userId: u, player: data.players.get(cap)?.name ?? "?", points: pts };
    }
  }

  // Diziliş istatistikleri (DEF-MID-FWD sayısından)
  const formByUser = new Map<string, { w: number; f: string; def: number; fwd: number }[]>();
  for (const [u, byWeek] of data.picks) {
    for (const w of W) {
      const sq = byWeek.get(w.id);
      if (!sq) continue;
      let def = 0, mid = 0, fwd = 0;
      for (const p of sq.playerIds) {
        const pos = data.players.get(p)?.position;
        if (pos === "DEF") def++;
        else if (pos === "MID") mid++;
        else if (pos === "FWD") fwd++;
      }
      if (def + mid + fwd !== 10) continue;
      if (!formByUser.has(u)) formByUser.set(u, []);
      formByUser.get(u)!.push({ w: w.id, f: `${def}-${mid}-${fwd}`, def, fwd });
    }
  }
  const distMap = new Map<string, number>();
  const ptsMap = new Map<string, { sum: number; n: number }>();
  let totalSquads = 0;
  for (const [u, list] of formByUser) {
    for (const x of list) {
      totalSquads++;
      distMap.set(x.f, (distMap.get(x.f) ?? 0) + 1);
      const pts = data.scores.get(u)?.get(x.w);
      if (pts !== undefined && pts > 0) {
        const cur = ptsMap.get(x.f) ?? { sum: 0, n: 0 };
        cur.sum += pts;
        cur.n += 1;
        ptsMap.set(x.f, cur);
      }
    }
  }
  const dist = [...distMap.entries()].map(([formation, count]) => ({ formation, count })).sort((a, b) => b.count - a.count);
  const avgPoints = [...ptsMap.entries()]
    .filter(([, v]) => v.n >= 3)
    .map(([formation, v]) => ({ formation, avg: Math.round(v.sum / v.n), count: v.n }))
    .sort((a, b) => b.avg - a.avg);
  const fChangers: FormationFacts["changers"] = [];
  const fLoyal: FormationFacts["loyal"] = [];
  const fAttack: Entry[] = [];
  const fDefence: Entry[] = [];
  const matrixCols = dist.slice(0, 5).map((d) => d.formation);
  const matrix: FormationFacts["matrix"] = [];
  for (const [u, list] of formByUser) {
    if (!eligible.has(u)) continue;
    const set = [...new Set(list.map((x) => x.f))];
    fChangers.push({ userId: u, value: set.length, list: set });
    if (set.length === 1 && list.length >= 3) fLoyal.push({ userId: u, value: list.length, formation: set[0] });
    fAttack.push({ userId: u, value: list.reduce((a, x) => a + x.fwd, 0) / list.length });
    fDefence.push({ userId: u, value: list.reduce((a, x) => a + x.def, 0) / list.length });
  }
  for (const [u, list] of formByUser) {
    const cells = matrixCols.map((c) => list.filter((x) => x.f === c).length);
    const max = Math.max(...cells, 0);
    matrix.push({ userId: u, cells, hiIdx: max > 0 ? cells.indexOf(max) : -1 });
  }
  const formations: FormationFacts = {
    total: totalSquads,
    dist,
    avgPoints,
    changers: sortDesc(fChangers) as FormationFacts["changers"],
    loyal: [...fLoyal].sort((a, b) => b.value - a.value),
    attack: sortDesc(fAttack),
    defence: sortDesc(fDefence),
    matrixCols,
    matrix,
  };

  return {
    collector,
    loyal: sortAsc(collector),
    transfers,
    bestWeek,
    bestWeekRunners,
    weekBest,
    weekBestRunners,
    stable: [...stable].sort((a, b) => a.value - b.value),
    champions,
    longestStreak,
    riser,
    faller,
    captainHits,
    captainGain,
    ownership,
    differential,
    motmHunters,
    cards,
    clubFans,
    weekWinner,
    closestWeek,
    comeback,
    comebackRunners,
    worstWeek,
    weekClosest,
    weekWorst,
    weekComeback,
    weekComebackRunners,
    race,
    gapNow,
    gapBefore,
    captainChangers,
    weekAvg: Math.round(weekAvgOf(latest.id)),
    latestCaptainStar,
    formations,
  };
}

// ───────────────────────── Başlık kalıpları ─────────────────────────
// Her kategori için birkaç farklı kalıp var; hafta numarasına göre sırayla
// seçilir ki aynı cümle her hafta tekrar etmesin.

function pick<T>(variants: T[], seed: number): T {
  return variants[((seed % variants.length) + variants.length) % variants.length];
}

function after(entries: Entry[], data: GazeteData, fmt: (e: Entry) => string, skip = 1): string | undefined {
  const rest = entries.slice(skip, skip + 2);
  if (rest.length === 0) return undefined;
  return (
    "Ardından: " +
    rest.map((e) => `${data.teams.get(e.userId)?.name ?? "?"} (${fmt(e)})`).join(" · ")
  );
}

function buildStories(data: GazeteData, W: WeekInfo[], facts: Facts, seed: number): Record<string, Story> {
  const T = (id: string) => data.teams.get(id);
  const out: Record<string, Story> = {};
  const add = (s: Story | null) => {
    if (s) out[s.id] = s;
  };
  const n = (v: number) => String(Math.round(v));

  // Koleksiyoncu
  const c1 = facts.collector[0];
  if (c1 && T(c1.userId) && c1.value > 0) {
    const t = T(c1.userId)!;
    add({
      id: "collector",
      kicker: "Koleksiyoncu",
      team: t,
      headline: pick<Part[]>(
        [
          [{ text: `${c1.value} farklı futbolcuyla ` }, { text: t.name, hot: true }, { text: " rekor kırdı!" }],
          [{ text: t.name, hot: true }, { text: ` sezonda tam ` }, { text: `${c1.value} oyuncu`, hot: true }, { text: " kullandı" }],
          [{ text: "Kadro kapısı hiç kapanmadı: " }, { text: t.name, hot: true }, { text: ` ${c1.value} farklı oyuncu denedi` }],
        ],
        seed
      ),
      deck: "Sezon boyunca kadrosuna en çok farklı oyuncuyu katan takım.",
      bigNumber: String(c1.value),
      bigLabel: "farklı futbolcu kullandı",
      after: after(facts.collector, data, (e) => `${e.value} oyuncu`),
    });
  }

  // Sadık
  const l1 = facts.loyal[0];
  if (l1 && T(l1.userId) && facts.loyal.length > 1) {
    const t = T(l1.userId)!;
    add({
      id: "loyal",
      kicker: "Sadık",
      team: t,
      headline: pick<Part[]>(
        [
          [{ text: t.name, hot: true }, { text: " kadrosuna " }, { text: `${l1.value} oyuncuyla`, hot: true }, { text: " yetindi" }],
          [{ text: "Değişime kapalı: " }, { text: t.name, hot: true }, { text: ` sadece ${l1.value} farklı oyuncu kullandı` }],
        ],
        seed + 1
      ),
      deck: "Kadrosunu en az değiştiren, aynı oyunculara güvenen takım.",
      after: after(facts.loyal, data, (e) => `${e.value} oyuncu`),
    });
  }

  // Transfer delisi
  const t1 = sortDesc(facts.transfers)[0];
  if (t1 && T(t1.userId) && t1.value > 0) {
    const t = T(t1.userId)!;
    add({
      id: "transfers",
      kicker: "Transfer delisi",
      team: t,
      headline: pick<Part[]>(
        [
          [{ text: t.name, hot: true }, { text: " durmadı: " }, { text: `${t1.value} transfer!`, hot: true }],
          [{ text: t.name, hot: true }, { text: " transfer piyasasını salladı: " }, { text: `${t1.value} transfer`, hot: true }],
        ],
        seed + 2
      ),
      deck: "Haftalar arasında kadrosuna en çok yeni oyuncu alan takım.",
      after: after(sortDesc(facts.transfers), data, (e) => `${e.value} transfer`),
    });
  }

  // Haftanın en yüksek puanı (yalnızca bu hafta; sezon rekoruysa belirtilir)
  const bw = facts.weekBest;
  if (bw && T(bw.userId)) {
    const t = T(bw.userId)!;
    add({
      id: "bestweek",
      kicker: bw.isRecord ? "Sezon rekoru" : "Haftanın en yüksek puanı",
      team: t,
      headline: pick<Part[]>(
        [
          [{ text: t.name, hot: true }, { text: bw.isRecord ? " rekor kırdı: " : " haftanın en iyisi: " }, { text: `${bw.value} puan`, hot: true }],
          [{ text: bw.isRecord ? "Rekor haftası: " : "Bu haftanın zirvesi: " }, { text: t.name, hot: true }, { text: " " }, { text: `${bw.value} puan!`, hot: true }],
        ],
        seed + 3
      ),
      deck: bw.isRecord
        ? `Bu hafta alınan en yüksek puan, aynı zamanda sezonun yeni rekoru.`
        : `Bu hafta tek başına alınan en yüksek puan.`,
      bigNumber: String(bw.value),
      bigLabel: "puan · bu hafta",
      after: facts.weekBestRunners[0]
        ? `Ardından: ${T(facts.weekBestRunners[0].userId)?.name ?? "?"} (${facts.weekBestRunners[0].value})`
        : undefined,
    });
  }

  // Hafta şampiyonu
  const ch = facts.champions[0];
  if (ch && T(ch.userId)) {
    const t = T(ch.userId)!;
    const streak = facts.longestStreak.get(ch.userId) ?? 1;
    add({
      id: "champion",
      kicker: "Hafta şampiyonu",
      team: t,
      headline: pick<Part[]>(
        [
          [{ text: t.name, hot: true }, { text: " haftaların patronu: " }, { text: `${ch.value} kez 1.`, hot: true }],
          [{ text: t.name, hot: true }, { text: " zirveyi bırakmıyor: " }, { text: `${ch.value} haftalık birincilik`, hot: true }],
        ],
        seed + 5
      ),
      deck: `En çok hafta birinci bitiren takım. En uzun seri: üst üste ${streak} hafta.`,
      after: after(facts.champions, data, (e) => String(e.value)),
    });
  }

  // Yükselen / düşen
  if (facts.riser && T(facts.riser.userId)) {
    const t = T(facts.riser.userId)!;
    add({
      id: "riser",
      kicker: "Yükselen",
      team: t,
      headline: pick<Part[]>(
        [
          [{ text: t.name, hot: true }, { text: " bir haftada " }, { text: `${facts.riser.value} basamak`, hot: true }, { text: " atladı" }],
          [{ text: "Roket gibi: " }, { text: t.name, hot: true }, { text: ` ${facts.riser.value} sıra yükseldi` }],
        ],
        seed + 6
      ),
      deck: "Bu hafta genel sıralamada en çok yer atlayan takım.",
      after:
        facts.faller && T(facts.faller.userId)
          ? `Düşen: ${T(facts.faller.userId)!.name} −${facts.faller.value}`
          : undefined,
    });
  }

  // Kaptan isabeti
  const k1 = sortDesc(facts.captainHits)[0];
  if (k1 && T(k1.userId) && k1.value > 0) {
    const t = T(k1.userId)!;
    add({
      id: "captainhit",
      kicker: "Kaptan isabeti",
      team: t,
      headline: pick<Part[]>(
        [
          [{ text: t.name, hot: true }, { text: " kaptan seçiminde " }, { text: `${k1.value} kez`, hot: true }, { text: " tam isabet" }],
          [{ text: "Kaptanlık sanatı: " }, { text: t.name, hot: true }, { text: ` ${k1.value} haftada en iyiyi seçti` }],
        ],
        seed + 7
      ),
      deck: "Kaptanı, o haftanın en çok puan alan oyuncusu olan hafta sayısı.",
      after: after(sortDesc(facts.captainHits), data, (e) => String(e.value)),
    });
  }

  // Kaptan geliri
  const g1 = sortDesc(facts.captainGain)[0];
  if (g1 && T(g1.userId) && g1.value > 0) {
    const t = T(g1.userId)!;
    add({
      id: "captaingain",
      kicker: "Kaptan geliri",
      team: t,
      headline: pick<Part[]>(
        [
          [{ text: "Kaptanlık getirisi: " }, { text: t.name, hot: true }, { text: " " }, { text: `+${g1.value} puan`, hot: true }, { text: " kazandı" }],
          [{ text: t.name, hot: true }, { text: " kaptan bandıyla " }, { text: `+${g1.value} puan`, hot: true }, { text: " kopardı" }],
        ],
        seed + 8
      ),
      deck: "Kaptanlık çarpanından en çok puan toplayan takım.",
      after: after(sortDesc(facts.captainGain), data, (e) => `+${e.value}`),
    });
  }

  // Kalabalık seçimi
  if (facts.ownership.length > 0) {
    const top = facts.ownership[0];
    add({
      id: "crowd",
      kicker: "Kalabalık seçimi",
      headline: [{ text: "Kadroların gözdesi: " }, { text: `${top.label} %${top.pct}`, hot: true }, { text: " ile zirvede" }],
      deck: "En çok kadroda bulunan oyuncular — her çubuk, o oyuncuyu kadrosuna alan takımların yüzdesi.",
      bars: facts.ownership,
      full: true,
    });
  }

  // Farklı düşünen
  if (facts.differential && T(facts.differential.userId)) {
    const d = facts.differential;
    const t = T(d.userId)!;
    add({
      id: "differential",
      kicker: "Farklı düşünen",
      team: t,
      headline: [{ text: "Kalabalığa karışmadı: " }, { text: t.name, hot: true }, { text: " kadrosunda " }, { text: d.player, hot: true }, { text: " var" }],
      deck: `${d.weeks} hafta boyunca takımların ortalama yalnızca %${d.pct} oranında kadrosunda olan bu oyuncu, ona güvenen takıma ${d.points} puan getirdi.`,
      full: true,
    });
  }

  // Yıldız avcısı
  const m1 = sortDesc(facts.motmHunters)[0];
  if (m1 && T(m1.userId) && m1.value > 0) {
    const t = T(m1.userId)!;
    add({
      id: "motm",
      kicker: "Yıldız avcısı",
      team: t,
      headline: pick<Part[]>(
        [
          [{ text: t.name, hot: true }, { text: ": oyuncuları " }, { text: `${m1.value} kez`, hot: true }, { text: " Maçın Yıldızı seçildi" }],
          [{ text: "Gecenin yıldızı hep onda: " }, { text: t.name, hot: true }, { text: ` ${m1.value} Maçın Yıldızı` }],
        ],
        seed + 9
      ),
      deck: "Kadrosundaki oyuncular en çok Maçın Yıldızı seçilen takım.",
      after: after(sortDesc(facts.motmHunters), data, (e) => String(e.value)),
    });
  }

  // Centilmen / haşin
  if (facts.cards.length > 1) {
    const byCards = [...facts.cards].sort((a, b) => a.value - b.value);
    const gentle = byCards[0];
    const rough = byCards[byCards.length - 1];
    if (T(gentle.userId)) {
      const t = T(gentle.userId)!;
      const total = gentle.yellow + gentle.red;
      add({
        id: "gentle",
        kicker: "Centilmen",
        team: t,
        headline: [{ text: "Fair play: " }, { text: t.name, hot: true }, { text: " sezonda sadece " }, { text: `${total} kart`, hot: true }, { text: " gördü" }],
        deck: "Kadrosundaki oyuncular sezonda en az kart gören takım.",
        after:
          T(rough.userId) && rough.userId !== gentle.userId
            ? `En haşin: ${T(rough.userId)!.name} · ${rough.yellow} sarı, ${rough.red} kırmızı`
            : undefined,
      });
    }
  }

  // Son dakika golü
  if (facts.weekClosest && T(facts.weekClosest.userId)) {
    const c = facts.weekClosest;
    const t = T(c.userId)!;
    add({
      id: "closest",
      kicker: "Son dakika golü",
      team: t,
      headline: pick<Part[]>(
        [
          [{ text: t.name, hot: true }, { text: ", haftayı sadece " }, { text: `${c.diff} puan`, hot: true }, { text: " farkla kazandı" }],
          [{ text: "Nefes kesen hafta: " }, { text: t.name, hot: true }, { text: ` ${c.diff} puanla öne geçti` }],
        ],
        seed + 10
      ),
      deck: `Bu haftanın birincilik yarışı. İkinci: ${T(c.secondId)?.name ?? "?"} (${c.points} – ${c.secondPoints}).`,
      bigNumber: String(c.diff),
      bigLabel: "puan fark",
    });
  }

  // Pes etmeyen
  if (facts.weekComeback && T(facts.weekComeback.userId)) {
    const c = facts.weekComeback;
    const t = T(c.userId)!;
    add({
      id: "comeback",
      kicker: "Pes etmeyen",
      team: t,
      headline: pick<Part[]>(
        [
          [{ text: t.name, hot: true }, { text: " bir haftada " }, { text: `+${c.gain} puan`, hot: true }, { text: " artırdı" }],
          [{ text: "Küllerinden doğdu: " }, { text: t.name, hot: true }, { text: ` ${c.from} → ${c.to}` }],
        ],
        seed + 11
      ),
      deck: `Bir önceki haftaya göre en büyük puan yükselişi (${c.from} → ${c.to}).`,
      bigNumber: `+${c.gain}`,
      bigLabel: "puan",
      after: after(facts.weekComebackRunners, data, (e) => `+${e.value}`, 0),
    });
  }

  // Kötü hafta
  if (facts.weekWorst && T(facts.weekWorst.userId)) {
    const c = facts.weekWorst;
    const t = T(c.userId)!;
    add({
      id: "worst",
      kicker: "Kötü hafta",
      team: t,
      headline: pick<Part[]>(
        [
          [{ text: "Bir türlü olmadı: " }, { text: t.name, hot: true }, { text: " bu hafta sadece " }, { text: `${c.points} puan`, hot: true }, { text: " alabildi" }],
          [{ text: "Unutulması gereken hafta: " }, { text: t.name, hot: true }, { text: ` ${c.points} puanda kaldı` }],
        ],
        seed + 12
      ),
      deck: `Bu haftanın en düşük puanı. Haftanın ortalaması ${c.avg} idi.`,
      bigNumber: String(c.points),
      bigLabel: "puan · haftanın en düşüğü",
    });
  }

  // Zirve yarışı
  if (facts.race.length >= 2) {
    const top = facts.race[0].total;
    const trend =
      facts.gapBefore === null
        ? ""
        : facts.gapNow < facts.gapBefore
        ? ` Fark geçen hafta ${facts.gapBefore} puandı, kapanıyor.`
        : facts.gapNow > facts.gapBefore
        ? ` Fark geçen hafta ${facts.gapBefore} puandı, açılıyor.`
        : ` Fark geçen haftayla aynı.`;
    const leader = T(facts.race[0].userId);
    if (leader) {
      add({
        id: "race",
        kicker: "Zirve yarışı",
        headline: [
          { text: "Liderle ikinci arasında " },
          { text: facts.gapNow === 0 ? "hiç fark" : `${facts.gapNow} puan`, hot: true },
          { text: facts.gapNow === 0 ? " yok" : " var" },
        ],
        deck: trend.trim() || "Genel sıralamada ilk üç takım.",
        race: facts.race
          .map((r) => ({ team: T(r.userId)!, points: r.total, pct: Math.round((r.total / top) * 100) }))
          .filter((r) => r.team),
      });
    }
  }

  // Kaptan değiştiren
  const cc = sortDesc(facts.captainChangers);
  if (cc[0] && T(cc[0].userId) && cc[0].value > 1) {
    const t = T(cc[0].userId)!;
    const least = sortAsc(facts.captainChangers)[0];
    add({
      id: "captainchanger",
      kicker: "Kaptan değiştiren",
      team: t,
      headline: pick<Part[]>(
        [
          [{ text: t.name, hot: true }, { text: ` ${W.length} haftada ` }, { text: `${cc[0].value} farklı kaptan`, hot: true }, { text: " denedi" }],
          [{ text: "Kaptan bandı el değiştirdi: " }, { text: t.name, hot: true }, { text: ` ${cc[0].value} farklı isim` }],
        ],
        seed + 13
      ),
      deck: "Kaptanlığı en çok farklı oyuncuya veren takım.",
      bigNumber: String(cc[0].value),
      bigLabel: "farklı kaptan",
      after:
        least && T(least.userId) && least.userId !== cc[0].userId
          ? `En sadık: ${T(least.userId)!.name} (${least.value} kaptan)`
          : undefined,
    });
  }

  // Rekorlar tablosu
  {
    const rows: { team: GazeteTeam; label: string; value: string }[] = [];
    const addRow = (uid: string | undefined, label: string, value: string) => {
      const team = uid ? T(uid) : undefined;
      if (team) rows.push({ team, label, value });
    };
    addRow(facts.bestWeek?.userId, "En yüksek hafta", facts.bestWeek ? `${facts.bestWeek.value} · ${facts.bestWeek.weekLabel}` : "");
    addRow(facts.worstWeek?.userId, "En düşük hafta", facts.worstWeek ? `${facts.worstWeek.points} · ${facts.worstWeek.weekLabel}` : "");
    addRow(facts.collector[0]?.userId, "En çok farklı oyuncu", String(facts.collector[0]?.value ?? ""));
    addRow(sortDesc(facts.transfers)[0]?.userId, "En çok transfer", String(sortDesc(facts.transfers)[0]?.value ?? ""));
    addRow(facts.champions[0]?.userId, "En çok hafta birinciliği", `${facts.champions[0]?.value ?? ""} hafta`);
    addRow(facts.comeback?.userId, "En büyük yükseliş", facts.comeback ? `+${facts.comeback.gain} puan` : "");
    addRow(facts.closestWeek?.userId, "En yakın hafta", facts.closestWeek ? `${facts.closestWeek.diff} puan · ${facts.closestWeek.weekLabel}` : "");
    if (rows.length > 0)
      add({ id: "records", kicker: "Rekorlar tablosu", headline: [{ text: "Sezonun rekorları bir arada" }], rows, full: true });
  }

  // ── Diziliş kartları ──
  const F = facts.formations;
  const avg1 = (v: number) => (Math.round(v * 10) / 10).toString().replace(".", ",");

  if (F.changers[0] && T(F.changers[0].userId) && F.changers[0].value > 1) {
    const c = F.changers[0];
    const t = T(c.userId)!;
    add({
      id: "formchanger",
      kicker: "Diziliş delisi",
      team: t,
      headline: pick<Part[]>(
        [
          [{ text: t.name, hot: true }, { text: ` ${W.length} haftada ` }, { text: `${c.value} farklı diziliş`, hot: true }, { text: " denedi" }],
          [{ text: "Taktik tahtası hiç boş kalmadı: " }, { text: t.name, hot: true }, { text: ` ${c.value} diziliş` }],
        ],
        seed + 14
      ),
      deck: `Dizilişi en çok değiştiren takım: ${c.list.join(", ")}.`,
      bigNumber: String(c.value),
      bigLabel: "farklı diziliş",
      after: after(F.changers, data, (e) => `${e.value} diziliş`),
    });
  }

  if (F.loyal[0] && T(F.loyal[0].userId)) {
    const c = F.loyal[0];
    const t = T(c.userId)!;
    const others = F.loyal.slice(1, 3).map((e) => T(e.userId)?.name).filter(Boolean);
    add({
      id: "formloyal",
      kicker: "Dizilişine sadık",
      team: t,
      headline: pick<Part[]>(
        [
          [{ text: t.name, hot: true }, { text: ` ${c.value} haftanın hepsinde ` }, { text: c.formation, hot: true }, { text: " oynadı" }],
          [{ text: "Değişmeyen tek şey: " }, { text: t.name, hot: true }, { text: " hep " }, { text: c.formation, hot: true }],
        ],
        seed + 15
      ),
      deck: "Hiç diziliş değiştirmeyen takım.",
      bigNumber: `${c.value}/${W.length}`,
      bigLabel: `hafta · ${c.formation}`,
      after: others.length ? `Ayrıca: ${others.join(" · ")}` : undefined,
    });
  }

  if (F.attack[0] && T(F.attack[0].userId)) {
    const a = F.attack[0];
    const t = T(a.userId)!;
    const least = F.attack[F.attack.length - 1];
    add({
      id: "formattack",
      kicker: "Hücum hattı",
      team: t,
      headline: [{ text: t.name, hot: true }, { text: " en çok forvet oynatan takım: haftada " }, { text: `${avg1(a.value)} forvet`, hot: true }],
      deck: "Sezon boyunca kadrosunda ortalama en çok forvet bulunduran takım.",
      bigNumber: avg1(a.value),
      bigLabel: "ortalama forvet",
      after:
        least && T(least.userId) && least.userId !== a.userId
          ? `En az forvet: ${T(least.userId)!.name} (${avg1(least.value)})`
          : undefined,
    });
  }

  if (F.defence[0] && T(F.defence[0].userId)) {
    const a = F.defence[0];
    const t = T(a.userId)!;
    add({
      id: "formdefence",
      kicker: "Defans duvarı",
      team: t,
      headline: [{ text: t.name, hot: true }, { text: " kadrosunu defansla kurdu: haftada " }, { text: `${avg1(a.value)} defans`, hot: true }],
      deck: "Sezon boyunca kadrosunda ortalama en çok defans oyuncusu bulunduran takım.",
      bigNumber: avg1(a.value),
      bigLabel: "ortalama defans",
    });
  }

  if (F.dist[0] && F.total > 0) {
    const top = F.dist[0];
    const shown = F.dist.slice(0, 4);
    const rest = F.dist.slice(4).reduce((a, d) => a + d.count, 0);
    const rows = shown.map((d) => ({
      label: d.formation,
      pct: Math.round((d.count / top.count) * 100),
      right: `${d.count} kez · %${Math.round((d.count / F.total) * 100)}`,
    }));
    if (rest > 0) rows.push({ label: "diğer", pct: Math.round((rest / top.count) * 100), right: `${rest} kez · %${Math.round((rest / F.total) * 100)}` });
    add({
      id: "formdist",
      kicker: "Lig geneli — hangi diziliş kaç kez?",
      headline: [{ text: "Ligin gözdesi " }, { text: top.formation, hot: true }, { text: `: kadroların %${Math.round((top.count / F.total) * 100)}’i bu dizilişle kuruldu` }],
      deck: `${F.total} kadro incelendi.`,
      fbars: rows,
      full: true,
    });
  }

  if (F.avgPoints.length >= 2) {
    const top = F.avgPoints[0];
    const second = F.avgPoints.find((x) => x.formation !== top.formation && x.formation === F.dist[0]?.formation) ?? F.avgPoints[1];
    const max = top.avg || 1;
    add({
      id: "formpoints",
      kicker: "En çok puan getiren diziliş",
      headline: [{ text: top.formation, hot: true }, { text: ` kullananlar haftada ortalama ` }, { text: `${top.avg} puan`, hot: true }, { text: ` aldı, ${second.formation} kullananlar ${second.avg}` }],
      deck: "Diziliş tek başına puanı belirlemez; sadece o dizilişi seçen takımların haftalık ortalaması (en az 3 kadro).",
      fbars: F.avgPoints.slice(0, 4).map((x, i) => ({
        label: x.formation,
        pct: Math.round((x.avg / max) * 100),
        right: `ort. ${x.avg}`,
        hot: i === 0,
      })),
      full: true,
    });
  }

  if (F.matrix.length > 0 && F.matrixCols.length > 0) {
    const rows = F.matrix
      .map((r) => ({ team: T(r.userId), cells: r.cells, hiIdx: r.hiIdx }))
      .filter((r): r is { team: GazeteTeam; cells: number[]; hiIdx: number } => !!r.team)
      .sort((a, b) => a.team.name.localeCompare(b.team.name, "tr"));
    add({
      id: "formmatrix",
      kicker: "Diziliş tablosu — takım takım kaç kez?",
      headline: [],
      deck: "Her satırda en çok tercih edilen diziliş kırmızıyla işaretli.",
      matrix: { cols: F.matrixCols, rows },
      full: true,
    });
  }

  return out;
}


// ───────────────────────── Tahmin Köşesi ─────────────────────────

function predPoints(tg: number, og: number, ts: number, os: number): number {
  if (tg === ts && og === os) return 3; // tam isabet
  return Math.sign(tg - og) === Math.sign(ts - os) ? 1 : 0; // doğru sonuç
}

interface PredWeek {
  userId: string;
  points: number;
  exact: number;
  rows: string[][]; // maç, tahmin, sonuç, puan
  exactMatches: string[]; // "Galatasaray 2–1 Kasımpaşa"
}

function predWeek(data: GazeteData, weekId: number): PredWeek[] {
  const fixtures = data.fixtures.get(weekId) ?? [];
  const out: PredWeek[] = [];
  for (const [u, byWeek] of data.predictions) {
    const preds = byWeek.get(weekId);
    if (!preds) continue;
    let points = 0;
    let exact = 0;
    let played = 0;
    const rows: string[][] = [];
    const exactMatches: string[] = [];
    for (const f of fixtures) {
      const pr = preds.get(f.team);
      if (!pr || f.ts === null || f.os === null) continue;
      played += 1;
      const pts = predPoints(pr.tg, pr.og, f.ts, f.os);
      points += pts;
      const clubName = CLUB_NAMES[f.team] ?? f.team;
      const home = f.isHome ? clubName : f.opponent;
      const away = f.isHome ? f.opponent : clubName;
      const fmt = (a: number, b: number) => (f.isHome ? `${a}–${b}` : `${b}–${a}`);
      rows.push([`${home} – ${away}`, fmt(pr.tg, pr.og), fmt(f.ts, f.os), String(pts)]);
      if (pts === 3) {
        exact += 1;
        exactMatches.push(`${home} ${fmt(f.ts, f.os)} ${away}`);
      }
    }
    if (played > 0) out.push({ userId: u, points, exact, rows, exactMatches });
  }
  return out.sort((a, b) => b.points - a.points || b.exact - a.exact);
}

function buildPredictionStories(data: GazeteData, W: WeekInfo[], seed: number): Record<string, Story> {
  const T = (id: string) => data.teams.get(id);
  const out: Record<string, Story> = {};
  const latest = W[W.length - 1];
  const week = predWeek(data, latest.id);

  const best = week[0];
  if (best && best.points > 0 && T(best.userId)) {
    const t = T(best.userId)!;
    const tied = week.filter((x) => x.points === best.points && x.exact === best.exact && x.userId !== best.userId);
    out.kahin = {
      id: "kahin",
      kicker: "Kahin",
      team: t,
      headline: pick<Part[]>(
        [
          [{ text: "Haftanın kahini: " }, { text: t.name, hot: true }, { text: ` ${best.points} puan` }],
          [{ text: t.name, hot: true }, { text: " maçları okudu: " }, { text: `${best.exact} tam isabet`, hot: true }, { text: `, ${best.points} puan` }],
          [{ text: "Falcı gibi: " }, { text: t.name, hot: true }, { text: ` tahmin liginde ${best.points} puan topladı` }],
        ],
        seed + 20
      ),
      deck: "Tahmin Yap’ta bu haftanın en çok puan toplayan tahmincisi (tam skor 3, doğru sonuç 1 puan).",
      table: { head: ["Maç", "Tahmin", "Sonuç", "P"], rows: best.rows },
      after: tied.length > 0 ? `Aynı puanda: ${tied.map((x) => T(x.userId)?.name ?? "?").slice(0, 3).join(" · ")}` : undefined,
      full: true,
    };
  }

  const exacts = week.filter((x) => x.exact > 0 && T(x.userId));
  if (exacts.length > 0) {
    const rows: { team: GazeteTeam; label: string; value: string }[] = [];
    for (const x of exacts) for (const m of x.exactMatches) rows.push({ team: T(x.userId)!, label: m, value: "tam skor" });
    out.exact = {
      id: "exact",
      kicker: "Tam isabet",
      headline: [{ text: `${exacts.length} kişi `, hot: true }, { text: "bu hafta skoru tam bildi" }],
      deck: "Maçın skorunu birebir tahmin edenler.",
      rows: rows.slice(0, 8),
      full: true,
    };
  }

  // Sezon kahini
  const total = new Map<string, { pts: number; exact: number }>();
  for (const w of W) {
    for (const x of predWeek(data, w.id)) {
      const cur = total.get(x.userId) ?? { pts: 0, exact: 0 };
      cur.pts += x.points;
      cur.exact += x.exact;
      total.set(x.userId, cur);
    }
  }
  const board = [...total.entries()]
    .filter(([u, v]) => T(u) && v.pts > 0)
    .sort((a, b) => b[1].pts - a[1].pts || b[1].exact - a[1].exact);
  if (board.length > 0) {
    const [lu, lv] = board[0];
    out.kahinseason = {
      id: "kahinseason",
      kicker: "Sezonun kahini",
      headline: [{ text: T(lu)!.name, hot: true }, { text: ` tahmin liginde önde: ${lv.pts} puan` }],
      deck: `Sezon boyunca toplam tahmin puanı. Lider ${lv.exact} kez tam skoru buldu.`,
      fbars: board.slice(0, 5).map(([u, v], i) => ({
        label: `${i + 1}.`,
        pct: Math.round((v.pts / lv.pts) * 100),
        right: `${T(u)!.name} · ${v.pts}`,
        hot: i === 0,
      })),
      full: true,
    };
  }
  return out;
}


// Sayının KENDİ haftasının tahmin raporu: bitmiş maçlar için ligin en çok yazdığı
// skor, gerçek sonuç ve sonucu doğru bilenlerin oranı. (Sonraki haftanın tahminleri
// bu sayıya girmez.)
function buildPredictionReport(data: GazeteData, weekId: number, weekNumber: number): Story | null {
  const fixtures = data.fixtures.get(weekId) ?? [];
  const rows: string[][] = [];
  const participants = new Set<string>();
  let readRight = 0;
  for (const f of fixtures) {
    if (f.ts === null || f.os === null) continue;
    const list: { u: string; tg: number; og: number }[] = [];
    for (const [u, byWeek] of data.predictions) {
      const pr = byWeek.get(weekId)?.get(f.team);
      if (pr) list.push({ u, tg: pr.tg, og: pr.og });
    }
    if (list.length === 0) continue;
    list.forEach((x) => participants.add(x.u));
    const club = CLUB_NAMES[f.team] ?? f.team;
    const home = f.isHome ? club : f.opponent;
    const away = f.isHome ? f.opponent : club;
    const fmt = (a: number, b: number) => (f.isHome ? `${a}–${b}` : `${b}–${a}`);
    const count = new Map<string, number>();
    let right = 0;
    for (const x of list) {
      const key = fmt(x.tg, x.og);
      count.set(key, (count.get(key) ?? 0) + 1);
      if (Math.sign(x.tg - x.og) === Math.sign(f.ts - f.os)) right++;
    }
    const top = [...count.entries()].sort((a, b) => b[1] - a[1])[0];
    if (right * 2 > list.length) readRight++;
    rows.push([`${home} – ${away}`, `${top[0]} (${top[1]} kişi)`, fmt(f.ts, f.os), `%${Math.round((right / list.length) * 100)}`]);
  }
  if (rows.length === 0) return null;
  return {
    id: "predreport",
    kicker: "Tahmin raporu",
    headline: [
      { text: `${participants.size} kişi `, hot: true },
      { text: `${weekNumber}. hafta maçlarını tahmin etti; lig ${rows.length} maçın ${readRight}’ini doğru okudu` },
    ],
    deck: "Her maçta en çok yazılan skor, gerçek sonuç ve sonucu (1-0-2) doğru bilenlerin oranı.",
    table: { head: ["Maç", "En çok tahmin", "Sonuç", "Doğru"], rows },
    full: true,
  };
}

// "Gol bildi": skoru tam tutturamayıp, bir takımın attığı gol sayısını doğru bilenler.
function buildHalfHitStory(data: GazeteData, weekId: number): Story | null {
  const fixtures = data.fixtures.get(weekId) ?? [];
  const T = (id: string) => data.teams.get(id);
  const rows: { team: GazeteTeam; label: string; value: string }[] = [];
  const people = new Set<string>();
  for (const f of fixtures) {
    if (f.ts === null || f.os === null) continue;
    const club = CLUB_NAMES[f.team] ?? f.team;
    const home = f.isHome ? club : f.opponent;
    const away = f.isHome ? f.opponent : club;
    const fmt = (a: number, b: number) => (f.isHome ? `${a}–${b}` : `${b}–${a}`);
    for (const [u, byWeek] of data.predictions) {
      const pr = byWeek.get(weekId)?.get(f.team);
      const t = T(u);
      if (!pr || !t) continue;
      if (pr.tg === f.ts && pr.og === f.os) continue; // tam isabet ayrı haber
      let note = "";
      if (pr.tg === f.ts) note = `${club} ${f.ts} gol`;
      else if (pr.og === f.os) note = `${f.opponent} ${f.os} gol`;
      else continue;
      people.add(u);
      rows.push({ team: t, label: `${home} – ${away} · ${fmt(pr.tg, pr.og)} dedi (sonuç ${fmt(f.ts, f.os)})`, value: `${note} ✓` });
    }
  }
  if (rows.length === 0) return null;
  return {
    id: "halfhit",
    kicker: "Yarım isabet",
    headline: [{ text: `${people.size} kişi `, hot: true }, { text: "skoru tutturamadı ama golü bildi" }],
    deck: "Skoru birebir bilemeyip bir takımın attığı gol sayısını doğru tahmin edenler.",
    rows: rows.slice(0, 8),
    full: true,
  };
}

// ───────────────────────── Kadrolar Açıldı ─────────────────────────

function buildPickStories(
  data: GazeteData,
  squads: Map<string, PickSet>,
  seasonPts: Map<string, number>
): Record<string, Story> {
  const T = (id: string) => data.teams.get(id);
  const out: Record<string, Story> = {};
  const list = [...squads.entries()].filter(([u, sq]) => T(u) && sq.playerIds.length > 0);
  if (list.length < 3) return out;
  const n = list.length;

  // Kaptan oylaması
  const caps = new Map<string, string[]>();
  for (const [u, sq] of list) {
    if (!sq.captainId) continue;
    if (!caps.has(sq.captainId)) caps.set(sq.captainId, []);
    caps.get(sq.captainId)!.push(u);
  }
  const capList = [...caps.entries()].sort((a, b) => b[1].length - a[1].length);
  if (capList.length > 0) {
    const [topId, topUsers] = capList[0];
    const name = data.players.get(topId)?.name ?? "?";
    out.pickcaptain = {
      id: "pickcaptain",
      kicker: "Kaptan oylaması",
      headline: [{ text: "Bandı en çok " }, { text: name, hot: true }, { text: ` taktı: %${Math.round((topUsers.length / n) * 100)}` }],
      deck: `${n} takımın kaptan seçimleri.`,
      fbars: capList.slice(0, 4).map(([id, us], i) => ({
        label: `${us.length}`,
        pct: Math.round((us.length / topUsers.length) * 100),
        right: data.players.get(id)?.name ?? "?",
        hot: i === 0,
      })),
      after: topUsers.length <= 5 ? `${name}: ${topUsers.map((u) => T(u)!.name).join(" · ")}` : undefined,
      full: true,
    };
  }

  // Tek başına seçilenler
  const owners = new Map<string, string[]>();
  for (const [u, sq] of list) for (const p of sq.playerIds) {
    if (!owners.has(p)) owners.set(p, []);
    owners.get(p)!.push(u);
  }
  const solo = [...owners.entries()]
    .filter(([, us]) => us.length === 1)
    .sort((a, b) => (seasonPts.get(b[0]) ?? 0) - (seasonPts.get(a[0]) ?? 0))
    .slice(0, 5);
  if (solo.length > 0) {
    out.picksolo = {
      id: "picksolo",
      kicker: "Tek başına seçilenler",
      headline: [{ text: "Bu hafta kimse " }, { text: "onlara güvenmedi", hot: true }, { text: ", bir takım hariç" }],
      deck: "Sadece tek bir takımın kadrosunda olan oyuncular.",
      rows: solo.map(([p, us]) => ({ team: T(us[0])!, label: data.players.get(p)?.name ?? "?", value: CLUB_NAMES[data.players.get(p)?.club ?? ""] ?? "" })),
      full: true,
    };
  }

  // Kadro ikizleri
  const ov = (a: PickSet, b: PickSet) => {
    const set = new Set(a.playerIds);
    return b.playerIds.filter((p) => set.has(p)).length;
  };
  let most: { a: string; b: string; v: number } | null = null;
  let least: { a: string; b: string; v: number } | null = null;
  for (let i = 0; i < list.length; i++) {
    for (let j = i + 1; j < list.length; j++) {
      const v = ov(list[i][1], list[j][1]);
      if (!most || v > most.v) most = { a: list[i][0], b: list[j][0], v };
      if (!least || v < least.v) least = { a: list[i][0], b: list[j][0], v };
    }
  }
  if (most && least) {
    const size = Math.max(...list.map(([, sq]) => sq.playerIds.length));
    out.picktwins = {
      id: "picktwins",
      kicker: "Kadro ikizleri",
      headline: [{ text: T(most.a)!.name, hot: true }, { text: " ve " }, { text: T(most.b)!.name, hot: true }, { text: ` kadroları ${most.v}/${size} aynı` }],
      deck: `En farklı iki kadro: ${T(least.a)!.name} – ${T(least.b)!.name} (${least.v}/${size} ortak).`,
      rows: [
        { team: T(most.a)!, label: "En benzer", value: `${T(most.b)!.name} · ${most.v}/${size}` },
        { team: T(least.a)!, label: "En farklı", value: `${T(least.b)!.name} · ${least.v}/${size}` },
      ],
      full: true,
    };
  }
  return out;
}

// Haftanın haberi: son haftanın verisinden seçilen tek satırlık not.
function buildQuote(data: GazeteData, W: WeekInfo[], facts: Facts, seed: number): Story | null {
  const T = (id: string) => data.teams.get(id);
  const options: { parts: Part[]; userId: string }[] = [];
  const ww = facts.weekWinner;
  if (ww && T(ww.userId) && facts.weekAvg > 0 && ww.points > facts.weekAvg) {
    options.push({
      userId: ww.userId,
      parts: [
        { text: "Bu hafta " }, { text: T(ww.userId)!.name, hot: true },
        { text: ` ${ww.points} puanla lig ortalamasının ` }, { text: `${ww.points - facts.weekAvg} puan`, hot: true }, { text: " üstüne çıktı." },
      ],
    });
  }
  const cs = facts.latestCaptainStar;
  if (cs && T(cs.userId) && cs.points > 0) {
    options.push({
      userId: cs.userId,
      parts: [
        { text: T(cs.userId)!.name, hot: true }, { text: " takımında kaptan " }, { text: cs.player, hot: true },
        { text: ` bu hafta tek başına ${cs.points} puan getirdi.` },
      ],
    });
  }
  if (facts.race.length >= 2 && T(facts.race[0].userId) && T(facts.race[1].userId)) {
    options.push({
      userId: facts.race[0].userId,
      parts: [
        { text: T(facts.race[0].userId)!.name, hot: true }, { text: " zirvede; kovalayan " },
        { text: T(facts.race[1].userId)!.name, hot: true }, { text: ` sadece ${facts.gapNow} puan geride.` },
      ],
    });
  }
  if (options.length === 0) return null;
  const chosen = pick(options, seed);
  return {
    id: "quote",
    kicker: "Haftanın haberi",
    headline: [],
    quote: chosen.parts,
    team: T(chosen.userId),
    full: true,
  };
}

// weekNumber'a kadar olan tüm veriyle "o günkü" gazeteyi üretir — eski sayılar
// arşivde ayrıca saklanmaz, her seferinde o haftaya kadarki veriden yeniden çıkarılır.
export function buildIssue(data: GazeteData, weekNumber: number): Issue | null {
  const W = data.weeks.filter((w) => w.weekNumber <= weekNumber);
  if (W.length === 0) return null;
  const latest = W[W.length - 1];

  const facts = computeFacts(data, W);
  const stories = buildStories(data, W, facts, latest.weekNumber);
  const quote = buildQuote(data, W, facts, latest.weekNumber);
  if (quote) stories.quote = quote;
  Object.assign(stories, buildPredictionStories(data, W, latest.weekNumber));
  const rep = buildPredictionReport(data, latest.id, latest.weekNumber);
  if (rep) stories.predreport = rep;
  const half = buildHalfHitStory(data, latest.id);
  if (half) stories.halfhit = half;

  // Kadrolar açıldı: en yeni sayıda, pencere kapandıysa şu an oynanan haftanın kadroları;
  // aksi halde (ve eski sayılarda) o sayının kendi haftasının kadroları.
  const isNewest = latest.id === data.weeks[data.weeks.length - 1].id;
  const useLocked = isNewest && data.lockedWeek !== null;
  const squads = useLocked
    ? data.lockedWeek!.picks
    : new Map([...data.picks].map(([u, byWeek]) => [u, byWeek.get(latest.id)] as const).filter((x): x is [string, PickSet] => !!x[1]));
  const pickLabel = useLocked ? `${data.lockedWeek!.weekNumber}. hafta` : weekLabel(latest);
  const seasonPtsAll = new Map<string, number>();
  for (const w of W) for (const [p, st] of data.stats.get(w.id) ?? []) seasonPtsAll.set(p, (seasonPtsAll.get(p) ?? 0) + st.points);
  Object.assign(stories, buildPickStories(data, squads, seasonPtsAll));

  // Manşet: o haftanın en büyük olayı.
  let hero: Story | null = null;
  let heroId: string | null = null;
  const prevFacts = W.length > 1 ? computeFacts(data, W.slice(0, -1)) : null;

  if (facts.weekBest?.isRecord && stories.bestweek) {
    heroId = "bestweek";
  } else if (
    prevFacts &&
    stories.collector &&
    facts.collector[0] &&
    prevFacts.collector[0] &&
    (facts.collector[0].userId !== prevFacts.collector[0].userId ||
      facts.collector[0].value > prevFacts.collector[0].value)
  ) {
    heroId = "collector";
  } else if (
    prevFacts &&
    stories.transfers &&
    sortDesc(facts.transfers)[0] &&
    prevFacts.transfers.length > 0 &&
    (sortDesc(facts.transfers)[0].userId !== sortDesc(prevFacts.transfers)[0].userId ||
      sortDesc(facts.transfers)[0].value > sortDesc(prevFacts.transfers)[0].value)
  ) {
    heroId = "transfers";
  }

  if (heroId) {
    hero = { ...stories[heroId] };
    hero.kicker = `Manşet · ${hero.kicker}`;
    delete stories[heroId];
  } else if (facts.weekWinner && data.teams.get(facts.weekWinner.userId)) {
    const t = data.teams.get(facts.weekWinner.userId)!;
    hero = {
      id: "weekwinner",
      kicker: "Manşet · Haftanın birincisi",
      team: t,
      headline: [{ text: t.name, hot: true }, { text: ` ${latest.weekNumber}. haftanın birincisi: ` }, { text: `${facts.weekWinner.points} puan!`, hot: true }],
      deck: `${latest.weekNumber}. haftayı en yüksek puanla kapatan takım.`,
      bigNumber: String(facts.weekWinner.points),
      bigLabel: "puan · haftanın birincisi",
    };
  }

  const layout: [string, string[]][] = [
    ["Haftanın Haberi", ["quote"]],
    ["Kadro Servisi", ["collector", "loyal", "transfers"]],
    ["Puan Durumu", ["bestweek", "closest", "comeback", "worst", "champion", "riser", "race"]],
    ["Kaptan Köşesi", ["captainhit", "captaingain", "captainchanger", "crowd", "differential"]],
    ["Diziliş Servisi", ["formchanger", "formloyal", "formattack", "formdefence", "formdist", "formpoints", "formmatrix"]],
    ["Tribün Magazin", ["motm", "gentle"]],
    ["Tahmin Köşesi", ["predreport", "kahin", "exact", "halfhit", "kahinseason"]],
    [`Kadrolar Açıldı · ${pickLabel}`, ["pickcaptain", "picksolo", "picktwins"]],
    ["Sezon Rekorları", ["records"]],
  ];

  const sections: Section[] = [];
  for (const [title, ids] of layout) {
    const list = ids.map((id) => stories[id]).filter((s): s is Story => !!s);
    if (list.length === 0) continue;
    // Tam genişlikli haberler sona; tek kalan sütun boş kalmasın diye son haber de genişler.
    const normal = list.filter((s) => !s.full);
    const full = list.filter((s) => s.full);
    if (normal.length % 2 === 1 && normal.length > 0) normal[normal.length - 1] = { ...normal[normal.length - 1], full: true };
    sections.push({ title, stories: [...normal, ...full] });
  }

  return { weekNumber: latest.weekNumber, weekName: weekLabel(latest), hero, sections };
}
