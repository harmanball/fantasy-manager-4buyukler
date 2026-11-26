import { WeeklyPoint } from "@/lib/gameweekResult";

// maxByWeek: hafta numarası -> o haftada alınabilecek en yüksek puan (isteğe bağlı).
// Verilirse grafiğe altın renkli kesikli ikinci bir çizgi eklenir.
export function PerformanceChart({
  data,
  maxByWeek,
}: {
  data: WeeklyPoint[];
  maxByWeek?: Record<number, number>;
}) {
  if (data.length < 2) {
    return (
      <div className="rounded-lg border border-charcoal/10 bg-white p-4 text-center">
        <p className="font-display mb-1 text-sm font-semibold">Haftalık formun</p>
        <p className="text-xs text-foreground/50">
          En az 2 hafta tamamlanınca formun burada bir grafikle görünecek.
        </p>
      </div>
    );
  }

  const width = 320;
  const height = 130;
  const padX = 24;
  const padTop = 24;
  const padBottom = 24;

  const maxValues = maxByWeek ? data.map((d) => maxByWeek[d.weekNumber]) : [];
  const hasMax = maxByWeek !== undefined && maxValues.some((v) => v !== undefined);

  const allValues = [
    ...data.map((d) => d.points),
    ...(hasMax ? maxValues.filter((v): v is number => v !== undefined) : []),
  ];
  const maxPoints = Math.max(...allValues, 1);
  const minPoints = Math.min(...data.map((d) => d.points), 0);
  const range = maxPoints - minPoints || 1;
  const stepX = (width - padX * 2) / (data.length - 1);
  const yOf = (v: number) => padTop + (1 - (v - minPoints) / range) * (height - padTop - padBottom);

  const points = data.map((d, i) => ({ x: padX + i * stepX, y: yOf(d.points), ...d }));
  const maxPts = hasMax
    ? data
        .map((d, i) => (maxByWeek![d.weekNumber] !== undefined ? { x: padX + i * stepX, y: yOf(maxByWeek![d.weekNumber]), v: maxByWeek![d.weekNumber], weekNumber: d.weekNumber } : null))
        .filter((p): p is { x: number; y: number; v: number; weekNumber: number } => p !== null)
    : [];

  const polyline = points.map((p) => `${p.x},${p.y}`).join(" ");
  const maxPolyline = maxPts.map((p) => `${p.x},${p.y}`).join(" ");
  const lastIndex = points.length - 1;
  const lastMax = maxPts.length > 0 && maxPts[maxPts.length - 1].weekNumber === data[lastIndex].weekNumber ? maxPts[maxPts.length - 1] : null;

  return (
    <div className="rounded-lg border border-charcoal/10 bg-white p-4">
      <p className="font-display mb-1 text-sm font-semibold">Haftalık formun</p>
      <p className="mb-1 text-[11px] text-foreground/40">Son {data.length} hafta</p>
      {hasMax && (
        <div className="mb-1 flex flex-wrap gap-x-4 gap-y-0.5 text-[10.5px] text-foreground/60">
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-5 border-t-[3px] border-[#0F3D2E]" /> Senin puanın
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-5 border-t-2 border-dashed border-[#C9972B]" /> Alınabilecek en yüksek puan
          </span>
        </div>
      )}
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full" role="img">
        <title>Haftalık puan grafiği</title>
        <line
          x1={padX}
          y1={height - padBottom}
          x2={width - padX}
          y2={height - padBottom}
          stroke="#e5e2d9"
          strokeWidth="1"
        />
        {hasMax && maxPts.length > 1 && (
          <>
            <polyline points={maxPolyline} fill="none" stroke="#C9972B" strokeWidth="1.5" strokeDasharray="4 3" />
            {maxPts.map((p) => (
              <circle key={p.weekNumber} cx={p.x} cy={p.y} r="2.5" fill="#faf8f0" stroke="#C9972B" strokeWidth="1.2">
                <title>{`${p.weekNumber}. hafta alınabilecek en yüksek puan: ${p.v}`}</title>
              </circle>
            ))}
            {lastMax && (
              <text x={lastMax.x} y={lastMax.y - 7} fontSize="10" fill="#A67B1E" fontWeight="700" textAnchor="middle">
                {lastMax.v}
              </text>
            )}
          </>
        )}
        <polyline points={polyline} fill="none" stroke="#0F3D2E" strokeWidth="2" />
        {points.map((p, i) => (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r={i === lastIndex ? 5 : 4}
            fill={i === lastIndex ? "#D4A537" : "#0F3D2E"}
          />
        ))}
        {points.map((p, i) => (
          <text
            key={i}
            x={p.x}
            y={p.y - 10}
            fontSize="11"
            fill={i === lastIndex ? "#D4A537" : "#0F3D2E"}
            fontWeight="600"
            textAnchor="middle"
          >
            {p.points}
          </text>
        ))}
        {points.map((p, i) => (
          <text
            key={i}
            x={p.x}
            y={height - 6}
            fontSize="9"
            fill="#999"
            textAnchor="middle"
          >
            {p.weekNumber}
          </text>
        ))}
      </svg>
    </div>
  );
}
