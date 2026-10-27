"use client";

import { useEffect, useState } from "react";
import { TeamEmblem } from "@/components/TeamEmblem";
import type { GazeteTeam } from "@/lib/gazete";
import {
  ArenaData,
  MAX_ANSWER_LENGTH,
  MAX_QUESTIONS_PER_WEEK,
  MAX_QUESTION_LENGTH,
  answerQuestion,
  askQuestion,
  clearChallenge,
  deleteQuestion,
  fetchArena,
  setChallenge,
} from "@/lib/gazeteArena";

function TeamChip({
  team,
  on,
  onClick,
  disabled,
}: {
  team: GazeteTeam;
  on: boolean;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`flex items-center gap-2 rounded-full border-[1.5px] bg-white py-1 pl-1.5 pr-3 text-[13px] transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
        on ? "border-red-700 bg-red-700/10 font-bold" : "border-charcoal/25 hover:border-charcoal"
      }`}
    >
      <TeamEmblem emblem={team.emblem} color1={team.color1} color2={team.color2} size={26} />
      {team.name}
    </button>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-2 mt-6 flex items-center gap-2 text-xs font-bold uppercase tracking-wider">
      {children}
      <span className="h-px flex-1 bg-charcoal/30" />
    </div>
  );
}

const cardCls = "mb-3 flex flex-col gap-2.5 rounded-sm border border-charcoal/20 bg-white/60 p-3";
const kickerCls = "text-[10.5px] font-bold uppercase tracking-wider text-red-700";

