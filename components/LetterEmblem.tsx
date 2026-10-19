import { LetterShape } from "@/lib/letterEmblem";

interface Props {
  shape: LetterShape;
  text: string;
  color1: string; // zemin
  color2: string; // yazı + iç çizgi
  size?: number;
}

// Yuvarlak / kalkan / şerit / altıgen zemin + 1-2 karakter. Sadece iki renk kullanır.
export function LetterEmblem({ shape, text, color1, color2, size = 40 }: Props) {
  const ink = color2;
  const fill = color1;
  const ringed = shape !== "serit";
  const fontSize = ringed ? (text.length <= 1 ? 40 : 31) : text.length <= 1 ? 42 : 40;

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
        y="50"
        textAnchor="middle"
        dominantBaseline="central"
        fontFamily="Georgia, serif"
        fontWeight={900}
        fontSize={fontSize}
        fill={ink}
      >
        {text}
      </text>
    </svg>
  );
}
