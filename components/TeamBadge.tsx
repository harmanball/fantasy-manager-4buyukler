import { TEAMS, TeamCode } from "@/lib/teams";

export function TeamBadge({
  team,
  size = 32,
  role,
}: {
  team: TeamCode;
  size?: number;
  role?: "captain";
}) {
  const t = TEAMS[team];
  const badgeSize = Math.max(14, Math.round(size * 0.42));
  return (
    <div
      className="relative shrink-0"
      style={{ width: size, height: size }}
    >
      <div
        className={`team-badge h-full w-full rounded-full ${
          t.needsRing ? "team-badge-bjk" : ""
        } ${role === "captain" ? "ring-2 ring-gold ring-offset-1 ring-offset-pitch" : ""}`}
        style={
          {
            "--c1": t.c1,
            "--c2": t.c2,
          } as React.CSSProperties
        }
        role="img"
        aria-label={`${t.name} forması`}
      />
      {role === "captain" && (
        <span
          className="absolute -right-1 -top-1 flex items-center justify-center rounded-full bg-gold font-bold text-charcoal shadow-sm"
          style={{
            width: badgeSize,
            height: badgeSize,
            fontSize: Math.max(9, Math.round(badgeSize * 0.62)),
            lineHeight: 1,
          }}
          aria-hidden="true"
        >
          C
        </span>
      )}
    </div>
  );
}
