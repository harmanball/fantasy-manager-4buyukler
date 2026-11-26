"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  fetchLeaderboardWithTrend,
  fetchGameweekLeaderboard,
  fetchLastClosedGameweek,
  fetchHalfLeaderboard,
  LeaderboardRowWithTrend,
} from "@/lib/leaderboard";
import { fetchFinishedGameweeks, FinishedGameweek } from "@/lib/gameweekResult";
import { useSession } from "@/lib/useSession";
import { TeamsRaceChart } from "@/components/TeamsRaceChart";
import { supabase } from "@/lib/supabase";
import { fetchWeekTopPlayer } from "@/lib/teamOfWeek";
import { AppHeader } from "@/components/AppHeader";
import { PageHeader } from "@/components/PageHeader";
import { SkeletonRow } from "@/components/Skeleton";
import { shareText, getSiteUrl } from "@/lib/share";
import { TeamEmblem } from "@/components/TeamEmblem";
import { JerseyIcon } from "@/components/JerseyIcon";
import { EmblemId } from "@/lib/emblems";
import { TeamCode } from "@/lib/teams";

// Sıralamadaki her satırın çerçeve rengini belirler: 1. yeşil, 2-3. mavi,
// (sadece showRelegation açıksa) son 3 satır kırmızı — hiçbir ikon
// kullanılmaz, sadece kalın renkli çerçeve. Rütbe rengi HER ZAMAN önce
// gelir — kendi satırın (isMe) ilk 3'te ya da son 3'teyse yine o rütbe
// rengini alır, "(sen)" etiketi zaten kimin satırı olduğunu gösteriyor.
// isMe altın çerçeve sadece rütbe rengi uygulanmayan orta satırlarda çıkar.
function rowBorderClass(
  rank: number,
  totalRows: number,
  isMe: boolean,
  showRelegation: boolean
): string {
  if (rank === 1) return "border-4 border-green-700 bg-white";
  if (rank === 2 || rank === 3) return "border-4 border-blue-700 bg-white";
  if (showRelegation && totalRows > 3 && rank > totalRows - 3)
    return "border-4 border-red-700 bg-white";
  if (isMe) return "border border-gold bg-gold/10";
  return "border border-charcoal/10 bg-white";
}

interface WeeklyWinRow {
  user_id: string;
  username: string;
  squad_name: string | null;
  emblem: EmblemId;
  team_color1: string;
  team_color2: string;
  slogan: string | null;
  winCount: number;
  total_points: number;
}

interface WeeklyHighlights {
  teamOfWeek: {
    squad_name: string | null;
    username: string;
    emblem: EmblemId;
    team_color1: string;
    team_color2: string;
  } | null;
  playerOfWeek: {
    name: string;
    team: TeamCode | null;
    points: number;
  } | null;
}

type FilterValue = "total" | "weekly_wins" | "last" | "half1" | "half2" | number;

