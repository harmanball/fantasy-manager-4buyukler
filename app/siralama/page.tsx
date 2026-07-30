"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  fetchLeaderboardWithTrend,
  fetchGameweekLeaderboard,
  LeaderboardRowWithTrend,
} from "@/lib/leaderboard";
import { fetchFinishedGameweeks, FinishedGameweek } from "@/lib/gameweekResult";
import { useSession } from "@/lib/useSession";
import { AppHeader } from "@/components/AppHeader";

export default function SiralamaPage() {
  const { session } = useSession();
  const [rows, setRows] = useState<LeaderboardRowWithTrend[]>([]);
  const [weeks, setWeeks] = useState<FinishedGameweek[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<"total" | number>("total");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFinishedGameweeks().then(setWeeks);
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      const r =
        selectedFilter === "total"
          ? await fetchLeaderboardWithTrend()
          : (await fetchGameweekLeaderboard(selectedFilter)).map((row) => ({
              ...row,
              rankChange: null,
            }));
      if (cancelled) return;
      setRows(r);
      setLoading(false);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [selectedFilter]);

  return (
    <>
      <AppHeader />
      <main className="mx-auto flex max-w-3xl flex-col gap-4 px-3 py-4 sm:px-6 sm:py-6">
        <h1 className="font-display text-lg font-semibold sm:text-xl">Lig Sıralaması</h1>

      <select
        value={selectedFilter}
        onChange={(e) =>
          setSelectedFilter(e.target.value === "total" ? "total" : Number(e.target.value))
        }
        className="h-10 w-full rounded-lg border border-charcoal/15 bg-white px-3 text-sm"
      >
        <option value="total">Genel Toplam</option>
        {weeks.map((w) => (
          <option key={w.id} value={w.id}>
            {w.name || `${w.week_number}. Hafta`}
          </option>
        ))}
      </select>

      {loading ? (
        <p className="py-10 text-center text-sm text-foreground/50">
          Yükleniyor…
        </p>
      ) : rows.length === 0 ? (
        <p className="rounded-lg border border-charcoal/10 bg-white px-4 py-6 text-center text-sm text-foreground/60">
          Henüz kimse puan almadı — ilk hafta tamamlanınca sıralama burada
          görünecek.
        </p>
      ) : (
        <ol className="flex flex-col gap-1.5">
          {rows.map((row, i) => {
            const isMe = session?.user.id === row.user_id;
            return (
              <li key={row.user_id}>
                <Link
                  href={isMe ? "/kadro" : `/takim/${row.user_id}`}
                  className={`flex items-center justify-between rounded-lg border px-3 py-2.5 transition-colors active:bg-charcoal/5 ${
                    isMe
                      ? "border-gold bg-gold/10"
                      : "border-charcoal/10 bg-white"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="flex w-9 shrink-0 items-center justify-end gap-1 text-right text-sm font-medium text-foreground/50">
                      {i + 1}
                      {row.rankChange === "up" && (
                        <span className="text-green-600" aria-label="yükseldi">▲</span>
                      )}
                      {row.rankChange === "down" && (
                        <span className="text-red-600" aria-label="düştü">▼</span>
                      )}
                      {(row.rankChange === "same" || row.rankChange === null) && (
                        <span className="text-foreground/25" aria-label="değişiklik yok">–</span>
                      )}
                    </span>
                    <div>
                      <p className="text-sm font-medium leading-tight">
                        {row.squad_name || row.username}
                        {isMe && (
                          <span className="ml-1.5 text-xs font-normal text-gold">
                            (sen)
                          </span>
                        )}
                      </p>
                      {row.squad_name && (
                        <p className="text-xs text-foreground/50">
                          {row.username}
                        </p>
                      )}
                    </div>
                  </div>
                  <span className="shrink-0 font-display text-base font-semibold">
                    {row.total_points}
                  </span>
                </Link>
              </li>
            );
          })}
        </ol>
      )}
      </main>
    </>
  );
}
