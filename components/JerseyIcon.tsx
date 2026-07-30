import { TEAMS, TeamCode } from "@/lib/teams";

// Basit bir forma silüeti: yaka çentiği + kısa kollar + gövde.
// Renklendirme, saha rozetleriyle aynı --c1/--c2 (conic-gradient) mantığını kullanır.
const JERSEY_CLIP =
  "polygon(35% 0%, 50% 10%, 65% 0%, 85% 0%, 100% 22%, 76% 32%, 76% 100%, 24% 100%, 24% 32%, 0% 22%, 15% 0%)";

export function JerseyIcon({ team, size = 56 }: { team: TeamCode; size?: number }) {
  const t = TEAMS[team];
  return (
    <div
      className="relative shrink-0"
      style={{ width: size, height: size }}
      role="img"
      aria-label={`${t.name} forması`}
    >
      {/* Arka plan katmanı: aynı forma kalıbı, biraz büyütülmüş siyah —
          beyaz/açık renkli formaların (ör. Beşiktaş) her zeminde net
          görünmesini sağlayan bir çerçeve efekti yaratır. */}
      <div
        className="absolute inset-0 bg-charcoal"
        style={{ clipPath: JERSEY_CLIP, transform: "scale(1.12)" }}
      />
      <div
        className="team-badge absolute inset-0"
        style={
          {
            "--c1": t.c1,
            "--c2": t.c2,
            clipPath: JERSEY_CLIP,
          } as React.CSSProperties
        }
      />
    </div>
  );
}
