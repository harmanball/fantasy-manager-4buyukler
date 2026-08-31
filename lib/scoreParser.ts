export interface ParsedScoreLine {
  team: string;
  teamScore: number;
  opponentScore: number;
}

// Veri bloğunun başındaki isteğe bağlı "# SKOR|TS|2|1" satırlarını
// ayrıştırır — "TS kendi maçında 2, rakip 1 attı" demek. Bu satırlar zaten
// "#" ile başladığı için lib/statsParser.ts'in oyuncu satırı ayrıştırıcısı
// tarafından otomatik olarak yorum satırı sayılıp atlanıyor — bu fonksiyon
// AYNI metni ayrıca tarayıp sadece bu özel formatı yakalıyor.
export function parseScoreLines(text: string): ParsedScoreLine[] {
  const lines = text.split("\n").map((l) => l.trim());
  const scores: ParsedScoreLine[] = [];
  for (const line of lines) {
    const match = line.match(/^#\s*SKOR\s*\|\s*([A-Za-z]+)\s*\|\s*(\d+)\s*\|\s*(\d+)/i);
    if (match) {
      scores.push({
        team: match[1].toUpperCase(),
        teamScore: Number(match[2]),
        opponentScore: Number(match[3]),
      });
    }
  }
  return scores;
}
