import { supabase } from "./supabase";
import { EmblemId, DEFAULT_EMBLEM, DEFAULT_COLOR1, DEFAULT_COLOR2 } from "./emblems";

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
}

export interface GazeteData {
  weeks: WeekInfo[]; // biten haftalar, eskiden yeniye
  teams: Map<string, GazeteTeam>;
  scores: Map<string, Map<number, number>>; // kullanıcı -> hafta -> puan
  picks: Map<string, Map<number, PickSet>>; // kullanıcı -> hafta -> kadro
  stats: Map<number, Map<string, StatRow>>; // hafta -> oyuncu -> istatistik
  players: Map<string, PlayerInfo>;
  captainMult: number;
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
  };
  if (weeks.length === 0) return empty;

  const [profiles, scoreRows, pickRows, statRows, playerRows, settingRows] =
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
      fetchAll("players", "id, name, teams(short_code)", ["id"]),
      supabase.from("game_settings").select("key, value").eq("key", "captain_multiplier"),
    ]);

  const finishedIds = new Set(weeks.map((w) => w.id));

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
    set.playerIds.push(r.player_id as string);
    if (r.is_captain) set.captainId = r.player_id as string;
  }

  const stats = new Map<number, Map<string, StatRow>>();
  for (const r of statRows) {
    const gw = r.gameweek_id as number;
    if (!finishedIds.has(gw)) continue;
    if (!stats.has(gw)) stats.set(gw, new Map());
    stats.get(gw)!.set(r.player_id as string, {
      points: (r.points as number) ?? 0,
      minutes: (r.minutes as number) ?? 0,
      motm: !!r.is_motm,
      yellow: (r.yellow_card as number) ?? 0,
      red: (r.red_card as number) ?? 0,
    });
  }

  const players = new Map<string, PlayerInfo>();
  for (const r of playerRows) {
    const rel = r.teams as { short_code: string } | { short_code: string }[] | null;
    const club = Array.isArray(rel) ? rel[0]?.short_code : rel?.short_code;
    players.set(r.id as string, {
      id: r.id as string,
      name: r.name as string,
      club: club ?? "?",
    });
  }

  const mult = ((settingRows.data ?? []) as Row[])[0]?.value;
  const captainMult = typeof mult === "number" ? mult : Number(mult ?? 2) || 2;

  return { weeks, teams, scores, picks, stats, players, captainMult };
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
  stable: (Entry & { min: number; max: number })[];
  champions: Entry[];
  longestStreak: Map<string, number>;
  riser: (Entry & { weekLabel: string }) | null;
  faller: (Entry & { weekLabel: string }) | null;
  captainHits: Entry[];
  captainGain: Entry[];
  ownership: { label: string; pct: number }[];
  differential: { userId: string; player: string; pct: number; points: number } | null;
  motmHunters: Entry[];
  cards: (Entry & { yellow: number; red: number })[];
  clubFans: { userId: string; club: string; pct: number }[];
  weekWinner: { userId: string; points: number } | null; // son haftanın birincisi
}

function weekLabel(w: WeekInfo): string {
  return w.name || `${w.weekNumber}. hafta`;
}

