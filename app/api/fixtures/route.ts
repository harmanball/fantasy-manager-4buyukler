export const revalidate = 3600; // 1 saat — aynı veriyi her istekte yeniden çekmemek için

interface TSDBEvent {
  strHomeTeam: string;
  strAwayTeam: string;
  dateEvent: string;
  strTime: string | null;
  strVenue: string | null;
}

export type TrackedTeamCode = "GS" | "FB" | "BJK" | "TS";

export interface TrackedFixture {
  team: TrackedTeamCode;
  opponent: string;
  isHome: boolean;
  date: string;
  time: string;
  venue: string | null;
}

// TheSportsDB'deki Türkiye Süper Lig ligi id'si.
const LEAGUE_ID = "4339";

// TheSportsDB takım adlarını Türkçe karaktersiz (Fenerbahce, Besiktas gibi)
// yazabiliyor — bu yüzden karşılaştırmayı Türkçe karakterleri sadeleştirip
// küçük harfe çevirerek, "içeriyor mu" mantığıyla yapıyoruz.
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

export async function GET() {
  try {
    const res = await fetch(
      `https://www.thesportsdb.com/api/v1/json/123/eventsnextleague.php?id=${LEAGUE_ID}`,
      { next: { revalidate: 3600 } }
    );

    if (!res.ok) {
      return Response.json(
        { fixtures: [], error: "Fikstür kaynağına ulaşılamadı" },
        { status: 502 }
      );
    }

    const data = await res.json();
    const events: TSDBEvent[] = data?.events ?? [];

    const fixtures: TrackedFixture[] = [];
    for (const t of TRACKED) {
      // Her takım için sıradaki İLK maçı buluyoruz (liste zaten tarihe göre sıralı).
      const match = events.find((e) => {
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
        date: match.dateEvent,
        time: match.strTime ? match.strTime.slice(0, 5) : "",
        venue: match.strVenue ?? null,
      });
    }

    return Response.json({ fixtures });
  } catch (err) {
    console.error("Fikstür çekilemedi:", err);
    return Response.json({ fixtures: [], error: "Fikstür çekilemedi" }, { status: 500 });
  }
}
