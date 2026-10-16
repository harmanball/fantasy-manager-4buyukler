"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";
import { TeamEmblem } from "@/components/TeamEmblem";
import { useSession } from "@/lib/useSession";
import { loadGazeteData, buildIssue, GazeteData, Part, Story } from "@/lib/gazete";

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

function StoryCard({ story, meId }: { story: Story; meId?: string }) {
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
      {(t || story.bigNumber) && (
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
        <p className="px-2 py-1 text-center font-serif text-xl italic leading-snug text-charcoal">
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
  const cls = `rounded-sm border border-charcoal/20 bg-white/60 p-3 ${story.full ? "sm:col-span-2" : ""}`;
  if (t) {
    return (
      <Link href={t.userId === meId ? "/kadro" : `/takim/${t.userId}`} className={`${cls} block`}>
        {body}
      </Link>
    );
  }
  return <div className={cls}>{body}</div>;
}

export default function LigGazetesiPage() {
  const { session } = useSession();
  const [data, setData] = useState<GazeteData | null>(null);
  const [selected, setSelected] = useState<number | null>(null);

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
            </div>
          )}

          {issue?.sections.map((sec) => (
            <section key={sec.title} className="mt-5">
              <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider">
                {sec.title}
                <span className="h-px flex-1 bg-charcoal/30" />
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {sec.stories.map((s) => (
                  <StoryCard key={s.id} story={s} meId={session?.user.id} />
                ))}
              </div>
            </section>
          ))}
        </div>
      </main>
    </>
  );
}