function computeFacts(data: GazeteData, W: WeekInfo[]): Facts {
  const weekIds = W.map((w) => w.id);
  const latest = W[W.length - 1];

  // Kadro kaydı çok eksik olan takımlar sayılı kartlara girmez (haksız olmasın).
  const coverage = new Map<string, number>();
  for (const [u, byWeek] of data.picks) {
    coverage.set(u, weekIds.filter((id) => byWeek.has(id)).length);
  }
  const minCoverage = Math.max(1, W.length - 1);
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
  for (let k = 1; k < weekIds.length; k++) {
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

  const seasonPoints = new Map<string, number>();
  for (const w of W) {
    for (const [p, st] of data.stats.get(w.id) ?? []) {
      seasonPoints.set(p, (seasonPoints.get(p) ?? 0) + st.points);
    }
  }
  let differential: Facts["differential"] = null;
  if (squadCount >= 4) {
    for (const [u, s] of latestSquads) {
      for (const p of s.playerIds) {
        const pct = Math.round(((owners.get(p) ?? 0) / squadCount) * 100);
        const pts = seasonPoints.get(p) ?? 0;
        if (pct <= 25 && pts > 0 && (!differential || pts > differential.points)) {
          differential = { userId: u, player: data.players.get(p)?.name ?? "?", pct, points: pts };
        }
      }
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

  return {
    collector,
    loyal: sortAsc(collector),
    transfers,
    bestWeek,
    bestWeekRunners,
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
          [{ text: "Kadro kapısı hiç kapanmadı: " }, { text: t.name, hot: true }, { text: ` ${c1.value} farklı isim denedi` }],
        ],
        seed
      ),
      deck: "Sezon boyunca kadrosuna en çok farklı oyuncuyu katan takım.",
      bigNumber: String(c1.value),
      bigLabel: "farklı futbolcu kullandı",
      after: after(facts.collector, data, (e) => String(e.value)),
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
      after: after(facts.loyal, data, (e) => String(e.value)),
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
          [{ text: t.name, hot: true }, { text: " transfer piyasasını salladı: " }, { text: `${t1.value} değişiklik`, hot: true }],
        ],
        seed + 2
      ),
      deck: "Haftalar arasında kadrosuna en çok yeni oyuncu alan takım.",
      after: after(sortDesc(facts.transfers), data, (e) => String(e.value)),
    });
  }

  // En yüksek hafta
  const bw = facts.bestWeek;
  if (bw && T(bw.userId)) {
    const t = T(bw.userId)!;
    add({
      id: "bestweek",
      kicker: "Sezonun en yüksek haftası",
      team: t,
      headline: pick<Part[]>(
        [
          [{ text: t.name, hot: true }, { text: " tek haftada " }, { text: `${bw.value} puan`, hot: true }, { text: " topladı" }],
          [{ text: "Rekor " }, { text: t.name, hot: true }, { text: "’den: " }, { text: `${bw.value} puan!`, hot: true }],
        ],
        seed + 3
      ),
      deck: `${bw.weekLabel}da alınan puan, sezonun rekoru.`,
      bigNumber: String(bw.value),
      bigLabel: "puan · tek hafta",
      after: facts.bestWeekRunners[0]
        ? `Ardından: ${T(facts.bestWeekRunners[0].userId)?.name ?? "?"} (${facts.bestWeekRunners[0].value})`
        : undefined,
    });
  }

  // İstikrar
  const s1 = facts.stable[0];
  if (s1 && T(s1.userId)) {
    const t = T(s1.userId)!;
    add({
      id: "stable",
      kicker: "İstikrar ödülü",
      team: t,
      headline: pick<Part[]>(
        [
          [{ text: t.name, hot: true }, { text: " hiç şaşmadı: " }, { text: `±${Math.round(s1.value)}`, hot: true }],
          [{ text: "Saat gibi çalışıyor: " }, { text: t.name, hot: true }, { text: ` haftalık puanı ${s1.min}–${s1.max} arasında` }],
        ],
        seed + 4
      ),
      deck: `Haftalık puanları birbirine en yakın takım; hep ${s1.min}–${s1.max} arasında kaldı.`,
      after: facts.stable[1]
        ? `Ardından: ${T(facts.stable[1].userId)?.name ?? "?"} (±${Math.round(facts.stable[1].value)})`
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
      deck: `${facts.riser.weekLabel}da genel sıralamada en çok yer atlayan takım.`,
      after:
        facts.faller && T(facts.faller.userId)
          ? `Düşen: ${T(facts.faller.userId)!.name} −${facts.faller.value} (${facts.faller.weekLabel})`
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
          [{ text: "Kaptanlık " }, { text: t.name, hot: true }, { text: "’ye " }, { text: `+${g1.value} puan`, hot: true }, { text: " kazandırdı" }],
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
      headline: [{ text: t.name, hot: true }, { text: ", az kişinin görebildiği " }, { text: d.player, hot: true }, { text: "’yu keşfetti" }],
      deck: `Takımların sadece %${d.pct}’inde bulunan oyuncu sezonda ${d.points} puan getirdi.`,
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
          [{ text: t.name, hot: true }, { text: "’in oyuncuları " }, { text: `${m1.value} kez`, hot: true }, { text: " Maçın Yıldızı seçildi" }],
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
        headline: [{ text: t.name, hot: true }, { text: "’de fair play: sezonda sadece " }, { text: `${total} kart`, hot: true }],
        deck: "Kadrosundaki oyuncular sezonda en az kart gören takım.",
        after:
          T(rough.userId) && rough.userId !== gentle.userId
            ? `En haşin: ${T(rough.userId)!.name} · ${rough.yellow} sarı, ${rough.red} kırmızı`
            : undefined,
      });
    }
  }

  // Kulüp hayranı
  const f1 = facts.clubFans[0];
  if (f1 && T(f1.userId)) {
    const t = T(f1.userId)!;
    add({
      id: "fan",
      kicker: "Kulüp hayranı",
      team: t,
      headline: [{ text: t.name, hot: true }, { text: "’nin kadrosu " }, { text: `%${f1.pct} ${CLUB_ADJ[f1.club]}`, hot: true }],
      deck: "Kadrosunu en çok tek bir kulübün oyuncularıyla dolduran takım.",
      after:
        facts.clubFans.slice(1).map((f) => `${CLUB_NAMES[f.club]}: ${T(f.userId)?.name ?? "?"} %${f.pct}`).join(" · ") ||
        undefined,
      full: true,
    });
  }

  return out;
}

// weekNumber'a kadar olan tüm veriyle "o günkü" gazeteyi üretir — eski sayılar
// arşivde ayrıca saklanmaz, her seferinde o haftaya kadarki veriden yeniden çıkarılır.
export function buildIssue(data: GazeteData, weekNumber: number): Issue | null {
  const W = data.weeks.filter((w) => w.weekNumber <= weekNumber);
  if (W.length === 0) return null;
  const latest = W[W.length - 1];

  const facts = computeFacts(data, W);
  const stories = buildStories(data, W, facts, latest.weekNumber);

  // Manşet: o haftanın en büyük olayı.
  let hero: Story | null = null;
  let heroId: string | null = null;
  const prevFacts = W.length > 1 ? computeFacts(data, W.slice(0, -1)) : null;

  if (facts.bestWeek && facts.bestWeek.weekId === latest.id && stories.bestweek && W.length > 1) {
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
    ["Kadro Servisi", ["collector", "loyal", "transfers"]],
    ["Puan Durumu", ["bestweek", "stable", "champion", "riser"]],
    ["Kaptan Köşesi", ["captainhit", "captaingain", "crowd", "differential"]],
    ["Tribün Magazin", ["motm", "gentle", "fan"]],
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
