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
import { PageHeader } from "@/components/PageHeader";
import { SkeletonRow } from "@/components/Skeleton";
import { shareText, getSiteUrl } from "@/lib/share";
import { TeamEmblem } from "@/components/TeamEmblem";

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
function RankBadge({ rank, totalRows }: { rank: number; totalRows: number }) {
  if (rank === 1) return <TrophyIcon />;
  if (rank === 2) return <MedalIcon tone="silver" />;
  if (rank === 3) return <MedalIcon tone="bronze" />;
  if (totalRows > 3 && rank > totalRows - 3) return <RelegationArrowIcon />;
  return <span className="w-[18px] shrink-0" aria-hidden="true" />;
}

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

  // Kullanıcının bu filtredeki kendi satırı ve sırası — paylaşım metni için.
  const myRowIndex = session
    ? rows.findIndex((r) => r.user_id === session.user.id)
    : -1;
  const myRow = myRowIndex >= 0 ? rows[myRowIndex] : null;
  const myRank = myRowIndex >= 0 ? myRowIndex + 1 : null;

  function handleShareRank() {
    if (!myRow || !myRank) return;
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

      {selectedFilter === "total" && (
        <p className="text-center text-[11px] text-foreground/45">
          Puanlar eşitse sıralama şuna göre belirlenir: önce en yüksek tek
          hafta puanı, hâlâ eşitse en çok haftalık 1.lik sayısı.
        </p>
      )}

      {!loading && myRow && myRank && (
        <button
          onClick={handleShareRank}
          className="rounded-lg border border-charcoal/15 py-2.5 text-sm font-medium text-foreground hover:bg-charcoal/5"
        >
          Sıralamamı paylaş
        </button>
      )}

      {loading ? (
        <div className="flex flex-col gap-1.5">
          <SkeletonRow />
          <SkeletonRow />
          <SkeletonRow />
          <SkeletonRow />
          <SkeletonRow />
        </div>
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
                        size={24}
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
                    <span className="shrink-0 font-display text-base font-semibold">
                      {row.total_points}
                    </span>
                  </Link>
                </li>
              );
            })}
        </ol>
      )}
      </div>
      </main>
    </>
  );
}
