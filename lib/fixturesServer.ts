export type TrackedTeamCode = "GS" | "FB" | "BJK" | "TS";

export interface TrackedFixture {
  team: TrackedTeamCode;
  opponent: string;
  isHome: boolean;
  date: string;
  time: string;
  venue: string | null;
}

// ESPN'in kendi sitesinde kullandığı, herkese açık ve anahtar/kayıt
// gerektirmeyen uç noktası. Resmi/belgelenmiş değil ("gizli" API) ama
// TheSportsDB'nin aksine topluluk kaynaklı değil, ESPN'in kendi ticari
// verisi — TFF'nin son dakika saat/tarih değişikliklerini çok daha
// hızlı yansıtması bekleniyor. Süper Lig kodu: "tur.1".
const ESPN_BASE = "https://site.api.espn.com/apis/site/v2/sports/soccer/tur.1";

// Türkiye yaz/kış saati uygulamıyor, her zaman sabit UTC+3.
const TURKEY_OFFSET_MS = 3 * 60 * 60 * 1000;

const TRACKED: { code: TrackedTeamCode; espnId: string }[] = [
  { code: "GS", espnId: "432" }, // Galatasaray
  { code: "FB", espnId: "436" }, // Fenerbahçe
  { code: "BJK", espnId: "1895" }, // Beşiktaş
  { code: "TS", espnId: "997" }, // Trabzonspor
];

interface ESPNCompetitor {
  homeAway: "home" | "away";
  team: { displayName: string };
}

interface ESPNEvent {
  date: string; // UTC ISO, örn. "2026-09-04T17:00Z"
  competitions: {
    venue?: { fullName?: string };
    competitors: ESPNCompetitor[];
  }[];
}

interface ESPNScheduleResponse {
  events?: ESPNEvent[];
}

function toTurkeyDateTime(utcIso: string): { date: string; time: string } {
  const utcDate = new Date(utcIso);
  if (isNaN(utcDate.getTime())) return { date: "", time: "" };
  const turkeyDate = new Date(utcDate.getTime() + TURKEY_OFFSET_MS);
  return {
    date: turkeyDate.toISOString().slice(0, 10),
    time: turkeyDate.toISOString().slice(11, 16),
  };
}

async function fetchNextFixtureForTeam(
  code: TrackedTeamCode,
  espnId: string
): Promise<TrackedFixture | null> {
  try {
    const res = await fetch(
      `${ESPN_BASE}/teams/${espnId}/schedule?fixture=true`,
      { next: { revalidate: 3600 } }
    );
    if (!res.ok) return null;

    const data = (await res.json()) as ESPNScheduleResponse;
    const events = data.events ?? [];
    const now = new Date();

    // events sezonun geri kalanını (bugünden itibaren) kronolojik sırayla
    // içeriyor — yine de güvenlik için tarihi geçmiş olanları eleyip ilk
    // gerçekten gelecekteki maçı alıyoruz.
    const next = events.find((e) => new Date(e.date) > now);
    if (!next || !next.competitions?.[0]) return null;

    const comp = next.competitions[0];
    const self = comp.competitors.find(
      (c) => normalizeName(c.team.displayName) === teamKeyword(code)
    );
    const opponent = comp.competitors.find(
      (c) => normalizeName(c.team.displayName) !== teamKeyword(code)
    );
    if (!self || !opponent) return null;

    const { date, time } = toTurkeyDateTime(next.date);
    if (!date) return null;

    return {
      team: code,
      opponent: opponent.team.displayName,
      isHome: self.homeAway === "home",
      date,
      time,
      venue: comp.venue?.fullName ?? null,
    };
  } catch (err) {
    console.error(`${code} için fikstür çekilemedi:`, err);
    return null;
  }
}

function normalizeName(s: string): string {
  return s
    .toLocaleLowerCase("tr")
    .replace(/ş/g, "s")
    .replace(/ç/g, "c")
    .replace(/ğ/g, "g")
    .replace(/ı/g, "i")
    .replace(/ö/g, "o")
    .replace(/ü/g, "u");
}

function teamKeyword(code: TrackedTeamCode): string {
  switch (code) {
    case "GS":
      return "galatasaray";
    case "FB":
      return "fenerbahce";
    case "BJK":
      return "besiktas";
    case "TS":
      return "trabzonspor";
  }
}

// 4 büyüklerin sıradaki maçlarını (hem iç saha hem deplasman, kronolojik
// sıralı, Türkiye saatiyle) döndürür. Hem /api/fixtures route'u (istemci
// tarafı kartlar için) hem admin route'ları (hafta deadline'ını hesaplamak
// için) bu AYNI fonksiyonu kullanır.
export async function fetchTrackedFixturesServer(): Promise<TrackedFixture[]> {
  const results = await Promise.all(
    TRACKED.map((t) => fetchNextFixtureForTeam(t.code, t.espnId))
  );
  const fixtures = results.filter((f): f is TrackedFixture => f !== null);

  fixtures.sort((a, b) => {
    const aKey = `${a.date}T${a.time || "00:00"}`;
    const bKey = `${b.date}T${b.time || "00:00"}`;
    return aKey.localeCompare(bKey);
  });

  return fixtures;
}
