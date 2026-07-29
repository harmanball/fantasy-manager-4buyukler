"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { fetchLeaderboard, LeaderboardRow } from "@/lib/leaderboard";
import { useSession } from "@/lib/useSession";

export default function SiralamaPage() {
  const { session } = useSession();
  const [rows, setRows] = useState<LeaderboardRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeaderboard().then((r) => {
      setRows(r);
      setLoading(false);
    });
  }, []);

  return (
    <main className="mx-auto flex min-h-dvh max-w-3xl flex-col gap-4 px-3 py-4 sm:px-6 sm:py-6">
      <header className="flex items-center justify-between">
        <h1 className="font-display text-lg font-semibold sm:text-xl">
          Genel Sıralama
        </h1>
        <div className="flex items-center gap-3">
          <Link
            href="/puanlarim"
            className="text-xs text-foreground/50 underline underline-offset-2"
          >
            Puanlarım
          </Link>
          <Link
            href="/kadro"
            className="text-xs text-foreground/50 underline underline-offset-2"
          >
            Kadrom
          </Link>
        </div>
      </header>

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
              <li
                key={row.user_id}
                className={`flex items-center justify-between rounded-lg border px-3 py-2.5 ${
                  isMe
                    ? "border-gold bg-gold/10"
                    : "border-charcoal/10 bg-white"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="w-6 shrink-0 text-right text-sm font-medium text-foreground/50">
                    {i + 1}
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
              </li>
            );
          })}
        </ol>
      )}
    </main>
  );
}
