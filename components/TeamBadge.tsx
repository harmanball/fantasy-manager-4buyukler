import { TEAMS, TeamCode } from "@/lib/teams";

// Kaptan rozetine özel mor ton — paylaşılan "gold" rengi uygulamanın başka
// yerlerinde de (Uyg. Yükle butonu, çeşitli vurgu panelleri) kullanıldığı
// için ona dokunmadık, sadece kaptan rozetinin kendi rengini değiştirdik.
const CAPTAIN_COLOR = "#7F77DD";

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
        }`}
        style={
          {
            "--c1": t.c1,
            "--c2": t.c2,
            ...(role === "captain"
              ? {
                  boxShadow: `0 0 0 2px ${CAPTAIN_COLOR}, 0 0 0 3px #123524`,
                }
              : {}),
          } as React.CSSProperties
        }
        role="img"
        aria-label={`${t.name} forması`}
      />
      {role === "captain" && (
        <span
          className="absolute -right-1 -top-1 flex items-center justify-center rounded-full font-bold text-ivory shadow-sm"
          style={{
            width: badgeSize,
            height: badgeSize,
            fontSize: Math.max(9, Math.round(badgeSize * 0.62)),
            lineHeight: 1,
            backgroundColor: CAPTAIN_COLOR,
          }}
          aria-hidden="true"
        >
          C
        </span>
      )}
    </div>
  );
}
