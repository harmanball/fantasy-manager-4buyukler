// Harfli amblem: mevcut amblemlerin YERİNE değil, yanında duran isteğe bağlı bir seçenek.
// Ayrı bir veritabanı sütunu gerekmez: amblem kimliği "harf:<şekil>:<yazı>" biçiminde
// (ör. "harf:altigen:SB") mevcut `emblem` alanına yazılır. Zemin rengi = team_color1,
// yazı rengi = team_color2 (mevcut renk alanları).

export const LETTER_SHAPES = ["yuvarlak", "kalkan", "serit", "altigen"] as const;
export type LetterShape = (typeof LETTER_SHAPES)[number];

export const LETTER_SHAPE_LABELS: Record<LetterShape, string> = {
  yuvarlak: "Yuvarlak",
  kalkan: "Kalkan",
  serit: "Şerit",
  altigen: "Altıgen",
};

const PREFIX = "harf:";

// Yazıyı temizler: büyük harf (Türkçe), sadece harf/rakam, en fazla 2 karakter.
export function cleanLetterText(raw: string): string {
  return raw
    .toLocaleUpperCase("tr")
    .replace(/[^0-9A-ZÇĞİÖŞÜ]/g, "")
    .slice(0, 2);
}

export function isLetterEmblem(id: string | null | undefined): boolean {
  return !!id && id.startsWith(PREFIX);
}

export function buildLetterEmblem(shape: LetterShape, text: string): string {
  return `${PREFIX}${shape}:${cleanLetterText(text) || "?"}`;
}

export function parseLetterEmblem(id: string | null | undefined): { shape: LetterShape; text: string } | null {
  if (!id || !id.startsWith(PREFIX)) return null;
  const [, shape, text] = id.split(":");
  if (!(LETTER_SHAPES as readonly string[]).includes(shape)) return null;
  return { shape: shape as LetterShape, text: cleanLetterText(text ?? "") || "?" };
}