export function GazeteArena({ meId, teams }: { meId: string; teams: GazeteTeam[] }) {
  const [arena, setArena] = useState<ArenaData | null>(null);
  const [rival, setRival] = useState<string | null>(null);
  const [askTeam, setAskTeam] = useState<string | null>(null);
  const [qText, setQText] = useState("");
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const byId = new Map(teams.map((t) => [t.userId, t]));
  const others = teams.filter((t) => t.userId !== meId);
  const nameOf = (id: string) => byId.get(id)?.name ?? "Bir takım";

  async function reload() {
    const a = await fetchArena(meId);
    setArena(a);
    const mine = a.challenges.find((c) => c.challengerId === meId);
    setRival(mine ? mine.rivalId : null);
  }

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meId]);

  async function run(fn: () => Promise<string | null>, ok: string) {
    setBusy(true);
    setMsg(null);
    const err = await fn();
    setBusy(false);
    if (err) setMsg(err);
    else {
      setMsg(ok);
      await reload();
    }
  }

  if (!arena || !arena.week) return null;
  const week = arena.week;
  const locked = !arena.windowOpen;
  const myChallenge = arena.challenges.find((c) => c.challengerId === meId);
  const published = arena.questions.filter((q) => q.answer && q.gameweekId === week.id);
  const toMe = arena.questions.filter((q) => q.targetId === meId && !q.answer);
  const mineWaiting = arena.questions.filter((q) => q.askerId === meId && !q.answer);
  const leftToAsk = Math.max(0, MAX_QUESTIONS_PER_WEEK - arena.askedThisWeek);

  return (
    <div>
      {/* ───── MEYDAN OKUMA ───── */}
      <div id="arena-meydan" className="scroll-mt-28" />
      <SectionTitle>Meydan Okuma</SectionTitle>
      <div className="mb-3 flex items-center gap-3.5 rounded-sm bg-gradient-to-br from-[#3a0d12] to-[#7a1a24] p-4 text-[#f6e7b4]">
        <span className="text-4xl">⚔️</span>
        <div>
          <div className="font-serif text-xl font-bold uppercase tracking-wide text-[#ffe9a6]">Meydan Okuma</div>
          <p className="mt-0.5 text-xs text-[#f1cfd2]">
            Gelecek hafta için bir rakip seç. Hafta sonunda daha çok puan alan kazanır, sonuç gazetede.
          </p>
        </div>
      </div>

      <div className={cardCls}>
        <div className={kickerCls}>Gelecek hafta · {week.weekNumber}. hafta</div>
        <h3 className="font-serif text-lg font-bold leading-snug">
          Rakibini seç, <span className="text-red-700">meydan oku!</span>
        </h3>
        <p className="text-xs leading-relaxed text-charcoal/75">
          {week.weekNumber}. hafta sonunda daha çok puan alan kazanır. Sonuç, {week.weekNumber}. sayıda gazetede haber olur.
          {locked
            ? " Haftanın ilk maçı başladı, meydan okumalar kilitlendi."
            : " Haftanın ilk maçına kadar rakibini değiştirebilir ya da geri çekebilirsin."}
        </p>
        <div className="flex flex-wrap gap-2">
          {others.map((t) => (
            <TeamChip key={t.userId} team={t} on={rival === t.userId} disabled={locked || busy} onClick={() => setRival(t.userId)} />
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={locked || busy || !rival || rival === myChallenge?.rivalId}
            onClick={() => rival && run(() => setChallenge(meId, week.id, rival), "Meydan okuma kaydedildi.")}
            className="rounded-md bg-red-700 px-4 py-2 text-[13px] font-bold text-white disabled:cursor-not-allowed disabled:opacity-35"
          >
            {myChallenge ? "Rakibi değiştir" : "Meydan oku"}
          </button>
          {myChallenge && !locked && (
            <button
              type="button"
              disabled={busy}
              onClick={() => run(() => clearChallenge(meId, week.id), "Meydan okuma geri çekildi.")}
              className="text-xs text-charcoal/60 underline"
            >
              Geri çek
            </button>
          )}
        </div>
        {myChallenge && (
          <div className="flex flex-wrap items-center gap-2 rounded border border-charcoal/15 bg-white px-2.5 py-2 text-[13px]">
            <b>Sen</b>
            <span className="font-serif font-black text-red-700">⚔</span>
            <b>{nameOf(myChallenge.rivalId)}</b>
            <span className="ml-auto rounded-sm bg-green-700 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
              Senin meydan okuman
            </span>
          </div>
        )}
        {msg && <p className="text-xs text-charcoal/70">{msg}</p>}
      </div>

      {arena.challenges.length > 0 && (
        <div className={cardCls}>
          <div className={kickerCls}>{week.weekNumber}. hafta ilanları</div>
          {arena.challenges.map((c) => (
            <div key={c.challengerId} className="flex flex-wrap items-center gap-2 rounded border border-charcoal/15 bg-white px-2.5 py-2 text-[13px]">
              <b>{c.challengerId === meId ? "Sen" : nameOf(c.challengerId)}</b>
              <span className="font-serif font-black text-red-700">⚔</span>
              <b>{c.rivalId === meId ? "Sen" : nameOf(c.rivalId)}</b>
              {c.rivalId === meId && (
                <span className="ml-auto rounded-sm bg-red-700 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                  Sana meydan okundu!
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ───── BASIN TOPLANTISI ───── */}
      <div id="arena-basin" className="scroll-mt-28" />
      <SectionTitle>Basın Toplantısı Köşesi</SectionTitle>
      <div className="mb-3 flex items-center gap-3.5 rounded-sm bg-gradient-to-br from-[#0d1b3a] to-[#1b2f66] p-4 text-[#f6e7b4]">
        <span className="text-4xl">🎙️</span>
        <div>
          <div className="font-serif text-xl font-bold uppercase tracking-wide text-[#ffe9a6]">Basın Toplantısı</div>
          <p className="mt-0.5 text-xs text-[#cdd6ee]">
            Bir takım seç, sorunu sor. Takım sahibi cevaplarsa soru–cevap gazetede yayınlanır.
          </p>
        </div>
      </div>

      <div className={cardCls}>
        <div className={kickerCls}>Soru sor</div>
        <h3 className="font-serif text-lg font-bold leading-snug">
          Hangi takıma <span className="text-red-700">soru</span> soracaksın?
        </h3>
        <div className="flex flex-wrap gap-2">
          {others.map((t) => (
            <TeamChip key={t.userId} team={t} on={askTeam === t.userId} disabled={busy} onClick={() => setAskTeam(t.userId)} />
          ))}
        </div>
        <textarea
          value={qText}
          maxLength={MAX_QUESTION_LENGTH}
          onChange={(e) => setQText(e.target.value)}
          placeholder="Sorunu yaz… (örn. Bu hafta kaptanlığı neden değiştirdin?)"
          className="min-h-[64px] w-full rounded-md border-[1.5px] border-charcoal/25 bg-white px-2.5 py-2 text-[13px] outline-none focus:border-amber-500"
        />
        <div className="-mt-1.5 text-right text-[11px] text-charcoal/55">
          {qText.length}/{MAX_QUESTION_LENGTH}
        </div>
        <button
          type="button"
          disabled={busy || leftToAsk === 0 || !askTeam || qText.trim().length < 6}
          onClick={() =>
            askTeam &&
            run(async () => {
              const err = await askQuestion(meId, askTeam, qText);
              if (!err) setQText("");
              return err;
            }, "Soru gönderildi.")
          }
          className="self-start rounded-md bg-charcoal px-4 py-2 text-[13px] font-bold text-white disabled:cursor-not-allowed disabled:opacity-35"
        >
          Soruyu gönder
        </button>
        <p className="border-t border-charcoal/15 pt-1.5 text-[11px] text-charcoal/60">
          Haftada en fazla {MAX_QUESTIONS_PER_WEEK} soru sorabilirsin (bu hafta kalan: {leftToAsk}). Soru, takım sahibi cevaplayana kadar
          gazetede görünmez; sadece soran ve cevaplayan görür.
        </p>
      </div>

      {toMe.length > 0 && (
        <div className={cardCls}>
          <div className={kickerCls}>Sana gelen {toMe.length === 1 ? "soru" : "sorular"}</div>
          {toMe.map((q) => (
            <div key={q.id} className="flex flex-col gap-2 rounded border-2 border-red-700 bg-red-700/5 p-2.5">
              <div className="text-[13px] leading-relaxed">
                <b className="font-serif">{nameOf(q.askerId)}</b> soruyor: “{q.question}”
              </div>
              <textarea
                value={answers[q.id] ?? ""}
                maxLength={MAX_ANSWER_LENGTH}
                onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
                placeholder="Cevabını yaz…"
                className="min-h-[64px] w-full rounded-md border-[1.5px] border-charcoal/25 bg-white px-2.5 py-2 text-[13px] outline-none focus:border-amber-500"
              />
              <button
                type="button"
                disabled={busy || (answers[q.id] ?? "").trim().length === 0}
                onClick={() => run(() => answerQuestion(q.id, answers[q.id] ?? ""), "Cevabın yayınlandı.")}
                className="self-start rounded-md bg-red-700 px-4 py-2 text-[13px] font-bold text-white disabled:cursor-not-allowed disabled:opacity-35"
              >
                Cevapla ve yayınla
              </button>
            </div>
          ))}
        </div>
      )}

      {(published.length > 0 || mineWaiting.length > 0) && (
        <div className={cardCls}>
          <div className={kickerCls}>Bu haftanın basın toplantısı</div>
          {published.map((q) => (
            <div key={q.id} className="flex flex-col gap-1.5 border-l-[3px] border-charcoal pl-3">
              <div className="text-[13px] leading-relaxed">
                <b className="font-serif">{nameOf(q.askerId)}</b> soruyor → <b className="font-serif">{nameOf(q.targetId)}</b>: “{q.question}”
              </div>
              <div className="rounded bg-amber-500/15 px-2.5 py-2 font-serif text-sm italic leading-relaxed">
                <small className="mb-0.5 block font-sans text-[10.5px] font-bold uppercase not-italic tracking-wide text-amber-600">
                  {nameOf(q.targetId)} cevapladı
                </small>
                “{q.answer}”
              </div>
            </div>
          ))}
          {mineWaiting.map((q) => (
            <div key={q.id} className="flex flex-col gap-1.5 border-l-[3px] border-charcoal/40 pl-3">
              <div className="text-[13px] leading-relaxed">
                <b className="font-serif">Sen</b> soruyorsun → <b className="font-serif">{nameOf(q.targetId)}</b>: “{q.question}”
              </div>
              <div className="flex flex-wrap items-center gap-2 rounded bg-amber-300/40 px-2.5 py-1.5 text-xs">
                <span className="rounded-sm bg-amber-300 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-950">
                  Senin sorun
                </span>
                {nameOf(q.targetId)} henüz cevaplamadı — bunu sadece sen görürsün, cevaplanınca yayınlanır.
                <button type="button" disabled={busy} onClick={() => run(() => deleteQuestion(q.id), "Soru silindi.")} className="ml-auto text-charcoal/60 underline">
                  Sil
                </button>
              </div>
            </div>
          ))}
          <p className="border-t border-charcoal/15 pt-1.5 text-[11px] text-charcoal/60">
            Cevaplanan sorular, o haftanın sayısında “Basın Toplantısı” bölümünde de yayınlanır.
          </p>
        </div>
      )}
    </div>
  );
}
