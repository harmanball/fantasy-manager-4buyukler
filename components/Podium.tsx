import Link from "next/link";
import { LeaderboardRowWithTrend } from "@/lib/leaderboard";

const PODIUM_HEIGHTS = [66, 46, 32];
const PODIUM_ORDER = [1, 0, 2]; // 2. solda, 1. ortada, 3. sağda

export function Podium({
  rows,
  currentUserId,
}: {
  rows: LeaderboardRowWithTrend[];
  currentUserId?: string;
}) {
  if (rows.length < 3) return null;
  const top3 = rows.slice(0, 3);

  return (
    <div className="rounded-lg bg-pitch px-3 pt-5 pb-0">
      <div className="flex items-end justify-center gap-2">
        {PODIUM_ORDER.map((rank) => {
          const row = top3[rank];
          const isFirst = rank === 0;
          const isMe = currentUserId === row.user_id;
          const initial = (row.squad_name || row.username || "?").charAt(0).toUpperCase();
          return (
            <Link
              key={row.user_id}
              href={isMe ? "/kadro" : `/takim/${row.user_id}`}
              className="flex flex-col items-center"
            >
              <div
                className={`mb-1.5 flex items-center justify-center rounded-full font-semibold ${
                  isFirst ? "h-10 w-10 text-sm bg-gold text-charcoal" : "h-8 w-8 text-xs bg-ivory/25 text-ivory"
                }`}
              >
                {initial}
              </div>
              <p className={`truncate text-center text-[11px] font-medium ${isFirst ? "text-ivory" : "text-ivory/85"}`}>
                {row.squad_name || row.username}
              </p>
              <p className={`mb-1.5 text-center text-[10px] ${isFirst ? "text-gold font-semibold" : "text-ivory/60"}`}>
                {row.total_points}
              </p>
              <div
                className={`flex w-16 items-center justify-center rounded-t-md font-display text-lg font-semibold ${
                  isFirst ? "bg-gold/25 text-gold" : "bg-ivory/10 text-ivory"
                }`}
                style={{ height: PODIUM_HEIGHTS[rank] }}
              >
                {rank + 1}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
