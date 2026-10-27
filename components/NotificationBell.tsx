"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "@/lib/useSession";
import { GAZETE_SCROLL, Notif, markSeen, useGazeteNotifications } from "@/lib/gazeteBildirim";

const ICON: Record<Notif["kind"], string> = { challenge: "⚔️", question: "🎤", answer: "💬" };

function BellSvg() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M6 8a6 6 0 1112 0c0 4 1.5 5.5 2 6H4c.5-.5 2-2 2-6zM9.5 18a2.5 2.5 0 005 0"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// Üst barda zil: okunmamış sayısı + açılır liste. Tıklayınca ilgili alana gider.
export function NotificationBell() {
  const { session } = useSession();
  const meId = session?.user.id;
  const router = useRouter();
  const pathname = usePathname();
  const { items } = useGazeteNotifications(meId);
  const [open, setOpen] = useState(false);

  if (!meId) return null;
  const unread = items.filter((n) => n.unread);

  async function go(n: Notif) {
    setOpen(false);
    if (n.unread) markSeen(meId!, [n]);
    if (pathname === "/lig-gazetesi") window.dispatchEvent(new CustomEvent(GAZETE_SCROLL, { detail: n.target }));
    else router.push(`/lig-gazetesi#${n.target}`);
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={unread.length > 0 ? `Bildirimler, ${unread.length} yeni` : "Bildirimler"}
        aria-expanded={open}
        className="relative flex h-9 w-9 items-center justify-center rounded-full text-charcoal hover:bg-charcoal/5"
      >
        <BellSvg />
        {unread.length > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold leading-none text-white">
            {unread.length > 9 ? "9+" : unread.length}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="fixed left-3 right-3 top-[60px] z-50 overflow-hidden rounded-xl border border-charcoal/10 bg-white shadow-xl sm:absolute sm:left-auto sm:right-0 sm:top-full sm:mt-2 sm:w-80">
            <div className="flex items-center justify-between border-b border-charcoal/10 px-3 py-2.5 text-sm font-bold">
              Bildirimler
              {unread.length > 0 && (
                <button onClick={() => markSeen(meId, unread)} className="text-[11px] font-medium text-pitch">
                  Tümünü okundu yap
                </button>
              )}
            </div>
            {items.length === 0 ? (
              <p className="px-3 py-6 text-center text-xs text-charcoal/60">Henüz bildirim yok.</p>
            ) : (
              <ul className="max-h-[60vh] overflow-y-auto">
                {items.map((n) => (
                  <li key={n.key}>
                    <button
                      onClick={() => go(n)}
                      className={`flex w-full items-start gap-2.5 border-b border-charcoal/10 px-3 py-2.5 text-left hover:bg-charcoal/5 ${
                        n.unread ? "bg-amber-50" : ""
                      }`}
                    >
                      <span
                        className={`mt-1.5 h-2 w-2 flex-none rounded-full ${n.unread ? "bg-red-600" : "bg-charcoal/20"}`}
                        aria-hidden="true"
                      />
                      <span className="flex-none text-base leading-snug" aria-hidden="true">
                        {ICON[n.kind]}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className={`block text-[13px] leading-snug ${n.unread ? "font-bold" : ""}`}>{n.title}</span>
                        <span className="mt-0.5 block truncate text-[11px] text-charcoal/60">{n.sub}</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}
