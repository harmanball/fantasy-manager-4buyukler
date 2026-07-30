import { TEAMS, TeamCode } from "@/lib/teams";

// Basit bir forma silüeti: yaka çentiği + kısa kollar + gövde.
// Renklendirme, saha rozetleriyle aynı --c1/--c2 (conic-gradient) mantığını kullanır.
const JERSEY_CLIP =
  "polygon(35% 0%, 50% 10%, 65% 0%, 85% 0%, 100% 22%, 76% 32%, 76% 100%, 24% 100%, 24% 32%, 0% 22%, 15% 0%)";

export function JerseyIcon({ team, size = 56 }: { team: TeamCode; size?: number }) {
  const t = TEAMS[team];
  return (
    <div
      className="team-badge shrink-0"
      style={
        {
          width: size,
          height: size,
          "--c1": t.c1,
          "--c2": t.c2,
          clipPath: JERSEY_CLIP,
          filter: "drop-shadow(0 0 0.5px rgba(0,0,0,0.35))",
        } as React.CSSProperties
      }
      role="img"
      aria-label={`${t.name} forması`}
    />
  );
}
