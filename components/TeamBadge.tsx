import { TEAMS, TeamCode } from "@/lib/teams";

export function TeamBadge({
  team,
  size = 32,
  role,
}: {
  team: TeamCode;
  size?: number;
  role?: "captain" | "vice";
}) {
  const t = TEAMS[team];
  return (
    <div
      className={`team-badge relative shrink-0 rounded-full ${
        t.needsRing ? "team-badge-bjk" : ""
      } ${
        role === "captain"
          ? "ring-2 ring-gold"
          : role === "vice"
          ? "ring-2 ring-ivory"
          : ""
      }`}
      style={
        {
          width: size,
          height: size,
          "--c1": t.c1,
          "--c2": t.c2,
        } as React.CSSProperties
      }
      role="img"
      aria-label={`${t.name} forması`}
    >
      {role && (
        <span
          className="absolute inset-0 flex items-center justify-center text-[9px] font-semibold text-ivory"
          style={{ textShadow: "0 0 3px rgba(0,0,0,0.7)" }}
        >
          {role === "captain" ? "C" : "V"}
        </span>
      )}
    </div>
  );
}
