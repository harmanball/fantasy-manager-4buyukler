export function StatCards({
  filledCount,
  totalSlots,
  captainName,
  onCaptainClick,
  transfersUsed,
  transfersMax,
}: {
  filledCount: number;
  totalSlots: number;
  captainName: string | null;
  onCaptainClick?: () => void;
  transfersUsed?: number;
  transfersMax?: number;
}) {
  const showTransfers = transfersUsed !== undefined && transfersMax !== undefined;

  return (
    <div className={`grid gap-2 ${showTransfers ? "grid-cols-3" : "grid-cols-2"}`}>
      <div className="rounded-lg border border-charcoal/10 bg-white px-3 py-2">
        <p className="text-[10px] text-foreground/50">Kadro</p>
        <p className="text-base font-medium">
          {filledCount} / {totalSlots}
        </p>
      </div>
      {onCaptainClick ? (
        <button
          onClick={onCaptainClick}
          className="rounded-lg border border-charcoal/10 bg-white px-3 py-2 text-left transition-colors hover:bg-charcoal/5 active:bg-charcoal/10"
        >
          <p className="text-[10px] text-foreground/50">Kaptan</p>
          <p className="truncate text-base font-medium">
            {captainName ?? "Seçilmedi"}
          </p>
        </button>
      ) : (
        <div className="rounded-lg border border-charcoal/10 bg-white px-3 py-2">
          <p className="text-[10px] text-foreground/50">Kaptan</p>
          <p className="truncate text-base font-medium">
            {captainName ?? "Seçilmedi"}
          </p>
        </div>
      )}
      {showTransfers && (
        <div className="rounded-lg border border-charcoal/10 bg-white px-3 py-2">
          <p className="text-[10px] text-foreground/50">Transfer</p>
          <p
            className={`text-base font-medium ${
              transfersUsed! > transfersMax! ? "text-red-600" : ""
            }`}
          >
            {transfersUsed} / {transfersMax}
          </p>
        </div>
      )}
    </div>
  );
}
