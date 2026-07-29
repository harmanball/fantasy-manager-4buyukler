export interface ParsedStatRow {
  team: string;
  name: string;
  minutes: number;
  goals: number;
  assists: number;
  cleanSheet: boolean;
  yellow: number;
  red: number;
  ownGoal: number;
  penMissed: number;
  rating: number | null;
  motm: boolean;
  raw: string;
  fieldCountOk: boolean;
}

const EXPECTED_FIELDS = 12;

// Format: TAKIM|OYUNCU|DAKİKA|GOL|ASİST|TEMİZKALE|SARI|KIRMIZI|KKGOL|PENKAÇAN|MAÇPUANI|MOTM
export function parseStatsBlock(text: string): ParsedStatRow[] {
  return text
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !l.startsWith("#"))
    .map((line) => {
      const parts = line.split("|").map((p) => p.trim());
      const [team, name, minutes, goals, assists, cleanSheet, yellow, red, ownGoal, penMissed, rating, motm] = parts;
      return {
        team: team ?? "",
        name: name ?? "",
        minutes: Number(minutes) || 0,
        goals: Number(goals) || 0,
        assists: Number(assists) || 0,
        cleanSheet: cleanSheet === "1",
        yellow: Number(yellow) || 0,
        red: Number(red) || 0,
        ownGoal: Number(ownGoal) || 0,
        penMissed: Number(penMissed) || 0,
        rating: rating ? Number(rating) : null,
        motm: motm === "1",
        raw: line,
        fieldCountOk: parts.length === EXPECTED_FIELDS,
      };
    });
}
