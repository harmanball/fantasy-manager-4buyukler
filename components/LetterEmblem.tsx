import { Teko } from "next/font/google";
import { LetterShape } from "@/lib/letterEmblem";

const emblemFont = Teko({ subsets: ["latin", "latin-ext"], weight: "700", display: "swap" });

const GLYPH_W: Record<string, number> = {
  "0": 50, "1": 32, "2": 47, "3": 48, "4": 51, "5": 50, "6": 49, "7": 42, "8": 50, "9": 49,
  A: 54, B: 52, C: 49, D: 53, E: 45, F: 44, G: 50, H: 55, I: 25, J: 46, K: 53, L: 41, M: 67,
  N: 53, O: 52, P: 50, Q: 52, R: 51, S: 49, T: 43, U: 52, V: 53, W: 84, X: 52, Y: 52, Z: 46,
  Ç: 49, Ğ: 50, İ: 25, Ö: 50, Ş: 49, Ü: 52,
};
const CAP_H = 0.65; // Teko büyük harf yüksekliği (yazı boyuna oranla)
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

// Yuvarlak / kalkan / şerit / altıgen zemin + 1-3 karakter (Teko Bold yazı tipi). Sadece iki renk kullanır.
export function LetterEmblem({ shape, text, color1, color2, size = 40 }: Props) {
  const ink = color2;
  const fill = color1;
  const ringed = shape !== "serit";
  // Teko Bold'da harf genişlikleri (100 birimlik yazı boyuna göre). Geniş harfler (M, W) yazıyı küçültür,
  // dar harfler (I, 1) büyük kalır; böylece yazı hiçbir zaman çerçeveden taşmaz.
  const n = Math.min(text.length, 3);
  const accent = /[ÇĞİÖŞÜ]/.test(text); // noktalı/şapkalı harfler yukarı taşar, biraz küçült
  const availW = ringed ? 60 : 72;
  const capMax = (ringed ? (n >= 3 ? 36 : 40) : 26) * (accent ? 0.85 : 1);
  const fontSize = Math.min(availW / (textWidth(text) / 100), capMax / CAP_H);
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
