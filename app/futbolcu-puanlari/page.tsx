"use client";

import { useEffect, useMemo, useState } from "react";
import {
  fetchPlayerPointsBreakdown,
  fetchGameweekPlayersBreakdown,
  PlayerPointsBreakdown,
} from "@/lib/playerPoints";
import { fetchFinishedGameweeks, FinishedGameweek } from "@/lib/gameweekResult";
import { supabase } from "@/lib/supabase";
import { AppHeader } from "@/components/AppHeader";
import { PageHeader } from "@/components/PageHeader";
import { Skeleton } from "@/components/Skeleton";

type SortableKey = keyof Pick<
  PlayerPointsBreakdown,
  | "name"
  | "team"
  | "position"
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

// Veritabanındaki mevki kodlarını (GK/DEF/MID/FWD) Türkçe etikete çevirir.
// Beklenmedik/eksik bir kod gelirse olduğu gibi gösterir, sayfa çökmez.
const POSITION_LABELS: Record<string, string> = {
  GK: "Kaleci",
  DEF: "Defans",
  MID: "Orta Saha",
  FWD: "Santrfor",
};

function positionLabel(position: string): string {
  return POSITION_LABELS[position] ?? position;
}

const COLS: { key: SortableKey; label: string; align: "left" | "right" }[] = [
  { key: "name", label: "Oyuncu", align: "left" },
  { key: "team", label: "Takım", align: "left" },
  { key: "position", label: "Mevki", align: "left" },
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

// Puanların yanında gösterilecek GERÇEK sayılar (kaç gol, kaç asist...).
// Puanlar zaten view/hesaplamadan geliyor; bunlar sadece player_stats'taki
// ham sayıları toplar. Supabase tek sorguda en fazla 1000 satır döndürdüğü
// için sayfa sayfa çekilir.
interface RawCounts {
  goals: number;
  assists: number;
  cleanSheets: number;
  yellow: number;
  red: number;
  ownGoals: number;
  penMissed: number;
  ratingBonusMatches: number;
}

async function fetchRawCounts(
  gameweekId: number | null
): Promise<Map<string, RawCounts>> {
  const { data: thr } = await supabase
    .from("game_settings")
    .select("value")
    .eq("key", "rating_bonus_threshold")
    .maybeSingle();
  const threshold = typeof thr?.value === "number" ? thr.value : Number(thr?.value ?? 8);

  const map = new Map<string, RawCounts>();
  const PAGE = 1000;
  for (let from = 0; ; from += PAGE) {
    let q = supabase
      .from("player_stats")
      .select(
        "player_id, minutes, goals, assists, clean_sheet, yellow_card, red_card, own_goals, penalty_missed, match_rating"
      );
    if (gameweekId !== null) q = q.eq("gameweek_id", gameweekId);
    const { data, error } = await q
      .order("gameweek_id")
      .order("player_id")
      .range(from, from + PAGE - 1);
    if (error || !data) break;

    for (const row of data) {
      const id = row.player_id as string;
      const c =
        map.get(id) ??
        {
          goals: 0,
          assists: 0,
          cleanSheets: 0,
          yellow: 0,
          red: 0,
          ownGoals: 0,
          penMissed: 0,
          ratingBonusMatches: 0,
        };
      const minutes = (row.minutes as number) ?? 0;
      c.goals += (row.goals as number) ?? 0;
      c.assists += (row.assists as number) ?? 0;
      if (row.clean_sheet && minutes >= 60) c.cleanSheets += 1;
      c.yellow += (row.yellow_card as number) ?? 0;
      c.red += (row.red_card as number) ?? 0;
      c.ownGoals += (row.own_goals as number) ?? 0;
      c.penMissed += (row.penalty_missed as number) ?? 0;
      if (row.match_rating !== null && (row.match_rating as number) >= threshold)
        c.ratingBonusMatches += 1;
      map.set(id, c);
    }
    if (data.length < PAGE) break;
  }
  return map;
}

// Hücre: puan + (gerçek sayı). Sayı 0 ise parantez gösterilmez.
function PtCell({ pts, extra }: { pts: number; extra?: string | null }) {
  return (
    <>
      {pts}
      {extra && (
        <span className="ml-0.5 text-[10px] font-normal text-foreground/45">
          ({extra})
        </span>
      )}
    </>
  );
}

function cardExtra(c: RawCounts | undefined): string | null {
  if (!c) return null;
  const parts: string[] = [];
  if (c.yellow > 0) parts.push(`${c.yellow}🟨`);
  if (c.red > 0) parts.push(`${c.red}🟥`);
  return parts.length ? parts.join(" ") : null;
}

function numExtra(n: number | undefined): string | null {
  return n && n > 0 ? String(n) : null;
}

export default function FutbolcuPuanlariPage() {
  const [rows, setRows] = useState<PlayerPointsBreakdown[]>([]);
  const [counts, setCounts] = useState<Map<string, RawCounts>>(new Map());
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
      const [r, c] = await Promise.all([
        selectedFilter === "total"
          ? fetchPlayerPointsBreakdown()
          : fetchGameweekPlayersBreakdown(selectedFilter),
        fetchRawCounts(selectedFilter === "total" ? null : selectedFilter),
      ]);
      if (cancelled) return;
      setRows(r);
      setCounts(c);
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
      <main className="mx-auto max-w-4xl px-3 py-4 sm:px-6 sm:py-6">
      <div className="flex flex-col gap-4 rounded-xl bg-background p-4 sm:p-6">
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
      <p className="text-center text-[11px] text-foreground/40">
        Parantez içindeki sayı, o puanın kaç gol / asist / temiz kale vb. ile
        geldiğini gösterir.
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
                  <td className="p-1 px-1.5 text-foreground/60 sm:p-2">
                    {positionLabel(r.position)}
                  </td>
                  <td className="p-1 px-1.5 text-right font-display font-semibold sm:p-2">
                    {r.toplam_puan}
                  </td>
                  <td className="p-1 px-1.5 text-right sm:p-2">{r.mac_sayisi}</td>
                  <td className="p-1 px-1.5 text-right sm:p-2">{r.oynama_puani}</td>
                  <td className="whitespace-nowrap p-1 px-1.5 text-right sm:p-2">
                    <PtCell pts={r.gol_puani} extra={numExtra(counts.get(r.player_id)?.goals)} />
                  </td>
                  <td className="whitespace-nowrap p-1 px-1.5 text-right sm:p-2">
                    <PtCell pts={r.asist_puani} extra={numExtra(counts.get(r.player_id)?.assists)} />
                  </td>
                  <td className="whitespace-nowrap p-1 px-1.5 text-right sm:p-2">
                    <PtCell
                      pts={r.temiz_kale_puani}
                      extra={numExtra(counts.get(r.player_id)?.cleanSheets)}
                    />
                  </td>
                  <td className="whitespace-nowrap p-1 px-1.5 text-right sm:p-2">
                    <PtCell pts={r.kart_puani} extra={cardExtra(counts.get(r.player_id))} />
                  </td>
                  <td className="whitespace-nowrap p-1 px-1.5 text-right sm:p-2">
                    <PtCell pts={r.kk_gol_puani} extra={numExtra(counts.get(r.player_id)?.ownGoals)} />
                  </td>
                  <td className="whitespace-nowrap p-1 px-1.5 text-right sm:p-2">
                    <PtCell
                      pts={r.pen_kacan_puani}
                      extra={numExtra(counts.get(r.player_id)?.penMissed)}
                    />
                  </td>
                  <td className="whitespace-nowrap p-1 px-1.5 text-right sm:p-2">
                    <PtCell
                      pts={r.mac_puani_bonusu}
                      extra={numExtra(counts.get(r.player_id)?.ratingBonusMatches)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      </div>
      </main>
    </>
  );
}
