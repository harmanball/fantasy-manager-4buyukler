"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";
import { TeamEmblem } from "@/components/TeamEmblem";
import { PressConference } from "@/components/PressConference";
import { useSession } from "@/lib/useSession";
import { loadGazeteData, buildIssue, GazeteData, Part, Story } from "@/lib/gazete";
import { REACTIONS, ReactionId, ReactionState, fetchReactions, setReaction } from "@/lib/gazeteReactions";

function Headline({ parts }: { parts: Part[] }) {
  return (
    <>
      {parts.map((p, i) =>
        p.hot ? (
          <span key={i} className="text-red-700">
            {p.text}
          </span>
        ) : (
          <span key={i}>{p.text}</span>
        )
      )}
    </>
  );
}

function ReactionBar({
  storyId,
  state,
  canReact,
  onReact,
  nameOf,
}: {
  storyId: string;
  state: ReactionState;
  canReact: boolean;
  onReact: (storyId: string, r: ReactionId) => void;
  nameOf: (userId: string) => string;
}) {
  const counts = state.counts[storyId] ?? {};
  const mine = state.mine[storyId];
  const who = state.who[storyId] ?? [];
  return (
    <div className="mt-2 border-t border-charcoal/10 pt-2">
    <div className="flex flex-wrap items-center gap-1.5">
      {REACTIONS.map((r) => {
        const n = counts[r.id] ?? 0;
        const active = mine === r.id;
        return (
          <button
            key={r.id}
            type="button"
            disabled={!canReact}
            onClick={() => onReact(storyId, r.id)}
            aria-label={r.label}
            aria-pressed={active}
            className={`flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs transition-colors ${
              active
                ? "border-red-700 bg-red-700/10 text-red-700"
                : "border-charcoal/20 bg-white/50 text-charcoal/70"
            } ${canReact ? "hover:border-charcoal/50" : "cursor-default opacity-80"}`}
          >
            <span>{r.emoji}</span>
            {n > 0 && <span className="font-semibold">{n}</span>}
          </button>
        );
      })}
    </div>
    {who.length > 0 && (
      <ul className="mt-1.5 space-y-0.5 text-[10px] leading-snug text-charcoal/70">
        {REACTIONS.map((r) => {
          const names = who.filter((x) => x.reaction === r.id).map((x) => nameOf(x.userId).toLocaleUpperCase("tr"));
          if (names.length === 0) return null;
          const shown = names.slice(0, 3).join(", ") + (names.length > 3 ? ` +${names.length - 3} KİŞİ` : "");
          return (
            <li key={r.id}>
              <span>{r.emoji}</span> <span className="font-bold">{shown}</span> {r.verb.toLocaleUpperCase("tr")}
            </li>
          );
        })}
      </ul>
    )}
    </div>
  );
}

