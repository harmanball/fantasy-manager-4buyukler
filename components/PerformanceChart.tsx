import { WeeklyPoint } from "@/lib/gameweekResult";

export function PerformanceChart({ data }: { data: WeeklyPoint[] }) {
  if (data.length < 2) return null;

  const width = 320;
  const height = 130;
  const padX = 24;
  const padTop = 20;
  const padBottom = 24;
  const maxPoints = Math.max(...data.map((d) => d.points), 1);
  const minPoints = Math.min(...data.map((d) => d.points), 0);
  const range = maxPoints - minPoints || 1;

  const stepX = (width - padX * 2) / (data.length - 1);
  const points = data.map((d, i) => {
    const x = padX + i * stepX;
    const y =
      padTop + (1 - (d.points - minPoints) / range) * (height - padTop - padBottom);
    return { x, y, ...d };
  });

  const polyline = points.map((p) => `${p.x},${p.y}`).join(" ");
  const last = points[points.length - 1];

  return (
    <div className="rounded-lg border border-charcoal/10 bg-white p-4">
      <p className="font-display mb-1 text-sm font-semibold">Haftalık formun</p>
      <p className="mb-2 text-[11px] text-foreground/40">Son {data.length} hafta</p>
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
        <polyline points={polyline} fill="none" stroke="#0F3D2E" strokeWidth="2" />
        {points.map((p, i) => (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r={i === points.length - 1 ? 5 : 4}
            fill={i === points.length - 1 ? "#D4A537" : "#0F3D2E"}
          />
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
            {p.weekNumber}.H
          </text>
        ))}
        <text x={last.x} y={last.y - 10} fontSize="11" fill="#D4A537" fontWeight="600" textAnchor="middle">
          {last.points}
        </text>
      </svg>
    </div>
  );
}
