export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-charcoal/10 ${className}`} />;
}

export function SkeletonRow() {
  return (
    <div className="flex items-center justify-between rounded-lg border border-charcoal/10 bg-white px-3 py-2.5">
      <div className="flex items-center gap-3">
        <Skeleton className="h-6 w-6 shrink-0" />
        <div className="flex flex-col gap-1.5">
          <Skeleton className="h-3.5 w-28" />
          <Skeleton className="h-2.5 w-16" />
        </div>
      </div>
      <Skeleton className="h-4 w-8" />
    </div>
  );
}
