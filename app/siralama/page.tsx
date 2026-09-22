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
import { supabase } from "@/lib/supabase";
import { AppHeader } from "@/components/AppHeader";
import { PageHeader } from "@/components/PageHeader";
import { SkeletonRow } from "@/components/Skeleton";
import { shareText, getSiteUrl } from "@/lib/share";
import { TeamEmblem } from "@/components/TeamEmblem";
import { JerseyIcon } from "@/components/JerseyIcon";
import { EmblemId } from "@/lib/emblems";
import { TeamCode } from "@/lib/teams";

function TrophyIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" className="text-gold" aria-hidden="true">
      <path
        fill="currentColor"
        d="M7 3h10v2h3a1 1 0 011 1v1a4 4 0 01-4 4h-.26A6 6 0 0113 15.9V18h3a1 1 0 011 1v1H7v-1a1 1 0 011-1h3v-2.1A6 6 0 016.26 11H6a4 4 0 01-4-4V6a1 1 0 011-1h3V3zM5 7a2 2 0 002 2V7H5zm14 0v2a2 2 0 002-2h-2z"
      />
    </svg>
  );
}

function MedalIcon({ tone }: { tone: "silver" | "bronze" }) {
  const colorClass = tone === "silver" ? "text-zinc-400" : "text-amber-700";
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" className={colorClass} aria-hidden="true">
      <path fill="currentColor" d="M8 2l2 6H8.5L6.5 2H8zm8 0h-1.5l-2 6H14l2-6z" />
      <circle cx="12" cy="14.5" r="6.5" fill="currentColor" />
      <path
        fill="#fff"
        d="M12 10.8l1.1 2.3 2.5.4-1.8 1.7.4 2.5-2.2-1.2-2.2 1.2.4-2.5-1.8-1.7 2.5-.4z"
      />
    </svg>
  );
}

function RelegationArrowIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" className="text-red-600" aria-hidden="true">
      <path fill="currentColor" d="M11 3h2v9h4l-5 6-5-6h4V3z" />
    </svg>
  );
}

