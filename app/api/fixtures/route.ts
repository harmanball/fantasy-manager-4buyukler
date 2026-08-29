export const revalidate = 3600; // 1 saat — aynı veriyi her istekte yeniden çekmemek için

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
//
// NOT: Önceden eventsnext.php (takım bazlı "sıradaki maç") kullanılıyordu,
// ama TheSportsDB'nin dokümantasyonu şunu açıkça belirtiyor: "free key
// only shows home event" — yani ücretsiz anahtarla bu uç nokta SADECE
// takımın bir sonraki İÇ SAHA maçını döndürüyor, kronolojik olarak
// gerçekten sıradaki maçı değil. Bir takımın sıradaki maçı deplasmansa
// (örn. bu hafta BJK/TS için), o veri API'den hiç gelmiyor — doğrudan
// takımın bir sonraki iç saha maçına (genelde Avrupa kupası) atlıyor.
//
// Bunun yerine artık GÜNE göre sorguluyoruz (eventsday.php + lig
// filtresi) — bu uç nokta takım bazlı değil, o gün oynanan TÜM Süper Lig
// maçlarını (hem iç saha hem deplasman) döndürüyor. Önümüzdeki birkaç
// günü tek tek tarayıp 4 kulübü arıyoruz.
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

export async function GET() {
  try {
    const today = new Date();
    const dayStrings = Array.from({ length: DAYS_TO_SCAN }, (_, i) => {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      return formatDateParam(d);
    });

    const dayResults = await Promise.all(dayStrings.map(fetchEventsForDay));
    const allEvents = dayResults.flat();

    // Tarihe göre sırala (eventsday zaten günlük geldiği için bu esasen
    // günler arası sırayı garantiliyor).
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
        // strTime UTC'dir — strTimeLocal, maçın oynandığı yerin (Türkiye'nin)
        // yerel saatidir.
        time: match.strTimeLocal
          ? match.strTimeLocal.slice(0, 5)
          : match.strTime
          ? match.strTime.slice(0, 5)
          : "",
        venue: match.strVenue ?? null,
      });
    }

    // Sabit takım sırası yerine (her zaman GS önce gibi), gerçek maç
    // tarih/saatine göre kronolojik sıralıyoruz — ilk oynanacak maç en
    // üstte çıksın diye.
    fixtures.sort((a, b) => {
      const aKey = `${a.date}T${a.time || "00:00"}`;
      const bKey = `${b.date}T${b.time || "00:00"}`;
      return aKey.localeCompare(bKey);
    });

    return Response.json({ fixtures });
  } catch (err) {
    console.error("Fikstür çekilemedi:", err);
    return Response.json({ fixtures: [], error: "Fikstür çekilemedi" }, { status: 500 });
  }
}
