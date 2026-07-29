"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSession } from "@/lib/useSession";
import {
  fetchFinishedGameweeks,
  fetchGameweekResult,
  FinishedGameweek,
  GameweekResultRow,
} from "@/lib/gameweekResult";

export default function PuanlarimPage() {
  const { session, loading: sessionLoading } = useSession();
  const router = useRouter();

  const [weeks, setWeeks] = useState<FinishedGameweek[]>([]);
  const [selectedGw, setSelectedGw] = useState<number | null>(null);
  const [rows, setRows] = useState<GameweekResultRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!sessionLoading && !session) router.push("/giris");
  }, [sessionLoading, session, router]);

  useEffect(() => {
    fetchFinishedGameweeks().then((w) => {
      setWeeks(w);
      if (w.length > 0) setSelectedGw(w[0].id);
      else setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!session || !selectedGw) return;
    let cancelled = false;
    async function load() {
      setLoading(true);
      const { rows, total } = await fetchGameweekResult(session!.user.id, selectedGw!);
      if (cancelled) return;
      setRows(rows);
      setTotal(total);
      setLoading(false);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [session, selectedGw]);

  if (sessionLoading || !session) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-2xl items-center justify-center px-3">
        <p className="text-sm text-foreground/50">Yükleniyor…</p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col gap-4 px-3 py-4 sm:px-6 sm:py-6">
      <header className="flex items-center justify-between">
        <h1 className="font-display text-lg font-semibold sm:text-xl">
          Puanlarım
        </h1>
        <Link
          href="/siralama"
          className="text-xs text-foreground/50 underline underline-offset-2"
        >
          Sıralama
        </Link>
      </header>

      {weeks.length === 0 ? (
        <p className="rounded-lg border border-charcoal/10 bg-white px-4 py-6 text-center text-sm text-foreground/60">
          Henüz tamamlanmış bir hafta yok.
        </p>
      ) : (
        <>
          <select
            value={selectedGw ?? ""}
            onChange={(e) => setSelectedGw(Number(e.target.value))}
            className="h-10 w-full rounded-lg border border-charcoal/15 bg-white px-3 text-sm"
          >
            {weeks.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name || `${w.week_number}. Hafta`}
              </option>
            ))}
          </select>

          <div className="rounded-lg border border-gold/40 bg-gold/10 px-4 py-3 text-center">
            <p className="text-xs text-foreground/60">Bu haftaki toplam puanın</p>
            <p className="font-display text-2xl font-semibold text-charcoal">
              {total}
            </p>
          </div>

          {loading ? (
            <p className="py-10 text-center text-sm text-foreground/50">
              Yükleniyor…
            </p>
          ) : rows.length === 0 ? (
            <p className="rounded-lg border border-charcoal/10 bg-white px-4 py-6 text-center text-sm text-foreground/60">
              Bu hafta için kayıtlı bir kadron bulunamadı.
            </p>
          ) : (
            <div className="flex flex-col gap-1.5">
              {rows.map((r) => (
                <div
                  key={r.playerId}
                  className="flex items-center justify-between rounded-lg border border-charcoal/10 bg-white px-3 py-2.5"
                >
                  <div>
                    <p className="text-sm font-medium leading-tight">
                      {r.name}
                      {r.isCaptain && (
                        <span className="ml-1.5 text-xs font-normal text-gold">
                          Kaptan
                        </span>
                      )}
                      {r.isMotm && (
                        <span className="ml-1.5 text-xs font-normal text-gold">
                          Maçın Yıldızı
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-foreground/50">
                      {r.team} · {r.position} · taban puan {r.basePoints}
                      {r.multiplier > 1 && ` × ${r.multiplier}`}
                      {!r.played && " · oynamadı"}
                    </p>
                  </div>
                  <span className="font-display text-base font-semibold">
                    {r.finalPoints}
                  </span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </main>
  );
}
