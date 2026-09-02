import { EmblemId } from "@/lib/emblems";

function renderShape(emblem: EmblemId, a: string, b: string) {
  switch (emblem) {
    case "shield":
      return (
        <>
          <path d="M36 4 L64 14 V34 C64 52 52 64 36 68 C20 64 8 52 8 34 V14 Z" fill={a} />
          <path d="M36 4 L64 14 V34 C64 52 52 64 36 68 Z" fill={b} opacity={0.55} />
        </>
      );
    case "star":
      return (
        <>
          <circle cx="36" cy="36" r="32" fill={a} />
          <path
            d="M36 14 L41 29 L57 29 L44 39 L49 55 L36 45 L23 55 L28 39 L15 29 L31 29 Z"
            fill={b}
          />
        </>
      );
    case "crown":
      return (
        <>
          <circle cx="36" cy="36" r="32" fill={a} />
          <path d="M16 46 L20 26 L30 38 L36 22 L42 38 L52 26 L56 46 Z" fill={b} />
        </>
      );
    case "ball":
      return (
        <>
          <circle cx="36" cy="36" r="32" fill={a} />
          <circle cx="36" cy="36" r="32" fill="none" stroke={b} strokeWidth={4} />
          <path d="M36 16 L46 24 L42 36 L30 36 L26 24 Z" fill={b} />
        </>
      );
    case "lion":
      return (
        <>
          <circle cx="36" cy="36" r="32" fill={a} />
          <circle cx="36" cy="34" r="14" fill={b} />
          <circle cx="30" cy="32" r="2.5" fill={a} />
          <circle cx="42" cy="32" r="2.5" fill={a} />
          <path
            d="M30 40 Q36 46 42 40"
            stroke={a}
            strokeWidth={2.5}
            fill="none"
            strokeLinecap="round"
          />
        </>
      );
    case "lightning":
      return (
        <>
          <circle cx="36" cy="36" r="32" fill={a} />
          <path d="M40 12 L22 40 H34 L30 60 L52 30 H38 Z" fill={b} />
        </>
      );
    case "flame":
      return (
        <>
          <circle cx="36" cy="36" r="32" fill={a} />
          <path
            d="M36 12 C24 26 22 36 28 46 C24 44 22 40 22 40 C20 52 28 60 36 60 C46 60 54 52 50 40 C48 46 44 48 44 48 C50 36 44 24 36 12 Z"
            fill={b}
          />
        </>
      );
    case "trophy":
      return (
        <>
          <circle cx="36" cy="36" r="32" fill={a} />
          <path d="M24 22 H48 V32 C48 40 43 45 36 45 C29 45 24 40 24 32 Z" fill={b} />
          <rect x="32" y="45" width="8" height="8" fill={b} />
          <rect x="24" y="53" width="24" height="6" rx="2" fill={b} />
          <path d="M24 24 H16 V30 C16 35 20 38 24 37 Z" fill={b} />
          <path d="M48 24 H56 V30 C56 35 52 38 48 37 Z" fill={b} />
        </>
      );
    case "eagle":
      return (
        <>
          <circle cx="36" cy="36" r="32" fill={a} />
          <path
            d="M36 16 L44 32 L60 30 L46 40 L52 56 L36 46 L20 56 L26 40 L12 30 L28 32 Z"
            fill={b}
          />
        </>
      );
    case "wolf":
      return (
        <>
          <circle cx="36" cy="36" r="32" fill={a} />
          <path
            d="M22 46 L18 24 L30 34 L36 22 L42 34 L54 24 L50 46 C50 54 43 58 36 58 C29 58 22 54 22 46 Z"
            fill={b}
          />
        </>
      );
    case "diamond":
      return (
        <>
          <circle cx="36" cy="36" r="32" fill={a} />
          <path d="M22 28 H50 L58 34 L36 62 L14 34 Z" fill={b} />
          <path d="M22 28 L36 62 L14 34 Z M50 28 L36 62 L58 34 Z" fill={a} opacity={0.25} />
        </>
      );
    case "shield_fr":
      // Fransız kalkanı — düz üst, yuvarlak alt
      return (
        <>
          <path d="M36 8 L58 14 V34 C58 54 50 60 36 64 C22 60 14 54 14 34 V14 Z" fill={a} />
          <path d="M36 8 L58 14 V34 C58 54 50 60 36 64 Z" fill={b} opacity={0.55} />
        </>
      );
    case "shield_es":
      // İspanyol kalkanı — yukarı ve aşağı yuvarlatılmış, oval hatlı
      return (
        <>
          <path
            d="M36 6 C50 8 54 16 54 26 C54 48 48 58 36 66 C24 58 18 48 18 26 C18 16 22 8 36 6 Z"
            fill={a}
          />
          <path
            d="M36 6 C50 8 54 16 54 26 C54 48 48 58 36 66 Z"
            fill={b}
            opacity={0.55}
          />
        </>
      );
    case "shield_de":
      // Alman kalkanı — çentikli üst, sivri alt
      return (
        <>
          <path d="M14 10 L36 16 L58 10 V32 L36 64 L14 32 Z" fill={a} />
          <path d="M36 16 L58 10 V32 L36 64 Z" fill={b} opacity={0.55} />
        </>
      );
    case "banner":
      // Şerit / bayrak amblem — düz üst, V şeklinde kesik alt
      return (
        <>
          <path d="M14 10 H58 V46 L36 60 L14 46 Z" fill={a} />
          <path d="M36 10 H58 V46 L36 60 Z" fill={b} opacity={0.55} />
        </>
      );
    case "hexagon":
      return (
        <>
          <path d="M36 6 L60 20 V52 L36 66 L12 52 V20 Z" fill={a} />
          <path d="M36 6 L60 20 V52 L36 66 Z" fill={b} opacity={0.55} />
        </>
      );
    case "lozenge":
      // Baklava — dik köşegen amblem
      return (
        <>
          <path d="M36 4 L58 36 L36 68 L14 36 Z" fill={a} />
          <path d="M36 4 L58 36 L36 68 Z" fill={b} opacity={0.55} />
        </>
      );
    case "oval":
      return (
        <>
          <ellipse cx="36" cy="36" rx="22" ry="30" fill={a} />
          <path d="M36 6 A22 30 0 0 1 36 66 Z" fill={b} opacity={0.55} />
        </>
      );
    case "armor":
      // Zırh — kavisli kenarlı klasik forma arması
      return (
        <>
          <path
            d="M36 6 C50 8 54 16 54 24 C58 24 58 30 54 34 C52 44 48 50 44 54 L36 68 L28 54 C24 50 20 44 18 34 C14 30 14 24 18 24 C18 16 22 8 36 6 Z"
            fill={a}
          />
          <path
            d="M36 6 C50 8 54 16 54 24 C58 24 58 30 54 34 C52 44 48 50 44 54 L36 68 Z"
            fill={b}
            opacity={0.55}
          />
        </>
      );
    case "target":
    default:
      return (
        <>
          <circle cx="36" cy="36" r="32" fill={a} />
          <circle cx="36" cy="36" r="22" fill="none" stroke={b} strokeWidth={5} />
          <circle cx="36" cy="36" r="11" fill="none" stroke={b} strokeWidth={5} />
          <circle cx="36" cy="36" r="3" fill={b} />
        </>
      );
  }
}

export function TeamEmblem({
  emblem,
  color1,
  color2,
  size = 72,
}: {
  emblem: EmblemId;
  color1: string;
  color2: string;
  size?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 72 72"
      role="img"
      aria-label="Takım amblemi"
    >
      {renderShape(emblem, color1, color2)}
    </svg>
  );
}
