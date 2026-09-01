"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "@/lib/useSession";
import { supabase } from "@/lib/supabase";
import { Formation, SQUAD_SIZE } from "@/lib/teams";
import { fetchPlayers, Player } from "@/lib/players";
import {
  fetchOpenGameweek,
  fetchUserSquad,
  fetchPreviousWeekSquad,
  buildSquadFromPicks,
} from "@/lib/squad";
import { fetchFinishedGameweeks } from "@/lib/gameweekResult";
import { fetchUserLastWeekPlayerPoints } from "@/lib/playerPoints";
import { fetchIsTransferWindowOpen } from "@/lib/transferWindow";
import { AppHeader } from "@/components/AppHeader";
import { FormationPicker } from "@/components/FormationPicker";
import { Pitch, SquadSlot, buildSlots } from "@/components/Pitch";
import { StatCards } from "@/components/StatCards";
import { PlayerPointsModal } from "@/components/PlayerPointsModal";
import { TeamEmblem } from "@/components/TeamEmblem";
import { EmblemId, DEFAULT_EMBLEM, DEFAULT_COLOR1, DEFAULT_COLOR2 } from "@/lib/emblems";

export default function TakimPage() {
  const { session, loading: sessionLoading } = useSession();
  const router = useRouter();
  const params = useParams<{ userId: string }>();
  const targetUserId = params.userId;

  const [ownerName, setOwnerName] = useState<string | null>(null);
  const [ownerEmblem, setOwnerEmblem] = useState<EmblemId>(DEFAULT_EMBLEM);
  const [ownerSlogan, setOwnerSlogan] = useState<string | null>(null);
  const [ownerColor1, setOwnerColor1] = useState(DEFAULT_COLOR1);
  const [ownerColor2, setOwnerColor2] = useState(DEFAULT_COLOR2);
  const [lastWeekPoints, setLastWeekPoints] = useState<Record<string, number>>({});
  const [lastWeekGameweekId, setLastWeekGameweekId] = useState<number | null>(null);
  const [lastWeekName, setLastWeekName] = useState<string | null>(null);

  // Gösterilen kadronun "bu haftanın canlı seçimi" değil, kilitli bir
  // önceki hafta olduğunu belirtmek için — sadece bilgi notu amaçlı.
  const [showingLockedPrevWeek, setShowingLockedPrevWeek] = useState(false);
  // Kullanıcı son 1-2 haftadır kadrosunu güncellemediyse, gösterilen kadro
  // daha da eski bir haftadan geliyor olabilir — bunu da ayrıca belirtmek
  // için.
  const [shownWeekName, setShownWeekName] = useState<string | null>(null);

  const [formation, setFormation] = useState<Formation>("4-3-3");
  const [slots, setSlots] = useState<SquadSlot[]>(() => buildSlots("4-3-3"));
  const [captainId, setCaptainId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [modalPlayer, setModalPlayer] = useState<Player | null>(null);

  useEffect(() => {
    if (!sessionLoading && !session) router.push("/giris");
  }, [sessionLoading, session, router]);

  useEffect(() => {
    if (!session) return;
    let cancelled = false;

    async function load() {
      const { data: profile } = await supabase
        .from("profiles")
        .select("username, squad_name, emblem, slogan, team_color1, team_color2")
        .eq("id", targetUserId)
        .maybeSingle();
      if (cancelled) return;
      setOwnerName(profile?.squad_name || profile?.username || "Bilinmeyen kullanıcı");
      setOwnerEmblem((profile?.emblem as EmblemId) || DEFAULT_EMBLEM);
      setOwnerSlogan(profile?.slogan || null);
      setOwnerColor1(profile?.team_color1 || DEFAULT_COLOR1);
      setOwnerColor2(profile?.team_color2 || DEFAULT_COLOR2);

      const allPlayers = await fetchPlayers();
      if (cancelled) return;

      const openGw = await fetchOpenGameweek();
      const windowOpen = await fetchIsTransferWindowOpen();
      if (cancelled) return;

      let saved: Awaited<ReturnType<typeof fetchUserSquad>> = [];
      let fromPrevWeek = false;
      let shownWeek: string | null = null;

      if (openGw) {
        if (windowOpen) {
          // Transfer penceresi açık — bu haftanın seçimleri henüz
          // kesinleşmemiş sayılır (herkes değiştirebilir), bu yüzden
          // başkalarına gösterilmez. Bunun yerine bir önceki, artık
          // kilitli haftanın kadrosu gösterilir.
          saved = await fetchPreviousWeekSquad(targetUserId, openGw.week_number);
          fromPrevWeek = saved.length > 0;
        } else {
          // Pencere kapalı — bu haftanın kadrosu artık kilitli, güvenle
          // gösterilebilir.
          saved = await fetchUserSquad(targetUserId, openGw.id);
        }
      }

      // Ne "bu hafta" ne "bir önceki hafta" bir kayıt verdiyse, kullanıcı
      // bir süredir kadrosunu güncellememiş olabilir. Sadece EN SON biten
      // haftaya bakmak yerine, geçmiş haftaları geriye doğru TEK TEK
      // tarayıp bir kayıt bulana kadar devam ediyoruz — aksi halde,
      // 2+ hafta önce kurulmuş ama sonra hiç dokunulmamış bir kadro
      // "bulunamadı" olarak görünüyordu.
      if (saved.length === 0) {
        const finished = await fetchFinishedGameweeks(); // en yeni hafta en başta
        for (const gw of finished) {
          const attempt = await fetchUserSquad(targetUserId, gw.id);
          if (attempt.length > 0) {
            saved = attempt;
            fromPrevWeek = false;
            shownWeek = gw.name || `${gw.week_number}. Hafta`;
            break;
          }
        }
      }
      if (cancelled) return;

      const result = buildSquadFromPicks(saved, allPlayers);
      if (result) {
        setFormation(result.formation);
        setSlots(result.slots);
        setCaptainId(result.captainId);
        setShowingLockedPrevWeek(fromPrevWeek);
        setShownWeekName(shownWeek);
      } else {
        setNotFound(true);
      }

      // Rozetler bu kadronun SAHİBİNİN kaptan/Maçın Yıldızı çarpanlarını
      // yansıtır — başka bir kullanıcıya bakarken de doğru toplam.
      const lastWeek = await fetchUserLastWeekPlayerPoints(targetUserId);
      if (cancelled) return;
      setLastWeekGameweekId(lastWeek.gameweekId);
      setLastWeekName(lastWeek.gameweekName);
      setLastWeekPoints(lastWeek.map);
      setLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [session, targetUserId]);

  const filledCount = slots.filter((s) => s.player).length;
  const captainName =
    slots.find((s) => s.player?.id === captainId)?.player?.name ?? null;

  if (sessionLoading || !session || loading) {
    return (
      <>
        <AppHeader />
        <main className="mx-auto flex min-h-[calc(100dvh-57px)] max-w-3xl items-center justify-center px-3 py-4">
          <p className="rounded-xl bg-background px-6 py-4 text-sm text-foreground/50">
            Yükleniyor…
          </p>
        </main>
      </>
    );
  }

  return (
    <>
      <AppHeader />
      <main className="mx-auto max-w-3xl px-3 py-4 sm:px-6 sm:py-6">
      <div className="flex flex-col gap-4 rounded-xl bg-background p-4 sm:p-6">

      {ownerName && (
        <div className="flex flex-col items-center gap-1.5">
          <TeamEmblem emblem={ownerEmblem} color1={ownerColor1} color2={ownerColor2} size={56} />
          <h1 className="text-center font-display text-2xl font-bold text-charcoal sm:text-3xl">
            {ownerName} Takım Kadro
          </h1>
          {ownerSlogan && (
            <p className="text-center text-xs italic text-foreground/60">{ownerSlogan}</p>
          )}
        </div>
      )}

      {notFound ? (
        <p className="rounded-lg border border-charcoal/10 bg-white px-4 py-6 text-center text-sm text-foreground/60">
          Bu kullanıcının görüntülenebilir bir kadrosu bulunamadı.
        </p>
      ) : (
        <>
          {showingLockedPrevWeek && (
            <p className="rounded-lg border border-gold/40 bg-gold/10 px-3 py-2 text-xs text-charcoal">
              Transfer penceresi açık olduğu için bu haftaki kadrosu henüz
              gösterilmiyor — gördüğün, bir önceki (kilitli) haftanın
              kadrosu.
            </p>
          )}
          {shownWeekName && (
            <p className="rounded-lg border border-charcoal/10 bg-white px-3 py-2 text-xs text-foreground/60">
              Bu kullanıcı son haftalarda kadrosunu güncellememiş —
              gördüğün, en son kayıtlı olduğu hafta olan {shownWeekName}
              kadrosu.
            </p>
          )}

          <FormationPicker value={formation} onChange={() => {}} />

          {lastWeekName && (
            <p className="text-center text-[11px] text-foreground/50">
              Oyuncu rozetlerindeki puanlar son hafta ({lastWeekName}) sonuçlarını gösterir
            </p>
          )}

          <Pitch
            slots={slots}
            captainId={captainId}
            lastWeekPoints={lastWeekPoints}
            onSlotTap={(slot) => {
              if (slot.player) setModalPlayer(slot.player);
            }}
          />

          <StatCards
            filledCount={filledCount}
            totalSlots={SQUAD_SIZE}
            captainName={captainName}
          />
        </>
      )}

      {modalPlayer && (
        <PlayerPointsModal
          player={modalPlayer}
          gameweekId={lastWeekGameweekId}
          onClose={() => setModalPlayer(null)}
        />
      )}
      </div>
      </main>
    </>
  );
}
