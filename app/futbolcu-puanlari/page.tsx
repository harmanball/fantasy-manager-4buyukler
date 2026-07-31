"use client";

import { useEffect, useMemo, useState } from "react";
import {
  fetchPlayerPointsBreakdown,
  fetchGameweekPlayersBreakdown,
  PlayerPointsBreakdown,
} from "@/lib/playerPoints";
import { fetchFinishedGameweeks, FinishedGameweek } from "@/lib/gameweekResult";
import { AppHeader } from "@/components/AppHeader";
import { PageHeader } from "@/components/PageHeader";
import { Skeleton } from "@/components/Skeleton";

type SortableKey = keyof Pick<
  PlayerPointsBreakdown,
  | "name"
  | "team"
  | "toplam_puan"
  | "mac_sayisi"
  | "oynama_puani"
  | "gol_puani"
  | "asist_puani"
  | "temiz_kale_puani"
  | "kart_puani"
  | "kk_gol_puani"
  | "pen_kacan_puani"
  | "mac_puani_bonusu"
>;

const COLS: { key: SortableKey; label: string; align: "left" | "right" }[] = [
  { key: "name", label: "Oyuncu", align: "left" },
  { key: "team", label: "Takım", align: "left" },
  { key: "toplam_puan", label: "Toplam", align: "right" },
  { key: "mac_sayisi", label: "Maç", align: "right" },
  { key: "oynama_puani", label: "Oynama", align: "right" },
  { key: "gol_puani", label: "Gol", align: "right" },
  { key: "asist_puani", label: "Asist", align: "right" },
  { key: "temiz_kale_puani", label: "T.Kale", align: "right" },
  { key: "kart_puani", label: "Kart", align: "right" },
  { key: "kk_gol_puani", label: "KK Gol", align: "right" },
  { key: "pen_kacan_puani", label: "Pen.Kaçan", align: "right" },
  { key: "mac_puani_bonusu", label: "Reytingi Bonus", align: "right" },
];

export default function FutbolcuPuanlariPage() {
  const [rows, setRows] = useState<PlayerPointsBreakdown[]>([]);
  const [weeks, setWeeks] = useState<FinishedGameweek[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<"total" | number>("total");
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortableKey>("toplam_puan");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  useEffect(() => {
    fetchFinishedGameweeks().then(setWeeks);
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      const r =
        selectedFilter === "total"
          ? await fetchPlayerPointsBreakdown()
          : await fetchGameweekPlayersBreakdown(selectedFilter);
      if (cancelled) return;
      setRows(r);
      setLoading(false);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [selectedFilter]);

  function handleSort(key: SortableKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  const filtered = useMemo(
    () => rows.filter((r) => r.name.toLowerCase().includes(query.toLowerCase())),
    [rows, query]
  );

  const sorted = useMemo(() => {
    const copy = [...filtered];
    copy.sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      let cmp: number;
      if (typeof av === "string" && typeof bv === "string") {
        cmp = av.localeCompare(bv, "tr");
      } else {
        cmp = (av as number) - (bv as number);
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
    return copy;
  }, [filtered, sortKey, sortDir]);

  return (
    <>
      <AppHeader />
      <main className="mx-auto flex max-w-4xl flex-col gap-4 px-3 py-4 sm:px-6 sm:py-6">
        <PageHeader icon="users" title="Futbolcu Puanları" />

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

      <input
        type="text"
        inputMode="search"
        placeholder="Oyuncu ara"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="h-10 w-full rounded-lg border border-charcoal/15 bg-white px-3 text-sm outline-none focus:border-pitch"
      />

      <p className="text-center text-[11px] text-foreground/40">
        Bu istatistikler için{" "}
        <a
          href="https://www.fotmob.com"
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-2"
        >
          www.fotmob.com
        </a>{" "}
        referans alınır.
      </p>

      {loading ? (
        <div className="flex flex-col gap-1.5">
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
        </div>
      ) : sorted.length === 0 ? (
        <p className="rounded-lg border border-charcoal/10 bg-white px-4 py-6 text-center text-sm text-foreground/60">
          Henüz istatistik girilmedi — ilk hafta işlenince puanlar burada
          görünecek.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-charcoal/10 bg-white">
          <table className="w-full text-[11px] sm:text-xs">
            <thead className="bg-background">
              <tr>
                {COLS.map((c, i) => {
                  const active = c.key === sortKey;
                  return (
                    <th
                      key={c.key}
                      onClick={() => handleSort(c.key)}
                      className={`cursor-pointer select-none whitespace-nowrap p-1 px-1.5 font-semibold hover:bg-charcoal/5 sm:p-2 ${
                        c.align === "right" ? "text-right" : "text-left"
                      } ${i === 0 ? "sticky left-0 bg-background" : ""}`}
                    >
                      {c.label}
                      <span className={active ? "text-gold" : "text-foreground/20"}>
                        {" "}
                        {active ? (sortDir === "asc" ? "▲" : "▼") : "▲"}
                      </span>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {sorted.map((r, i) => (
                <tr
                  key={r.player_id}
                  className={i % 2 === 0 ? "bg-white" : "bg-background/60"}
                >
                  <td className="sticky left-0 whitespace-nowrap bg-inherit p-1 px-1.5 font-medium sm:p-2">
                    {r.name}
                  </td>
                  <td className="p-1 px-1.5 text-foreground/60 sm:p-2">{r.team}</td>
                  <td className="p-1 px-1.5 text-right font-display font-semibold sm:p-2">
                    {r.toplam_puan}
                  </td>
                  <td className="p-1 px-1.5 text-right sm:p-2">{r.mac_sayisi}</td>
                  <td className="p-1 px-1.5 text-right sm:p-2">{r.oynama_puani}</td>
                  <td className="p-1 px-1.5 text-right sm:p-2">{r.gol_puani}</td>
                  <td className="p-1 px-1.5 text-right sm:p-2">{r.asist_puani}</td>
                  <td className="p-1 px-1.5 text-right sm:p-2">{r.temiz_kale_puani}</td>
                  <td className="p-1 px-1.5 text-right sm:p-2">{r.kart_puani}</td>
                  <td className="p-1 px-1.5 text-right sm:p-2">{r.kk_gol_puani}</td>
                  <td className="p-1 px-1.5 text-right sm:p-2">{r.pen_kacan_puani}</td>
                  <td className="p-1 px-1.5 text-right sm:p-2">{r.mac_puani_bonusu}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      </main>
    </>
  );
}
