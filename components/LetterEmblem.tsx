import { Oswald } from "next/font/google";
import { LetterShape } from "@/lib/letterEmblem";

const emblemFont = Oswald({ subsets: ["latin", "latin-ext"], weight: "700", display: "swap" });

const GLYPH_W: Record<string, number> = {
  "0": 55, "1": 38, "2": 51, "3": 51, "4": 52, "5": 51, "6": 54, "7": 44, "8": 52, "9": 54,
  A: 55, B: 59, C: 56, D: 59, E: 45, F: 43, G: 58, H: 61, I: 30, J: 35, K: 57, L: 44, M: 70,
  N: 56, O: 59, P: 57, Q: 59, R: 60, S: 51, T: 44, U: 59, V: 53, W: 70, X: 51, Y: 49, Z: 43,
  Ç: 56, Ğ: 58, İ: 30, Ö: 59, Ş: 51, Ü: 59,
};
const CAP_H = 0.81; // Oswald büyük harf yüksekliği (yazı boyuna oranla)
function textWidth(t: string): number {
  return [...t].reduce((sum, ch) => sum + (GLYPH_W[ch] ?? 50), 0) + (t.length - 1) * 1;
}

interface Props {
  shape: LetterShape;
  text: string;
  color1: string; // zemin
  color2: string; // yazı + iç çizgi
  size?: number;
}

// Yuvarlak / kalkan / şerit / altıgen zemin + 1-3 karakter (Oswald Bold yazı tipi). Sadece iki renk kullanır.
export function LetterEmblem({ shape, text, color1, color2, size = 40 }: Props) {
  const ink = color2;
  const fill = color1;
  const ringed = shape !== "serit";
  // Oswald Bold'da harf genişlikleri (100 birimlik yazı boyuna göre). Geniş harfler (M, W) yazıyı küçültür,
  // dar harfler (I, 1) büyük kalır; böylece yazı hiçbir zaman çerçeveden taşmaz.
  const n = Math.min(text.length, 3);
  const maxSize = ringed ? [0, 46, 42, 38][n] : 30;
  const avail = ringed ? 58 : 72;
  const fontSize = Math.min(maxSize, avail / (textWidth(text) / 100));
  // Büyük harflerin görsel ortası: taban çizgisi = merkez + yazı yüksekliğinin yarısı (kalkan biraz aşağıda ortalanır).
  const cy = shape === "kalkan" ? 51 : 50;

  return (
    <svg viewBox="0 0 100 100" width={size} height={size} role="img" aria-label={`Amblem ${text}`}>
      {shape === "yuvarlak" && (
        <>
          <circle cx="50" cy="50" r="46" fill={fill} />
          <circle cx="50" cy="50" r="39" fill="none" stroke={ink} strokeWidth="2.5" opacity="0.9" />
        </>
      )}
      {shape === "kalkan" && (
        <>
          <path d="M50 4 L90 16 V50 C90 74 72 90 50 98 C28 90 10 74 10 50 V16 Z" fill={fill} />
          <path d="M50 12 L82 21 V50 C82 69 68 82 50 89 C32 82 18 69 18 50 V21 Z" fill="none" stroke={ink} strokeWidth="2.5" opacity="0.9" />
        </>
      )}
      {shape === "serit" && (
        <>
          <path d="M4 26 H96 L86 50 L96 74 H4 L14 50 Z" fill={fill} />
          <path d="M12 31 H88 M12 69 H88" stroke={ink} strokeWidth="2.5" opacity="0.9" />
        </>
      )}
      {shape === "altigen" && (
        <>
          <polygon points="50,3 91,26.5 91,73.5 50,97 9,73.5 9,26.5" fill={fill} />
          <polygon points="50,12 83,31 83,69 50,88 17,69 17,31" fill="none" stroke={ink} strokeWidth="2.5" opacity="0.9" />
        </>
      )}
      <text
        x="50"
        y={cy + fontSize * CAP_H / 2}
        textAnchor="middle"
        dominantBaseline="alphabetic"
        fontFamily={emblemFont.style.fontFamily}
        fontWeight={700}
        letterSpacing={0.5}
        fontSize={Math.round(fontSize * 10) / 10}
        fill={ink}
      >
        {text}
      </text>
    </svg>
  );
}