function StoryCard({
  story,
  meId,
  reactions,
  onReact,
  nameOf,
}: {
  story: Story;
  meId?: string;
  reactions: ReactionState;
  onReact: (storyId: string, r: ReactionId) => void;
  nameOf: (userId: string) => string;
}) {
  const t = story.team;
  const body = (
    <div className="flex h-full flex-col gap-2">
      <div className="text-[10.5px] font-bold uppercase tracking-wider text-red-700">
        {story.kicker}
      </div>
      {story.headline.length > 0 && (
        <h3 className="font-serif text-lg font-bold leading-snug text-charcoal">
          <Headline parts={story.headline} />
        </h3>
      )}
      {story.quote && t && <PressConference team={t} />}
      {(t || story.bigNumber) && !story.quote && (
        <div className="flex items-center gap-3">
          {t && <TeamEmblem emblem={t.emblem} color1={t.color1} color2={t.color2} size={34} />}
          {t && <span className="min-w-0 break-words text-sm font-semibold text-charcoal">{t.name}</span>}
          {story.bigNumber && (
            <div className="ml-auto flex-none text-right font-serif text-3xl font-bold leading-none text-charcoal">
              {story.bigNumber}
              {story.bigLabel && (
                <small className="mt-1 block font-sans text-[10px] font-medium text-charcoal/60">
                  {story.bigLabel}
                </small>
              )}
            </div>
          )}
        </div>
      )}
      {story.deck && <p className="text-xs leading-relaxed text-charcoal/75">{story.deck}</p>}
      {story.quote && (
        <p className="px-2 py-1 text-center font-serif text-lg italic leading-snug text-charcoal sm:text-xl">
          “<Headline parts={story.quote} />”
        </p>
      )}
      {story.race && (
        <div className="flex flex-col gap-2">
          {story.race.map((r, i) => (
            <div key={r.team.userId} className="flex items-center gap-2 text-xs">
              <span className="w-28 flex-none truncate text-charcoal/70">
                {i + 1}. {r.team.name}
              </span>
              <div className="h-2 flex-1 overflow-hidden rounded bg-charcoal/15">
                <i className={`block h-full ${i === 1 ? "bg-red-700" : "bg-charcoal"}`} style={{ width: `${r.pct}%` }} />
              </div>
              <b className="w-10 flex-none text-right font-serif">{r.points}</b>
            </div>
          ))}
        </div>
      )}
      {story.rows && (
        <table className="w-full text-[12.5px]">
          <tbody>
            {story.rows.map((r) => (
              <tr key={r.label} className="border-b border-charcoal/10 last:border-0">
                <td className="w-2/5 py-1.5 pr-2 text-charcoal/65">{r.label}</td>
                <td className="py-1.5">
                  <Link
                    href={r.team.userId === meId ? "/kadro" : `/takim/${r.team.userId}`}
                    className="flex items-center gap-2"
                  >
                    <TeamEmblem emblem={r.team.emblem} color1={r.team.color1} color2={r.team.color2} size={22} />
                    <span className="truncate">{r.team.name}</span>
                  </Link>
                </td>
                <td className="whitespace-nowrap py-1.5 text-right font-serif font-bold">{r.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {story.table && (
        <table className="w-full text-[12px]">
          <thead>
            <tr className="text-[10.5px] font-semibold text-charcoal/60">
              {story.table.head.map((h, i) => (
                <th key={h} className={`py-1 ${i === 0 ? "text-left" : "text-center"}`}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {story.table.rows.map((row, ri) => (
              <tr key={ri} className="border-b border-charcoal/10 last:border-0">
                {row.map((c, i) => (
                  <td
                    key={i}
                    className={`py-1.5 ${i === 0 ? "pr-2" : "text-center font-serif font-bold"} ${
                      i === row.length - 1 && c === "3" ? "text-red-700" : ""
                    }`}
                  >
                    {c}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {story.fbars && (
        <div className="flex flex-col gap-2">
          {story.fbars.map((b) => (
            <div key={b.label} className="flex items-center gap-2 text-xs">
              <span className="w-12 flex-none font-serif font-bold">{b.label}</span>
              <div className="h-2 flex-1 overflow-hidden rounded bg-charcoal/15">
                <i className={`block h-full ${b.hot ? "bg-red-700" : "bg-charcoal"}`} style={{ width: `${b.pct}%` }} />
              </div>
              <b className="w-24 flex-none text-right font-serif text-[12px]">{b.right}</b>
            </div>
          ))}
        </div>
      )}
      {story.matrix && (
        <div className="-mx-1 overflow-x-auto">
          <table className="w-full min-w-[420px] text-xs">
            <thead>
              <tr className="text-[10.5px] font-semibold text-charcoal/60">
                <th className="py-1 text-left">Takım</th>
                {story.matrix.cols.map((c) => (
                  <th key={c} className="py-1 text-center">{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {story.matrix.rows.map((r) => (
                <tr key={r.team.userId} className="border-b border-charcoal/10 last:border-0">
                  <td className="py-1.5 pr-2">
                    <Link
                      href={r.team.userId === meId ? "/kadro" : `/takim/${r.team.userId}`}
                      className="flex items-center gap-2"
                    >
                      <TeamEmblem emblem={r.team.emblem} color1={r.team.color1} color2={r.team.color2} size={20} />
                      <span className="truncate">{r.team.name}</span>
                    </Link>
                  </td>
                  {r.cells.map((n, i) => (
                    <td
                      key={i}
                      className={`py-1.5 text-center font-serif font-bold ${
                        i === r.hiIdx ? "bg-red-700/10 text-red-700" : n === 0 ? "text-charcoal/25" : ""
                      }`}
                    >
                      {n === 0 ? "–" : n}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {story.bars && (
        <div className="flex flex-col gap-2">
          {story.bars.map((b) => (
            <div key={b.label} className="flex items-center gap-2 text-xs">
              <span className="w-32 flex-none truncate">{b.label}</span>
              <div className="h-1.5 flex-1 overflow-hidden rounded bg-charcoal/15">
                <i className="block h-full bg-charcoal" style={{ width: `${b.pct}%` }} />
              </div>
              <b className="w-9 flex-none text-right">%{b.pct}</b>
            </div>
          ))}
        </div>
      )}
      {story.after && (
        <p className="mt-auto border-t border-charcoal/15 pt-2 text-[11px] text-charcoal/60">
          {story.after}
        </p>
      )}
    </div>
  );
  const cls = `flex flex-col rounded-sm border border-charcoal/20 bg-white/60 p-3 ${story.full ? "sm:col-span-2" : ""}`;
  return (
    <div className={cls}>
      <div className="flex-1">
        {t ? (
          <Link href={t.userId === meId ? "/kadro" : `/takim/${t.userId}`} className="block h-full">
            {body}
          </Link>
        ) : (
          body
        )}
      </div>
      <ReactionBar storyId={story.id} state={reactions} canReact={!!meId} onReact={onReact} nameOf={nameOf} />
    </div>
  );
}

export default function LigGazetesiPage() {
  const { session } = useSession();
  const [data, setData] = useState<GazeteData | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [reactions, setReactions] = useState<ReactionState>({ counts: {}, mine: {}, who: {} });
  const [reactionError, setReactionError] = useState<string | null>(null);

  useEffect(() => {
    loadGazeteData().then((d) => {
      setData(d);
      if (d.weeks.length > 0) setSelected(d.weeks[d.weeks.length - 1].weekNumber);
    });
  }, []);

  const issue = useMemo(
    () => (data && selected !== null ? buildIssue(data, selected) : null),
    [data, selected]
  );

  const meId = session?.user.id;
  const nameOf = (userId: string) => data?.teams.get(userId)?.name ?? "Bir takım";

  // Seçili sayının tepkilerini yükle.
  useEffect(() => {
    if (selected === null) return;
    let cancelled = false;
    fetchReactions(selected, meId).then((r) => {
      if (!cancelled) setReactions(r);
    });
    return () => {
      cancelled = true;
    };
  }, [selected, meId]);

  async function handleReact(storyId: string, r: ReactionId) {
    if (!meId || selected === null) return;
    const prev = reactions;
    const current = prev.mine[storyId];
    const next: ReactionState = { counts: { ...prev.counts }, mine: { ...prev.mine }, who: { ...prev.who } };
    const c = { ...(next.counts[storyId] ?? {}) };
    if (current) c[current] = Math.max(0, (c[current] ?? 1) - 1);
    if (current === r) {
      delete next.mine[storyId];
    } else {
      c[r] = (c[r] ?? 0) + 1;
      next.mine[storyId] = r;
    }
    next.counts[storyId] = c;
    next.who[storyId] = [
      ...(prev.who[storyId] ?? []).filter((x) => x.userId !== meId),
      ...(current === r ? [] : [{ userId: meId, reaction: r }]),
    ];
    setReactions(next); // anında göster, hata olursa geri al
    setReactionError(null);
    const err = await setReaction(meId, selected, storyId, current === r ? null : r);
    if (err) {
      setReactions(prev);
      setReactionError("Tepki kaydedilemedi, tekrar dene.");
    }
  }

  return (
    <>
      <AppHeader />
      <main className="mx-auto max-w-3xl px-3 py-4 sm:px-6 sm:py-6">
        <div className="rounded-xl bg-[#f3ecd9] p-4 text-charcoal sm:p-6">
          <div className="border-b-4 border-double border-charcoal pb-2 text-center">
            <div className="font-serif text-3xl font-black uppercase tracking-wide sm:text-4xl">
              Lig Gazetesi
            </div>
            <div className="mt-1 flex items-center justify-between text-[11px] text-charcoal/70">
              <span>4 Büyükler Fantasy</span>
              <span>{issue ? `Sayı: ${issue.weekNumber}` : ""}</span>
              <span>{issue?.weekName ?? ""}</span>
            </div>
          </div>

          {!data && <p className="py-10 text-center text-sm text-charcoal/60">Gazete basılıyor…</p>}

          {data && data.weeks.length === 0 && (
            <p className="py-10 text-center text-sm text-charcoal/60">
              İlk sayı, ilk hafta tamamlandığında çıkacak.
            </p>
          )}

          {data && data.weeks.length > 0 && (
            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-charcoal/60">Arşiv</span>
              {[...data.weeks].reverse().map((w) => (
                <button
                  key={w.id}
                  onClick={() => setSelected(w.weekNumber)}
                  className={`rounded-full border px-3 py-1 text-xs ${
                    selected === w.weekNumber
                      ? "border-charcoal bg-charcoal text-[#f3ecd9]"
                      : "border-charcoal/30 bg-white/50"
                  }`}
                >
                  {w.weekNumber}. sayı
                </button>
              ))}
            </div>
          )}

          {issue?.hero && (
            <div className="mt-4 border-b-2 border-charcoal pb-4">
              <div className="text-[11px] font-bold uppercase tracking-wider text-red-700">
                {issue.hero.kicker}
              </div>
              <h2 className="mt-1 font-serif text-2xl font-black leading-tight sm:text-3xl">
                <Headline parts={issue.hero.headline} />
              </h2>
              <div className="mt-3 flex items-center gap-3">
                {issue.hero.team && (
                  <TeamEmblem
                    emblem={issue.hero.team.emblem}
                    color1={issue.hero.team.color1}
                    color2={issue.hero.team.color2}
                    size={48}
                  />
                )}
                {issue.hero.deck && <p className="text-sm text-charcoal/75">{issue.hero.deck}</p>}
                {issue.hero.bigNumber && (
                  <div className="ml-auto flex-none text-right font-serif text-4xl font-black leading-none">
                    {issue.hero.bigNumber}
                    <small className="mt-1 block font-sans text-[10px] font-medium text-charcoal/60">
                      {issue.hero.bigLabel}
                    </small>
                  </div>
                )}
              </div>
              <ReactionBar storyId={issue.hero.id} state={reactions} canReact={!!meId} onReact={handleReact} nameOf={nameOf} />
            </div>
          )}

          {reactionError && <p className="mt-2 text-center text-xs text-red-700">{reactionError}</p>}
          {data && !meId && data.weeks.length > 0 && (
            <p className="mt-2 text-center text-[11px] text-charcoal/60">Habere tepki vermek için giriş yap.</p>
          )}

          {issue?.sections.map((sec) => (
            <section key={sec.title} className="mt-5">
              <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider">
                {sec.title}
                <span className="h-px flex-1 bg-charcoal/30" />
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {sec.stories.map((s) => (
                  <StoryCard key={s.id} story={s} meId={meId} reactions={reactions} onReact={handleReact} nameOf={nameOf} />
                ))}
              </div>
            </section>
          ))}
        </div>
      </main>
    </>
  );
}
