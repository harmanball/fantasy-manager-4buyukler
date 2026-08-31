export type TrackedTeamCode = "GS" | "FB" | "BJK" | "TS";

export interface TrackedFixture {
  team: TrackedTeamCode;
  opponent: string;
  isHome: boolean;
  date: string;
  time: string;
  venue: string | null;
}

interface TSDBEvent {
  strHomeTeam: string;
  strAwayTeam: string;
  dateEvent: string;
  dateEventLocal: string | null;
  strTime: string | null;
  strTimeLocal: string | null;
  strVenue: string | null;
  idLeague: string | null;
}

// TheSportsDB'deki Türkiye Süper Lig ligi id'si.
const SUPER_LIG_ID = "4339";
const DAYS_TO_SCAN = 10;

const TRACKED: { code: TrackedTeamCode; keyword: string }[] = [
  { code: "GS", keyword: "galatasaray" },
  { code: "FB", keyword: "fenerbahce" },
  { code: "BJK", keyword: "besiktas" },
  { code: "TS", keyword: "trabzonspor" },
];

function normalize(s: string): string {
  return s
    .toLocaleLowerCase("tr")
    .replace(/ş/g, "s")
    .replace(/ç/g, "c")
    .replace(/ğ/g, "g")
    .replace(/ı/g, "i")
    .replace(/ö/g, "o")
    .replace(/ü/g, "u");
}

function formatDateParam(d: Date): string {
  return d.toISOString().slice(0, 10); // YYYY-MM-DD
}

async function fetchEventsForDay(dateStr: string): Promise<TSDBEvent[]> {
  try {
    const res = await fetch(
      `https://www.thesportsdb.com/api/v1/json/123/eventsday.php?d=${dateStr}&l=${SUPER_LIG_ID}`,
      { next: { revalidate: 3600 } }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return (data?.events as TSDBEvent[]) ?? [];
  } catch (err) {
    console.error(`${dateStr} için maçlar çekilemedi:`, err);
    return [];
  }
}

// 4 büyüklerin sıradaki maçlarını (hem iç saha hem deplasman, kronolojik
// sıralı) döndürür. Hem /api/fixtures route'u (istemci tarafı kartlar
// için) hem admin route'ları (hafta deadline'ını hesaplamak için) bu
// AYNI fonksiyonu kullanır — iki ayrı yerde iki farklı fikstür mantığı
// olmasın diye.
export async function fetchTrackedFixturesServer(): Promise<TrackedFixture[]> {
  try {
    const today = new Date();
    const dayStrings = Array.from({ length: DAYS_TO_SCAN }, (_, i) => {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      return formatDateParam(d);
    });

    const dayResults = await Promise.all(dayStrings.map(fetchEventsForDay));
    const allEvents = dayResults.flat();
    allEvents.sort((a, b) => (a.dateEvent < b.dateEvent ? -1 : 1));

    const fixtures: TrackedFixture[] = [];
    for (const t of TRACKED) {
      const match = allEvents.find((e) => {
        const home = normalize(e.strHomeTeam ?? "");
        const away = normalize(e.strAwayTeam ?? "");
        return home.includes(t.keyword) || away.includes(t.keyword);
      });
      if (!match) continue;

      const isHome = normalize(match.strHomeTeam ?? "").includes(t.keyword);
      fixtures.push({
        team: t.code,
        opponent: isHome ? match.strAwayTeam : match.strHomeTeam,
        isHome,
        date: match.dateEventLocal || match.dateEvent,
        time: match.strTimeLocal
          ? match.strTimeLocal.slice(0, 5)
          : match.strTime
          ? match.strTime.slice(0, 5)
          : "",
        venue: match.strVenue ?? null,
      });
    }

    fixtures.sort((a, b) => {
      const aKey = `${a.date}T${a.time || "00:00"}`;
      const bKey = `${b.date}T${b.time || "00:00"}`;
      return aKey.localeCompare(bKey);
    });

    return fixtures;
  } catch (err) {
    console.error("Fikstür çekilemedi:", err);
    return [];
  }
}
