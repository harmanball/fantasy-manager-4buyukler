import { TEAM_LIMIT } from "@/lib/teams";

export function StatCards({
  filledCount,
  totalSlots,
  teamCounts,
  captainName,
}: {
  filledCount: number;
  totalSlots: number;
  teamCounts: Record<string, number>;
  captainName: string | null;
}) {
  const overLimitTeam = Object.entries(teamCounts).find(
    ([, c]) => c > TEAM_LIMIT
  );

  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
      <div className="rounded-lg border border-charcoal/10 bg-white px-3 py-2">
        <p className="text-[10px] text-foreground/50">Kadro</p>
        <p className="text-base font-medium">
          {filledCount} / {totalSlots}
        </p>
      </div>
      <div className="rounded-lg border border-charcoal/10 bg-white px-3 py-2">
        <p className="text-[10px] text-foreground/50">Takım limiti</p>
        <p className="text-base font-medium">
          {overLimitTeam ? (
            <span className="text-red-600">
              {overLimitTeam[0]} {overLimitTeam[1]} — limit aşıldı
            </span>
          ) : (
            "Uygun"
          )}
        </p>
      </div>
      <div className="rounded-lg border border-charcoal/10 bg-white px-3 py-2">
        <p className="text-[10px] text-foreground/50">Kaptan</p>
        <p className="truncate text-base font-medium">
          {captainName ?? "Seçilmedi"}
        </p>
      </div>
    </div>
  );
}
