export type TeamCode = "GS" | "FB" | "BJK" | "TS";

export const TEAMS: Record<
  TeamCode,
  { name: string; c1: string; c2: string; needsRing?: boolean }
> = {
  GS: { name: "Galatasaray", c1: "#A32638", c2: "#B8860B" },
  FB: { name: "Fenerbahçe", c1: "#FFED00", c2: "#00338D" },
  BJK: { name: "Beşiktaş", c1: "#000000", c2: "#FFFFFF", needsRing: true },
  TS: { name: "Trabzonspor", c1: "#7A1E3C", c2: "#5CB8E4" },
};

export const TEAM_LIMIT = 3;
export const SQUAD_SIZE = 11;

export const FORMATIONS = [
  "4-4-2",
  "4-5-1",
  "4-3-3",
  "3-4-3",
  "3-5-2",
  "5-4-1",
  "5-3-2",
] as const;

export type Formation = (typeof FORMATIONS)[number];

export const FORMATION_LAYOUT: Record<
  Formation,
  { GK: number; DEF: number; MID: number; FWD: number }
> = {
  "4-4-2": { GK: 1, DEF: 4, MID: 4, FWD: 2 },
  "4-5-1": { GK: 1, DEF: 4, MID: 5, FWD: 1 },
  "4-3-3": { GK: 1, DEF: 4, MID: 3, FWD: 3 },
  "3-4-3": { GK: 1, DEF: 3, MID: 4, FWD: 3 },
  "3-5-2": { GK: 1, DEF: 3, MID: 5, FWD: 2 },
  "5-4-1": { GK: 1, DEF: 5, MID: 4, FWD: 1 },
  "5-3-2": { GK: 1, DEF: 5, MID: 3, FWD: 2 },
};
