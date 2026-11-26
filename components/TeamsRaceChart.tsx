"use client";

import { useEffect, useMemo, useState } from "react";
import { fetchTeamsProgress, TeamProgress } from "@/lib/teamsProgress";

// Birbirinden olabildiğince ayrışan sabit renkler (takımın kendi rengi kullanılmaz).
// Renk, takım kimliğine göre sabit atanır: sıralama değişse de bir takımın rengi değişmez.
const PALETTE = [
  "#E41A1C", "#377EB8", "#2CA02C", "#FF7F00", "#984EA3", "#00B8D4",
  "#E7298A", "#8C564B", "#111111", "#C9A800", "#7F7F7F", "#008080",
];

function recolor(teams: TeamProgress[]): TeamProgress[] {
  const order = [...teams].sort((a, b) => a.userId.localeCompare(b.userId));
  const idx = new Map(order.map((t, i) => [t.userId, i]));
  return teams.map((t) => ({ ...t, color: PALETTE[(idx.get(t.userId) ?? 0) % PALETTE.length] }));
}

// "Puan yarışı": tüm takımların haftalık / kümülatif puan çizgileri tek grafikte.
// startWeek-endWeek: eksenin aralığı (ör. 1-17). endWeek verilmezse oynanan son haftaya kadar.
export function TeamsRaceChart({
  startWeek = 1,
  endWeek,
  subtitle,
  meId,
}: {
  startWeek?: number;
  endWeek?: number;
  subtitle?: string;
  meId?: string;
}) {
  const [data, setData] = useState<{ teams: TeamProgress[]; lastWeek: number } | null>(null);
  const [mode, setMode] = useState<"cum" | "weekly">("cum");
  const [hidden, setHidden] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchTeamsProgress().then((d) => setData({ ...d, teams: recolor(d.teams) }));
  }, []);

  const lastAxis = endWeek ?? Math.max(data?.lastWeek ?? 0, startWeek + 1);
  const weeks = useMemo(() => {
    const out: number[] = [];
    for (let w = startWeek; w <= lastAxis; w++) out.push(w);
    return out;
  }, [startWeek, lastAxis]);
  const playedUpTo = Math.min(lastAxis, data?.lastWeek ?? 0);

  const series = useMemo(() => {
    if (!data) return [];
    return data.teams.map((t) => {
      let run = 0;
      const vals: (number | null)[] = weeks.map((w) => {
        if (w > playedUpTo) return null;
        const p = t.weekly[w] ?? 0;
        run += p;
        return mode === "cum" ? run : p;
      });
      const last = vals.filter((v): v is number => v !== null).pop() ?? 0;
      return { team: t, vals, last };
    }).sort((a, b) => b.last - a.last);
  }, [data, weeks, playedUpTo, mode]);

  if (!data || playedUpTo < startWeek + 1) return null; // en az 2 hafta puan olmadan çizilmez

  const visible = series.filter((s) => !hidden.has(s.team.userId));
  const W = 340;
  const H = 250;
  const x0 = 30;
  const x1 = 322;
  const yt = 14;
  const yb = 200;
  const all = visible.flatMap((s) => s.vals.filter((v): v is number => v !== null));
  const vmax = Math.max(...all, 10);
  const X = (i: number) => x0 + ((x1 - x0) * i) / Math.max(weeks.length - 1, 1);
  const Y = (v: number) => yb - ((yb - yt) * v) / vmax;
  const step = vmax > 600 ? 250 : vmax > 250 ? 100 : 50;
  const grid: number[] = [];
  for (let g = 0; g <= vmax; g += step) grid.push(g);

  const toggle = (id: string) =>
    setHidden((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  const showLabels = visible.length <= 3;

  return (
    <div className="rounded-lg border border-charcoal/10 bg-white p-3">
      <p className="font-display text-sm font-semibold">Puan yarışı</p>
      <p className="mb-2 text-[11px] text-foreground/40">{subtitle ?? "Haftalar"} · Senin takımın kalın çizgi</p>
      <div className="mb-2 flex gap-1.5">
        {(
          [
            ["weekly", "Haftalık"],
            ["cum", "Kümülatif"],
          ] as const
        ).map(([v, label]) => (
          <button
            key={v}
            type="button"
            onClick={() => setMode(v)}
            className={`rounded-full border px-3 py-0.5 text-[11px] font-semibold ${
              mode === v ? "border-pitch bg-pitch text-ivory" : "border-charcoal/20 bg-white text-charcoal"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="mb-1 flex flex-wrap gap-1.5">
        {series.map((s) => {
          const off = hidden.has(s.team.userId);
          return (
            <button
              key={s.team.userId}
              type="button"
              onClick={() => toggle(s.team.userId)}
              aria-pressed={!off}
              className={`flex items-center gap-1 rounded-full border border-charcoal/20 px-2 py-0.5 text-[10px] font-semibold ${off ? "opacity-40" : ""}`}
            >
              <span className="inline-block h-2 w-2 rounded-full" style={{ background: s.team.color }} />
              {s.team.name}
            </button>
          );
        })}
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img">
        <title>Takımların puan yarışı grafiği</title>
        {grid.map((g) => (
          <g key={g}>
            <line x1={x0} x2={x1} y1={Y(g)} y2={Y(g)} stroke="#ece7d6" />
            <text x={x0 - 5} y={Y(g) + 3} textAnchor="end" fontSize="8.5" fill="#aaa">
              {g}
            </text>
          </g>
        ))}
        {weeks.map((w, i) => (
          <text key={w} x={X(i)} y={yb + 15} textAnchor="middle" fontSize="9" fill={w <= playedUpTo ? "#999" : "#ccc"}>
            {w}
          </text>
        ))}
        {[...visible].reverse().map((s) => {
          const mine = s.team.userId === meId;
          const pts = s.vals
            .map((v, i) => (v === null ? null : `${X(i).toFixed(1)},${Y(v).toFixed(1)}`))
            .filter((p): p is string => p !== null)
            .join(" ");
          return (
            <g key={s.team.userId}>
              <polyline points={pts} fill="none" stroke={s.team.color} strokeWidth={mine ? 3 : 1.8} strokeLinejoin="round" />
              {showLabels &&
                s.vals.map((v, i) =>
                  v === null ? null : (
                    <g key={i}>
                      <circle cx={X(i)} cy={Y(v)} r="3" fill={s.team.color} />
                      <text x={X(i)} y={Y(v) - 7} textAnchor="middle" fontSize="9" fontWeight="700" fill={s.team.color}>
                        {v}
                      </text>
                    </g>
                  )
                )}
              {!showLabels && (
                <circle cx={X(playedUpTo - startWeek)} cy={Y(s.vals[playedUpTo - startWeek] as number)} r={mine ? 3.5 : 2.5} fill={s.team.color} />
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
