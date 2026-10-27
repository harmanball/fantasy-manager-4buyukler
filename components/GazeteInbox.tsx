"use client";

import { GAZETE_SCROLL, Notif, markSeen, useGazeteNotifications } from "@/lib/gazeteBildirim";

const ICON: Record<Notif["kind"], string> = { challenge: "⚔️", question: "🎤", answer: "💬" };

// Gazete sayfasının üstünde "Sana özel" kutusu: okunmamışlar + cevap bekleyen sorular.
export function GazeteInbox({ meId }: { meId: string }) {
  const { items } = useGazeteNotifications(meId);
  const unread = items.filter((n) => n.unread);
  const shown = items.filter((n) => n.unread || n.pending);
  if (shown.length === 0) return null;

  function go(n: Notif) {
    if (n.unread) markSeen(meId, [n]);
    window.dispatchEvent(new CustomEvent(GAZETE_SCROLL, { detail: n.target }));
  }

  return (
    <section className="mt-4 rounded-md border-2 border-red-700 bg-red-50 p-3">
      <div className="mb-2 flex items-center gap-2">
        <h2 className="font-serif text-base font-bold">Sana özel</h2>
        {unread.length > 0 && (
          <span className="rounded bg-red-700 px-1.5 py-0.5 text-[10px] font-extrabold tracking-wide text-white">
            {unread.length} YENİ
          </span>
        )}
        {unread.length > 0 && (
          <button onClick={() => markSeen(meId, unread)} className="ml-auto text-[11px] text-charcoal/60 underline">
            Gördüm
          </button>
        )}
      </div>
      <div className="flex flex-col gap-2">
        {shown.map((n) => (
          <button
            key={n.key}
            onClick={() => go(n)}
            className="flex items-start gap-2.5 rounded-lg border border-charcoal/15 bg-white p-2.5 text-left"
          >
            <span className="text-xl leading-none" aria-hidden="true">
              {ICON[n.kind]}
            </span>
            <span className="min-w-0 flex-1 text-xs">
              <b className="block text-[13px]">{n.title}</b>
              <span className="text-charcoal/70">{n.sub}</span>
              {n.pending && <span className="mt-1.5 block w-fit rounded bg-charcoal px-2.5 py-1 text-[11px] font-bold text-white">Cevapla</span>}
              {n.kind === "challenge" && <span className="mt-1 block text-charcoal/60">Hafta sonunda sonuç gazetede açıklanacak.</span>}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