// Sıralamadaki her satırın solunda gösterilecek rozet: ilk 3 için
// kupa/madalya, listenin en alt 3 satırı için küme düşme oku. Diğer
// satırlarda hizalamayı bozmasın diye aynı genişlikte boş bir alan bırakılır.
// Haftalık Birincilikler ve Hafta Başına Puan görünümlerinde küme düşme
// oku hiç gösterilmez (showRelegation=false) — bu listeler "en iyi
// performans" sıralaması, kimsenin "düşmesi" gibi bir anlam taşımıyor.
// TÜM durumlar (ikon var/yok, hangi ikon) aynı sabit 22x22 kapsayıcı
// içinde ortalanır — böylece kupa/madalya/ok/boşluk arasında geçiş
// yaparken satır hizası ASLA kaymaz (mobilde dengesiz görünen buydu).
function RankBadge({
  rank,
  totalRows,
  showRelegation = true,
}: {
  rank: number;
  totalRows: number;
  showRelegation?: boolean;
}) {
  let icon: React.ReactNode = null;
  if (rank === 1) icon = <TrophyIcon />;
  else if (rank === 2) icon = <MedalIcon tone="silver" />;
  else if (rank === 3) icon = <MedalIcon tone="bronze" />;
  else if (showRelegation && totalRows > 3 && rank > totalRows - 3)
    icon = <RelegationArrowIcon />;

  return (
    <span
      className="flex h-[22px] w-[22px] shrink-0 items-center justify-center"
      aria-hidden="true"
    >
      {icon}
    </span>
  );
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

interface PerGameRow {
  user_id: string;
  username: string;
  squad_name: string | null;
  emblem: EmblemId;
  team_color1: string;
  team_color2: string;
  slogan: string | null;
  gamesPlayed: number;
  total_points: number;
  avgPoints: number;
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

type FilterValue = "total" | "weekly_wins" | "per_game" | number;

export default function SiralamaPage() {
  const { session } = useSession();
  const [rows, setRows] = useState<LeaderboardRowWithTrend[]>([]);
  const [weeklyWinRows, setWeeklyWinRows] = useState<WeeklyWinRow[]>([]);
  const [perGameRows, setPerGameRows] = useState<PerGameRow[]>([]);
  const [weeks, setWeeks] = useState<FinishedGameweek[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<FilterValue>("total");
  const [loading, setLoading] = useState(true);
  const [lastWeekRanks, setLastWeekRanks] = useState<Map<string, number>>(new Map());
  const [highlights, setHighlights] = useState<WeeklyHighlights | null>(null);

  useEffect(() => {
    fetchFinishedGameweeks().then(setWeeks);
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

  // En son biten haftanın 1.si ("Haftanın Takımı") ve o haftanın en
  // yüksek puanlı gerçek futbolcusu ("Haftanın Futbolcusu").
  async function loadHighlights(): Promise<WeeklyHighlights> {
    if (weeks.length === 0) return { teamOfWeek: null, playerOfWeek: null };
    const lastWeek = weeks[0];

    const weekRows = await fetchGameweekLeaderboard(lastWeek.id);
    const teamOfWeek = weekRows.length > 0 ? weekRows[0] : null;

    const { data: topStat } = await supabase
      .from("player_stats")
      .select("player_id, points, players(name, teams(short_code))")
      .eq("gameweek_id", lastWeek.id)
      .order("points", { ascending: false })
      .limit(1)
      .maybeSingle();

    let playerOfWeek: WeeklyHighlights["playerOfWeek"] = null;

    if (topStat) {
      const playerRel = topStat.players as unknown as
        | { name: string; teams: { short_code: string } | { short_code: string }[] }
        | { name: string; teams: { short_code: string } | { short_code: string }[] }[];
      const player = Array.isArray(playerRel) ? playerRel[0] : playerRel;
      const teamRel = player?.teams;
      const teamCode = Array.isArray(teamRel) ? teamRel[0]?.short_code : teamRel?.short_code;

      playerOfWeek = {
        name: player?.name ?? "?",
        team: (teamCode as TeamCode) ?? null,
        points: (topStat.points as number) ?? 0,
      };
    }

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

  // Her kullanıcının kadrosunun bulunduğu hafta sayısını bulup, genel
  // toplam puanını bu sayıya bölerek "hafta başına ortalama puan"ı
  // hesaplar. Geç katılan ya da bazı haftaları kaçıran kullanıcıları da
  // adil şekilde kıyaslar. Hiç hafta oynamayan biri varsa listeden
  // çıkarılır, ortalama tanımsız olur.
  async function loadPerGame(): Promise<PerGameRow[]> {
    const totals = await fetchLeaderboardWithTrend();

    const gamesPlayed = new Map<string, number>();
    for (const w of weeks) {
      const weekRows = await fetchGameweekLeaderboard(w.id);
      for (const wr of weekRows) {
        gamesPlayed.set(wr.user_id, (gamesPlayed.get(wr.user_id) ?? 0) + 1);
      }
    }

    const result: PerGameRow[] = totals
      .map((r) => {
        const played = gamesPlayed.get(r.user_id) ?? 0;
        return {
          user_id: r.user_id,
          username: r.username,
          squad_name: r.squad_name,
          emblem: r.emblem,
          team_color1: r.team_color1,
          team_color2: r.team_color2,
          slogan: r.slogan,
          gamesPlayed: played,
          total_points: r.total_points,
          avgPoints: played > 0 ? r.total_points / played : 0,
        };
      })
      .filter((r) => r.gamesPlayed > 0);

    result.sort((a, b) => b.avgPoints - a.avgPoints || b.total_points - a.total_points);
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

      if (selectedFilter === "per_game") {
        const perGame = await loadPerGame();
        if (cancelled) return;
        setPerGameRows(perGame);
        setLoading(false);
        return;
      }

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedFilter, weeks]);

  const isWeeklyWins = selectedFilter === "weekly_wins";
  const isPerGame = selectedFilter === "per_game";

  // Kullanıcının bu filtredeki kendi satırı ve sırası — paylaşım metni için.
  const myRowIndexInRows = session ? rows.findIndex((r) => r.user_id === session.user.id) : -1;
  const myRowIndexInWins = session
    ? weeklyWinRows.findIndex((r) => r.user_id === session.user.id)
    : -1;
  const myRowIndexInPerGame = session
    ? perGameRows.findIndex((r) => r.user_id === session.user.id)
    : -1;
  const myRowIndex = isWeeklyWins
    ? myRowIndexInWins
    : isPerGame
    ? myRowIndexInPerGame
    : myRowIndexInRows;
  const myWinRow = myRowIndexInWins >= 0 ? weeklyWinRows[myRowIndexInWins] : null;
  const myPerGameRow = myRowIndexInPerGame >= 0 ? perGameRows[myRowIndexInPerGame] : null;
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

    if (isPerGame) {
      if (!myPerGameRow) return;
      const avgText = myPerGameRow.avgPoints.toFixed(1);
      const shareUrl = `${getSiteUrl()}/paylas/siralama?rank=${myRank}&points=${avgText}&name=${encodeURIComponent(
        myPerGameRow.squad_name || myPerGameRow.username
      )}&scope=${encodeURIComponent("hafta başına puanda")}`;
      shareText(
        `Fantasy Manager: 4 Büyükler'de hafta başına puanda #${myRank}. sıradayım, hafta başına ${avgText} puan alıyorum! ${shareUrl}`
      );
      return;
    }

    if (!myRow) return;
    const scopeText =
      selectedFilter === "total"
        ? "genel toplamda"
        : weeks.find((w) => w.id === selectedFilter)?.name ||
          `${weeks.find((w) => w.id === selectedFilter)?.week_number ?? ""}. haftada`;

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

      <select
        value={selectedFilter}
        onChange={(e) => {
          const v = e.target.value;
          setSelectedFilter(
            v === "total"
              ? "total"
              : v === "weekly_wins"
              ? "weekly_wins"
              : v === "per_game"
              ? "per_game"
              : Number(v)
          );
        }}
        className="h-10 w-full rounded-lg border border-charcoal/15 bg-white px-3 text-sm"
      >
        <option value="total">Genel Toplam</option>
        <option value="weekly_wins">Haftalık Birincilikler</option>
        <option value="per_game">Hafta Başına Puan</option>
        {weeks.map((w) => (
          <option key={w.id} value={w.id}>
            {w.name || `${w.week_number}. Hafta`}
          </option>
        ))}
      </select>

      {isWeeklyWins && (
        <p className="text-center text-[11px] text-foreground/45">
          Her hafta en yüksek puanı alan kişiye +1 yazılır. Eşitlikte genel
          toplam puan belirleyicidir.
        </p>
      )}

      {isPerGame && (
        <p className="text-center text-[11px] text-foreground/45">
          Genel toplam puan, kadronun bulunduğu hafta sayısına bölünür —
          geç katılanları da adil şekilde kıyaslar.
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
                    className={`flex items-center justify-between rounded-lg border px-3 py-2.5 transition-colors active:bg-charcoal/5 ${
                      isMe
                        ? "border-gold bg-gold/10"
                        : "border-charcoal/10 bg-white"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <RankBadge rank={i + 1} totalRows={weeklyWinRows.length} showRelegation={false} />
                      <span className="w-9 shrink-0 text-right text-sm font-medium text-foreground/50">
                        {i + 1}
                      </span>
                      <TeamEmblem
                        emblem={row.emblem}
                        color1={row.team_color1}
                        color2={row.team_color2}
                        size={28}
                      />
                      <div>
                        <p className="text-sm font-medium leading-tight">
                          {row.squad_name || row.username}
                          {isMe && (
                            <span className="ml-1.5 text-xs font-normal text-gold">
                              (sen)
                            </span>
                          )}
                        </p>
                        {row.slogan && (
                          <p className="text-[10px] italic leading-tight text-foreground/45">
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
      ) : isPerGame ? (
        perGameRows.length === 0 ? (
          <p className="rounded-lg border border-charcoal/10 bg-white px-4 py-6 text-center text-sm text-foreground/60">
            Henüz kimse puan almadı — ilk hafta tamamlanınca burada
            görünecek.
          </p>
        ) : (
          <ol className="flex flex-col gap-1.5">
            {perGameRows.map((row, i) => {
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
                      <RankBadge rank={i + 1} totalRows={perGameRows.length} showRelegation={false} />
                      <span className="w-9 shrink-0 text-right text-sm font-medium text-foreground/50">
                        {i + 1}
                      </span>
                      <TeamEmblem
                        emblem={row.emblem}
                        color1={row.team_color1}
                        color2={row.team_color2}
                        size={28}
                      />
                      <div>
                        <p className="text-sm font-medium leading-tight">
                          {row.squad_name || row.username}
                          {isMe && (
                            <span className="ml-1.5 text-xs font-normal text-gold">
                              (sen)
                            </span>
                          )}
                        </p>
                        {row.slogan && (
                          <p className="text-[10px] italic leading-tight text-foreground/45">
                            {row.slogan}
                          </p>
                        )}
                      </div>
                    </div>
                    <span className="flex shrink-0 flex-col items-end">
                      <span className="font-display text-base font-semibold">
                        {row.avgPoints.toFixed(1)}
                      </span>
                      <span className="text-[10px] text-foreground/45">
                        puan/hafta · {row.gamesPlayed} hafta
                      </span>
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
                  className={`flex items-center justify-between rounded-lg border px-3 py-2.5 transition-colors active:bg-charcoal/5 ${
                      isMe
                        ? "border-gold bg-gold/10"
                        : "border-charcoal/10 bg-white"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <RankBadge rank={i + 1} totalRows={rows.length} />
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
                      <TeamEmblem
                        emblem={row.emblem}
                        color1={row.team_color1}
                        color2={row.team_color2}
                        size={28}
                      />
                      <div>
                        <p className="text-sm font-medium leading-tight">
                          {row.squad_name || row.username}
                          {isMe && (
                            <span className="ml-1.5 text-xs font-normal text-gold">
                              (sen)
                            </span>
                          )}
                        </p>
                        {row.slogan && (
                          <p className="text-[10px] italic leading-tight text-foreground/45">
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

      {selectedFilter === "total" && (
        <p className="text-center text-[11px] text-foreground/45">
          Puanlar eşitse sıralama şuna göre belirlenir: önce en yüksek tek
          hafta puanı, hâlâ eşitse en çok haftalık 1.lik sayısı.
        </p>
      )}

      {!loading &&
        myRank &&
        (isWeeklyWins ? myWinRow : isPerGame ? myPerGameRow : myRow) && (
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
