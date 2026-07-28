export function StatCards({
  filledCount,
  totalSlots,
  captainName,
}: {
  filledCount: number;
  totalSlots: number;
  captainName: string | null;
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <div className="rounded-lg border border-charcoal/10 bg-white px-3 py-2">
        <p className="text-[10px] text-foreground/50">Kadro</p>
        <p className="text-base font-medium">
          {filledCount} / {totalSlots}
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