export default function SiralamaPage() {
  const { session } = useSession();
  const [rows, setRows] = useState<LeaderboardRowWithTrend[]>([]);
  const [weeklyWinRows, setWeeklyWinRows] = useState<WeeklyWinRow[]>([]);
  const [weeks, setWeeks] = useState<FinishedGameweek[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<FilterValue>("half1");
  // Kapatılmış (status=finished) son hafta. undefined: henüz yüklenmedi, null: yok.
  const [lastClosed, setLastClosed] = useState<{ id: number; week_number: number } | null | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [lastWeekRanks, setLastWeekRanks] = useState<Map<string, number>>(new Map());
  const [highlights, setHighlights] = useState<WeeklyHighlights | null>(null);

  // Sezon takvimi için: hafta numarası -> durum (finished / open / upcoming)
  const [weekStatus, setWeekStatus] = useState<Record<number, string>>({});
  useEffect(() => {
    supabase
      .from("gameweeks")
      .select("week_number, status")
      .then(({ data }) => {
        const m: Record<number, string> = {};
        for (const g of data ?? []) m[g.week_number as number] = g.status as string;
        setWeekStatus(m);
      });
  }, []);

  useEffect(() => {
    fetchFinishedGameweeks().then(setWeeks);
    fetchLastClosedGameweek().then(setLastClosed);
  }, []);

  // Genel Toplam görünümünde, her satırın sağına en son biten haftadaki
  // sırasını da eklemek için — weeks en yeniden en eskiye sıralı geldiği
  // için weeks[0] "son hafta"dır.
  useEffect(() => {
    if (weeks.length === 0) {
      setLastWeekRanks(new Map());
      return;
    }
    fetchGameweekLeaderboard(weeks[0].id).then((weekRows) => {
      setLastWeekRanks(new Map(weekRows.map((r, i) => [r.user_id, i + 1])));
    });
  }, [weeks]);

  // En son KAPANAN haftanın 1.si ("Haftanın Takımı") ve o haftanın en
  // yüksek puanlı gerçek futbolcusu ("Haftanın Futbolcusu").
  async function loadHighlights(): Promise<WeeklyHighlights> {
    // Sadece admin tarafından KAPATILMIŞ haftalar sergilenir; hafta kapanmadan
    // (ör. sadece bir maç oynandıysa) bir önceki kapanmış hafta görünür.
    const lastWeek = await fetchLastClosedGameweek();
    if (!lastWeek) return { teamOfWeek: null, playerOfWeek: null };

    const weekRows = await fetchGameweekLeaderboard(lastWeek.id);
    const teamOfWeek = weekRows.length > 0 ? weekRows[0] : null;

    // Haftanın Futbolcusu = Haftanın Takımı'ndaki en iyi oyuncu (aynı
    // eşitlik kuralları: puan > reyting > MVP > gol > asist > dakika > galibiyet).
    const top = await fetchWeekTopPlayer(lastWeek.id);
    const playerOfWeek: WeeklyHighlights["playerOfWeek"] = top
      ? { name: top.name, team: top.team, points: top.points }
      : null;

    return { teamOfWeek, playerOfWeek };
  }

  useEffect(() => {
    if (weeks.length === 0) {
      setHighlights(null);
      return;
    }
    loadHighlights().then(setHighlights);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weeks]);

  // Her bitmiş haftanın 1.sini bulup kaç kez 1. olunduğunu sayar. Genel
  // sıralamadaki HERKES bu listede yer alır (hiç 1. olmayanlar da 0 ile
  // görünür) — eşitlikte genel toplam puana göre sıralanır.
  async function loadWeeklyWins(): Promise<WeeklyWinRow[]> {
    const totals = await fetchLeaderboardWithTrend();

    const winCounts = new Map<string, number>();
    for (const w of weeks) {
      const weekRows = await fetchGameweekLeaderboard(w.id);
      if (weekRows.length === 0) continue;
      const winnerId = weekRows[0].user_id;
      winCounts.set(winnerId, (winCounts.get(winnerId) ?? 0) + 1);
    }

    const result: WeeklyWinRow[] = totals.map((r) => ({
      user_id: r.user_id,
      username: r.username,
      squad_name: r.squad_name,
      emblem: r.emblem,
      team_color1: r.team_color1,
      team_color2: r.team_color2,
      slogan: r.slogan,
      winCount: winCounts.get(r.user_id) ?? 0,
      total_points: r.total_points,
    }));

    result.sort((a, b) => b.winCount - a.winCount || b.total_points - a.total_points);
    return result;
  }

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);

      if (selectedFilter === "weekly_wins") {
        const wins = await loadWeeklyWins();
        if (cancelled) return;
        setWeeklyWinRows(wins);
        setLoading(false);
        return;
      }

      if (selectedFilter === "last") {
        if (lastClosed === undefined) return; // hafta bilgisi gelince efekt yeniden çalışır
        if (lastClosed === null) {
          if (cancelled) return;
          setRows([]);
          setLoading(false);
          return;
        }
      }

      const weekId = selectedFilter === "last" ? lastClosed!.id : selectedFilter;
      const r =
        selectedFilter === "total"
          ? await fetchLeaderboardWithTrend()
          : selectedFilter === "half1" || selectedFilter === "half2"
          ? (await fetchHalfLeaderboard(selectedFilter === "half1" ? 1 : 2)).map((row) => ({
              ...row,
              rankChange: null,
            }))
          : (await fetchGameweekLeaderboard(weekId as number)).map((row) => ({
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedFilter, weeks, lastClosed]);

  const isWeeklyWins = selectedFilter === "weekly_wins";

  // Kullanıcının bu filtredeki kendi satırı ve sırası — paylaşım metni için.
  const myRowIndexInRows = session ? rows.findIndex((r) => r.user_id === session.user.id) : -1;
  const myRowIndexInWins = session
    ? weeklyWinRows.findIndex((r) => r.user_id === session.user.id)
    : -1;
  const myRowIndex = isWeeklyWins ? myRowIndexInWins : myRowIndexInRows;
  const myWinRow = myRowIndexInWins >= 0 ? weeklyWinRows[myRowIndexInWins] : null;
  const myRow = myRowIndexInRows >= 0 ? rows[myRowIndexInRows] : null;
  const myRank = myRowIndex >= 0 ? myRowIndex + 1 : null;

  function handleShareRank() {
    if (!myRank) return;

    if (isWeeklyWins) {
      if (!myWinRow) return;
      const shareUrl = `${getSiteUrl()}/paylas/siralama?rank=${myRank}&points=${
        myWinRow.winCount
      }&name=${encodeURIComponent(
        myWinRow.squad_name || myWinRow.username
      )}&scope=${encodeURIComponent("haftalık birincilik sayısında")}`;
      shareText(
        `Fantasy Manager: 4 Büyükler'de haftalık birincilik sayısında #${myRank}. sıradayım, ${myWinRow.winCount} kez 1. oldum! ${shareUrl}`
      );
      return;
    }

    if (!myRow) return;
    const scopeWeekId = selectedFilter === "last" ? lastClosed?.id : selectedFilter;
    const scopeText =
      selectedFilter === "total"
        ? "genel toplamda"
        : selectedFilter === "half1"
        ? "sezonun 1. yarısında"
        : selectedFilter === "half2"
        ? "sezonun 2. yarısında"
        : weeks.find((w) => w.id === scopeWeekId)?.name ||
          `${weeks.find((w) => w.id === scopeWeekId)?.week_number ?? lastClosed?.week_number ?? ""}. haftada`;

    // Metindeki link artık ana sayfa değil, sonucu görsel bir önizlemeyle
    // (WhatsApp/OG kartı) gösteren ayrı bir paylaşım sayfası.
    const shareUrl = `${getSiteUrl()}/paylas/siralama?rank=${myRank}&points=${
      myRow.total_points
    }&name=${encodeURIComponent(myRow.squad_name || myRow.username)}&scope=${encodeURIComponent(
      scopeText
    )}`;

    shareText(
      `Fantasy Manager: 4 Büyükler lig sıralamasında ${scopeText} #${myRank}. sıradayım, ${myRow.total_points} puanla! ${shareUrl}`
    );
  }

  return (
    <>
      <AppHeader />
      <main className="mx-auto max-w-3xl px-3 py-4 sm:px-6 sm:py-6">
      <div className="flex flex-col gap-4 rounded-xl bg-background p-4 sm:p-6">
        <PageHeader icon="trophy" title="Lig Sıralaması" />

      {highlights && (highlights.teamOfWeek || highlights.playerOfWeek) && (
        <div className="grid grid-cols-2 gap-0 rounded-2xl bg-pitch p-5">
          <div className="flex flex-col items-center gap-2 px-2 text-center">
            <p className="text-[11px] font-medium uppercase tracking-wide text-gold">
              Haftanın Takımı
            </p>
            {highlights.teamOfWeek ? (
              <>
                <TeamEmblem
                  emblem={highlights.teamOfWeek.emblem}
                  color1={highlights.teamOfWeek.team_color1}
                  color2={highlights.teamOfWeek.team_color2}
                  size={52}
                />
                <p className="text-sm font-medium text-ivory">
                  {highlights.teamOfWeek.squad_name || highlights.teamOfWeek.username}
                </p>
              </>
            ) : (
              <p className="text-xs text-ivory/50">—</p>
            )}
          </div>

          <div className="flex flex-col items-center gap-2 border-l border-ivory/15 px-2 text-center">
            <p className="text-[11px] font-medium uppercase tracking-wide text-gold">
              Haftanın Futbolcusu
            </p>
            {highlights.playerOfWeek ? (
              <>
                {highlights.playerOfWeek.team ? (
                  <JerseyIcon team={highlights.playerOfWeek.team} size={52} />
                ) : (
                  <div className="h-[52px] w-[52px]" />
                )}
                <p className="text-sm font-medium text-ivory">
                  {highlights.playerOfWeek.name}
                </p>
              </>
            ) : (
              <p className="text-xs text-ivory/50">—</p>
            )}
          </div>
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <div className="flex flex-wrap items-center gap-1.5">
          {(
            [
              ["half1", "Sezon 1. Yarı"],
              ["half2", "Sezon 2. Yarı"],
              ["last", "Son Hafta"],
              ["total", "Genel Sıralama"],
            ] as [FilterValue, string][]
          ).map(([value, label]) => (
            <button
              key={String(value)}
              type="button"
              onClick={() => setSelectedFilter(value)}
              className={`rounded-full border px-3.5 py-1.5 text-[12.5px] font-semibold ${
                selectedFilter === value
                  ? "border-pitch bg-pitch text-ivory"
                  : "border-charcoal/20 bg-white text-charcoal"
              }`}
            >
              {label}
            </button>
          ))}
          <div className="relative">
            <select
              aria-label="Hafta seç"
              value={typeof selectedFilter === "number" ? selectedFilter : ""}
              onChange={(e) => {
                if (e.target.value !== "") setSelectedFilter(Number(e.target.value));
              }}
              className={`appearance-none rounded-full border py-1.5 pl-3.5 pr-7 text-[12.5px] font-semibold ${
                typeof selectedFilter === "number"
                  ? "border-pitch bg-pitch text-ivory"
                  : "border-charcoal/20 bg-white text-charcoal"
              }`}
            >
              <option value="" disabled>
                Hafta seç
              </option>
              {weeks.map((w) => (
                <option key={w.id} value={w.id} className="bg-white text-charcoal">
                  {w.name || `${w.week_number}. Hafta`}
                </option>
              ))}
            </select>
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-current">
              ▾
            </span>
          </div>
          <button
            type="button"
            onClick={() => setSelectedFilter("weekly_wins")}
            className={`rounded-full border px-3.5 py-1.5 text-[12.5px] font-semibold ${
              selectedFilter === "weekly_wins"
                ? "border-pitch bg-pitch text-ivory"
                : "border-charcoal/20 bg-white text-charcoal"
            }`}
          >
            Haf. Birincilik
          </button>
        </div>

        {(selectedFilter === "half1" || selectedFilter === "half2") && (() => {
          const start = selectedFilter === "half1" ? 1 : 18;
          const nums = Array.from({ length: 17 }, (_, i) => start + i);
          const doneCount = nums.filter((n) => weekStatus[n] === "finished").length;
          return (
            <div className="flex items-center gap-2" aria-label={`Sezon takvimi: ${doneCount} / 17 hafta tamamlandı`}>
              <div className="grid flex-1 grid-cols-[repeat(17,minmax(0,1fr))] gap-[2px]">
                {nums.map((n) => {
                  const st = weekStatus[n];
                  const done = st === "finished";
                  const cur = st === "open";
                  return (
                    <span
                      key={n}
                      title={`${n}. hafta`}
                      className={`relative grid aspect-square place-items-center rounded-[3px] border font-serif text-[8px] font-bold leading-none ${
                        done
                          ? "border-charcoal/10 bg-charcoal/10 text-charcoal/40"
                          : cur
                          ? "border-pitch bg-pitch text-ivory ring-[1.5px] ring-gold/70"
                          : "border-pitch/40 bg-white/60 text-pitch"
                      }`}
                    >
                      {n}
                      {done && (
                        <svg viewBox="0 0 10 10" className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true">
                          <path d="M1.5 1.5 L8.5 8.5 M8.5 1.5 L1.5 8.5" stroke="#b91c1c" strokeWidth="1.2" strokeLinecap="round" />
                        </svg>
                      )}
                    </span>
                  );
                })}
              </div>
              <span className="whitespace-nowrap text-[10.5px] text-foreground/50">{doneCount}/17</span>
            </div>
          );
        })()}
        {(selectedFilter === "half1" || selectedFilter === "half2") && (
          <p className="text-center text-[11px] text-foreground/45">
            {selectedFilter === "half1"
              ? "Sezon 1. yarı sıralaması (1-17. haftalar)"
              : "Sezon 2. yarı sıralaması (18-34. haftalar)"}
          </p>
        )}
        {selectedFilter === "last" && (
          <p className="text-center text-[11px] text-foreground/45">
            {lastClosed
              ? `${weeks.find((w) => w.id === lastClosed.id)?.name || `${lastClosed.week_number}. Hafta`} sıralaması`
              : lastClosed === null
              ? "Henüz kapanmış bir hafta yok."
              : ""}
          </p>
        )}
        {typeof selectedFilter === "number" && (
          <p className="text-center text-[11px] text-foreground/45">
            {weeks.find((w) => w.id === selectedFilter)?.name ||
              `${weeks.find((w) => w.id === selectedFilter)?.week_number ?? ""}. Hafta`}{" "}
            sıralaması
          </p>
        )}
      </div>

      {isWeeklyWins && (
        <p className="text-center text-[11px] text-foreground/45">
          Her hafta en yüksek puanı alan kişiye +1 yazılır. Eşitlikte genel
          toplam puan belirleyicidir.
        </p>
      )}

      {loading ? (
        <div className="flex flex-col gap-1.5">
          <SkeletonRow />
          <SkeletonRow />
          <SkeletonRow />
          <SkeletonRow />
          <SkeletonRow />
        </div>
      ) : isWeeklyWins ? (
        weeklyWinRows.length === 0 ? (
          <p className="rounded-lg border border-charcoal/10 bg-white px-4 py-6 text-center text-sm text-foreground/60">
            Henüz kimse puan almadı — ilk hafta tamamlanınca burada
            görünecek.
          </p>
        ) : (
          <ol className="flex flex-col gap-1.5">
            {weeklyWinRows.map((row, i) => {
              const isMe = session?.user.id === row.user_id;
              return (
                <li key={row.user_id}>
                  <Link
                    href={isMe ? "/kadro" : `/takim/${row.user_id}`}
                    className={`flex items-center justify-between rounded-lg px-3 py-2.5 transition-colors active:bg-charcoal/5 ${rowBorderClass(
                      i + 1,
                      weeklyWinRows.length,
                      isMe,
                      false
                    )}`}
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      <span className="w-9 shrink-0 text-right text-sm font-medium text-foreground/50">
                        {i + 1}
                      </span>
                      <span className="shrink-0">
                        <TeamEmblem
                          emblem={row.emblem}
                          color1={row.team_color1}
                          color2={row.team_color2}
                          size={28}
                        />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium leading-tight">
                          {row.squad_name || row.username}
                          {isMe && (
                            <span className="ml-1.5 text-xs font-normal text-gold">
                              (sen)
                            </span>
                          )}
                        </p>
                        {row.slogan && (
                          <p className="break-words text-[10px] italic leading-tight text-foreground/45">
                            {row.slogan}
                          </p>
                        )}
                      </div>
                    </div>
                    <span className="flex shrink-0 flex-col items-end">
                      <span className="font-display text-base font-semibold">
                        {row.winCount}
                      </span>
                      <span className="text-[10px] text-foreground/45">kez 1.</span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ol>
        )
      ) : rows.length === 0 ? (
        <p className="rounded-lg border border-charcoal/10 bg-white px-4 py-6 text-center text-sm text-foreground/60">
          Henüz kimse puan almadı — ilk hafta tamamlanınca sıralama burada
          görünecek.
        </p>
      ) : (
        <ol className="flex flex-col gap-1.5">
          {rows.map((row, i) => {
            const isMe = session?.user.id === row.user_id;
            const lastWeekRank =
              selectedFilter === "total" ? lastWeekRanks.get(row.user_id) : undefined;
            return (
              <li key={row.user_id}>
                <Link
                  href={isMe ? "/kadro" : `/takim/${row.user_id}`}
                  className={`flex items-center justify-between rounded-lg px-3 py-2.5 transition-colors active:bg-charcoal/5 ${rowBorderClass(
                      i + 1,
                      rows.length,
                      isMe,
                      true
                    )}`}
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-3">
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
                      <span className="shrink-0">
                        <TeamEmblem
                          emblem={row.emblem}
                          color1={row.team_color1}
                          color2={row.team_color2}
                          size={28}
                        />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium leading-tight">
                          {row.squad_name || row.username}
                          {isMe && (
                            <span className="ml-1.5 text-xs font-normal text-gold">
                              (sen)
                            </span>
                          )}
                        </p>
                        {row.slogan && (
                          <p className="break-words text-[10px] italic leading-tight text-foreground/45">
                            {row.slogan}
                          </p>
                        )}
                      </div>
                    </div>
                    <span className="flex shrink-0 flex-col items-end">
                      <span className="font-display text-base font-semibold">
                        {row.total_points}
                      </span>
                      {lastWeekRank !== undefined && (
                        <span className="text-[10px] text-foreground/45">
                          Son hafta {lastWeekRank}.
                        </span>
                      )}
                    </span>
                  </Link>
                </li>
              );
            })}
        </ol>
      )}

      {!loading && selectedFilter !== "weekly_wins" && (
        <TeamsRaceChart
          startWeek={selectedFilter === "half2" ? 18 : 1}
          endWeek={selectedFilter === "half1" ? 17 : selectedFilter === "half2" ? 34 : undefined}
          subtitle={
            selectedFilter === "half1"
              ? "Sezon 1. yarı · Haftalar 1–17"
              : selectedFilter === "half2"
              ? "Sezon 2. yarı · Haftalar 18–34"
              : "Tüm sezon"
          }
          meId={session?.user.id}
        />
      )}

      {selectedFilter === "total" && (
        <p className="text-center text-[11px] text-foreground/45">
          Puanlar eşitse sıralama şuna göre belirlenir: önce en yüksek tek
          hafta puanı, hâlâ eşitse en çok haftalık 1.lik sayısı.
        </p>
      )}

      {!loading &&
        myRank &&
        (isWeeklyWins ? myWinRow : myRow) && (
          <button
            onClick={handleShareRank}
            className="rounded-lg border border-charcoal/15 py-2.5 text-sm font-medium text-foreground hover:bg-charcoal/5"
          >
            Sıralamamı paylaş
          </button>
        )}
      </div>
      </main>
    </>
  );
}
