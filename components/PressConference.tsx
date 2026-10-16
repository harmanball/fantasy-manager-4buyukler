import { TeamEmblem } from "@/components/TeamEmblem";
import type { EmblemId } from "@/lib/emblems";

interface PressTeam {
  name: string;
  emblem: EmblemId;
  color1: string;
  color2: string;
}

// Basın toplantısı görseli: arkadaki duvarda takımın amblemi tekrar eder,
// isimlikte "<Takım> Teknik Direktörü" yazar. Menajerin yüzü bilerek belirsizdir.
export function PressConference({ team }: { team: PressTeam }) {
  const label = team.name;
  const nameLen = label.length * 13 > 176 ? 176 : undefined;
  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-gradient-to-b from-[#17503d] to-[#0b2b21]">
      {/* Duvar: takım amblemleri */}
      <div className="absolute inset-x-0 top-0 grid h-[85%] grid-cols-6 grid-rows-4 place-items-center opacity-45 sm:grid-cols-8">
        {Array.from({ length: 32 }).map((_, i) => (
          <div key={i} className={i % 8 >= 6 ? "hidden sm:block" : ""}>
            <TeamEmblem emblem={team.emblem} color1={team.color1} color2={team.color2} size={40} />
          </div>
        ))}
      </div>

      <svg viewBox="0 0 1200 675" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full" role="img" aria-label={`${label} Teknik Direktörü basın toplantısında`}>
        <defs>
          <linearGradient id="pc-table" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#7a5230" />
            <stop offset="1" stopColor="#4a301b" />
          </linearGradient>
          <radialGradient id="pc-v" cx="0.5" cy="0.5" r="0.75">
            <stop offset="0.6" stopColor="#000" stopOpacity="0" />
            <stop offset="1" stopColor="#000" stopOpacity="0.5" />
          </radialGradient>
        </defs>
        <rect x="0" y="570" width="1200" height="105" fill="#0a241b" />
        {/* Menajer */}
        <path d="M410 675 C410 520 470 470 600 462 C730 470 790 520 790 675 Z" fill="#14213d" />
        <path d="M560 470 L600 560 L640 470 Z" fill="#f5f1e8" />
        <path d="M600 500 l-12 14 12 90 12 -90 z" fill="#b91c1c" />
        <path d="M470 500 L560 470 L600 560 L530 675 L470 675 Z" fill="#101a31" />
        <path d="M730 500 L640 470 L600 560 L670 675 L730 675 Z" fill="#101a31" />
        <rect x="567" y="430" width="66" height="48" rx="10" fill="#c28862" />
        <ellipse cx="600" cy="372" rx="70" ry="84" fill="#d9a07a" />
        <ellipse cx="530" cy="376" rx="10" ry="16" fill="#c28862" />
        <ellipse cx="670" cy="376" rx="10" ry="16" fill="#c28862" />
        <path d="M530 346 C534 294 568 282 600 282 C634 282 666 294 670 346 C650 318 628 312 600 312 C572 312 550 318 530 346 Z" fill="#8a8a8a" />
        <circle cx="574" cy="368" r="7" fill="#1f2a26" />
        <circle cx="626" cy="368" r="7" fill="#1f2a26" />
        <path d="M556 350 Q574 340 590 348" stroke="#5c5c5c" strokeWidth="5" fill="none" strokeLinecap="round" />
        <path d="M610 348 Q626 340 644 350" stroke="#5c5c5c" strokeWidth="5" fill="none" strokeLinecap="round" />
        <path d="M600 372 q-8 22 4 26" stroke="#c28862" strokeWidth="4" fill="none" strokeLinecap="round" />
        <path d="M572 416 Q600 432 628 416" stroke="#7a3e2a" strokeWidth="5" fill="none" strokeLinecap="round" />
        {/* Masa */}
        <rect x="140" y="560" width="920" height="30" fill="url(#pc-table)" />
        <rect x="120" y="585" width="960" height="90" fill="#3b2614" />
        {/* İsimlik */}
        <rect x="490" y="592" width="220" height="64" rx="5" fill="#f5f1e8" />
        <text x="600" y="620" textAnchor="middle" fontSize="22" fontWeight="700" fill="#1f2a26" fontFamily="Georgia, serif" textLength={nameLen} lengthAdjust="spacingAndGlyphs">
          {label}
        </text>
        <text x="600" y="643" textAnchor="middle" fontSize="15" fill="#1f2a26" opacity="0.75">
          Teknik Direktörü
        </text>
        {/* Mikrofonlar */}
        {[440, 500, 700, 760].map((x, i) => (
          <g key={x} transform={`translate(${x} ${i % 3 === 0 ? 540 : 548})`}>
            <rect x="-4" y="0" width="8" height="22" fill="#222" />
            <ellipse cx="0" cy="-4" rx="12" ry="16" fill="#111" />
            <ellipse cx="0" cy="-8" rx="12" ry="8" fill="#3a3a3a" />
          </g>
        ))}
        <rect x="340" y="520" width="22" height="48" rx="6" fill="#9ed3e6" opacity="0.8" />
        <rect x="344" y="512" width="14" height="10" rx="3" fill="#d9a634" />
        {/* Gazeteciler */}
        <g fill="#050f0b" opacity="0.92">
          <circle cx="90" cy="640" r="40" /><rect x="40" y="665" width="100" height="40" />
          <circle cx="230" cy="655" r="38" /><rect x="185" y="680" width="90" height="40" />
          <circle cx="1020" cy="648" r="40" /><rect x="975" y="672" width="95" height="40" />
          <circle cx="1130" cy="640" r="38" /><rect x="1085" y="665" width="95" height="40" />
        </g>
        <g fill="#fff">
          <circle cx="120" cy="560" r="5" opacity="0.9" />
          <circle cx="1050" cy="570" r="5" opacity="0.7" />
          <circle cx="260" cy="590" r="3" opacity="0.6" />
        </g>
        <rect width="1200" height="675" fill="url(#pc-v)" />
      </svg>
    </div>
  );
}
