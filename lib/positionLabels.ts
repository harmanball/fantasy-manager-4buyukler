export const POSITION_LABELS: Record<string, string> = {
  GK: "KALECİ",
  DEF: "DEFANS",
  MID: "ORTA SAHA",
  FWD: "SANTRFOR",
};

export function positionLabel(pos: string): string {
  return POSITION_LABELS[pos] ?? pos;
}
