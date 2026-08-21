export type EmblemId =
  | "shield"
  | "star"
  | "crown"
  | "ball"
  | "lion"
  | "lightning"
  | "flame"
  | "trophy"
  | "eagle"
  | "wolf"
  | "diamond"
  | "target";

export const EMBLEMS: { id: EmblemId; label: string }[] = [
  { id: "shield", label: "Kalkan" },
  { id: "star", label: "Yıldız" },
  { id: "crown", label: "Taç" },
  { id: "ball", label: "Top" },
  { id: "lion", label: "Aslan" },
  { id: "lightning", label: "Yıldırım" },
  { id: "flame", label: "Alev" },
  { id: "trophy", label: "Kupa" },
  { id: "eagle", label: "Kartal" },
  { id: "wolf", label: "Kurt" },
  { id: "diamond", label: "Elmas" },
  { id: "target", label: "Hedef" },
];

export const DEFAULT_EMBLEM: EmblemId = "shield";
export const DEFAULT_COLOR1 = "#123524";
export const DEFAULT_COLOR2 = "#E8C766";
