export const revalidate = 3600; // 1 saat — aynı veriyi her istekte yeniden çekmemek için

interface TSDBEvent {
  strHomeTeam: string;
  strAwayTeam: string;
  dateEvent: string;
  dateEventLocal: string | null;
  strTime: string | null;
  strTimeLocal: string | null;
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

// TheSportsDB'deki futbol takımı id'leri (thesportsdb.com/team/<id> sayfa
// linklerinden doğrulandı). NOT: eventsnextleague.php (lig bazlı, toplu
// sorgu) ücretsiz anahtarla sadece TEK bir sonuç döndürüyor — bu yüzden
// her takım için ayrı ayrı eventsnext.php (takım bazlı, "sıradaki 5 maç")
// kullanıyoruz. Bu, tek bir toplu çağrının kısıtına takılmıyor.
const TRACKED: { code: TrackedTeamCode; teamId: string }[] = [
  { code: "GS", teamId: "133804" }, // Galatasaray
  { code: "FB", teamId: "133807" }, // Fenerbahçe
  { code: "BJK", teamId: "133794" }, // Beşiktaş
  { code: "TS", teamId: "133796" }, // Trabzonspor
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

async function fetchNextForTeam(
  code: TrackedTeamCode,
  teamId: string
): Promise<TrackedFixture | null> {
  try {
    const res = await fetch(
      `https://www.thesportsdb.com/api/v1/json/123/eventsnext.php?id=${teamId}`,
      { next: { revalidate: 3600 } }
    );
    if (!res.ok) return null;

    const data = await res.json();
    const events: TSDBEvent[] = data?.events ?? [];
    if (events.length === 0) return null;

    // Süper Lig dışı (kupa, hazırlık maçı vb.) karışmasın diye takımın
    // adı hem ev sahibi hem deplasmanda geçen ilk kaydı alıyoruz —
    // eventsnext zaten o takımın TÜM branşlar/turnuvalar için sıradaki
    // maçlarını döndürdüğünden, ilk sonuç normalde ligdeki bir sonraki
    // maçtır.
    const match = events[0];
    const keyword = normalize(code === "GS" ? "galatasaray" : code === "FB" ? "fenerbahce" : code === "BJK" ? "besiktas" : "trabzonspor");
    const isHome = normalize(match.strHomeTeam ?? "").includes(keyword);

    return {
      team: code,
      opponent: isHome ? match.strAwayTeam : match.strHomeTeam,
      isHome,
      // UTC gece yarısına yakın maçlarda tarih bir gün kayabileceği için
      // (Türkiye +3 saat ileride), varsa dateEventLocal'ı tercih ediyoruz.
      date: match.dateEventLocal || match.dateEvent,
      // strTime UTC'dir — strTimeLocal, maçın oynandığı yerin (Türkiye'nin)
      // yerel saatidir. Türkiye saatini göstermek için bunu kullanıyoruz,
      // strTime'ı DEĞİL (aksi halde saat 3 saat geride görünür).
      time: match.strTimeLocal
        ? match.strTimeLocal.slice(0, 5)
        : match.strTime
        ? match.strTime.slice(0, 5)
        : "",
      venue: match.strVenue ?? null,
    };
  } catch (err) {
    console.error(`${code} için fikstür çekilemedi:`, err);
    return null;
  }
}

export async function GET() {
  try {
    const results = await Promise.all(
      TRACKED.map((t) => fetchNextForTeam(t.code, t.teamId))
    );
    const fixtures = results.filter((f): f is TrackedFixture => f !== null);
    return Response.json({ fixtures });
  } catch (err) {
    console.error("Fikstür çekilemedi:", err);
    return Response.json({ fixtures: [], error: "Fikstür çekilemedi" }, { status: 500 });
  }
}
