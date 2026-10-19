"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

const TICKER =
  "Haftanın haberi  •  Kim kimi seçti?  •  Kahin kartı  •  Rekorlar tablosu  •  Zirve yarışı  •  Kötü hafta kimde?  •  ";

// Lig Gazetesi reklam bannerı. "N. SAYI" yazısı, en son biten haftadan otomatik gelir.
// Şerit hızı: .gz-tick'in animation süresi (şu an 8s — büyütürsen yavaşlar).
export function GazeteBanner() {
  const [issue, setIssue] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    supabase
      .from("gameweeks")
      .select("week_number")
      .eq("status", "finished")
      .order("week_number", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled && data) setIssue(data.week_number as number);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (issue === null) return null;

  return (
    <Link
      href="/lig-gazetesi"
      aria-label={`Lig Gazetesi ${issue}. sayı çıktı, oku`}
      className="gz-banner relative block overflow-hidden rounded-xl text-white shadow-md"
    >
      <style>{`
        .gz-banner{height:116px;font-family:Georgia,serif}
        .gz-bg{position:absolute;inset:0;background:linear-gradient(110deg,#b91c1c,#ea580c,#d97706,#be185d,#b91c1c);background-size:300% 100%;animation:gz-bg 9s linear infinite}
        .gz-paper{position:absolute;left:14px;top:14px;width:54px;height:68px;background:#f6efd8;border-radius:4px;box-shadow:0 5px 10px #0006;padding:6px;color:#222;transform-origin:50% 100%;animation:gz-sway 2.4s ease-in-out infinite}
        .gz-paper b{display:block;font:900 8px Georgia,serif;letter-spacing:.5px;border-bottom:2px solid #b91c1c;padding-bottom:1px}
        .gz-paper u{display:block;height:15px;background:#b91c1c;margin-top:3px;border-radius:2px}
        .gz-paper i{display:block;height:3px;background:#555;opacity:.7;margin:3px 0;border-radius:2px}
        .gz-txt{position:absolute;left:84px;right:84px;top:10px}
        .gz-sub{font:700 9px system-ui,sans-serif;letter-spacing:.18em;opacity:.9}
        .gz-h{margin:1px 0 0;font:900 clamp(20px,6.4vw,30px)/1 Georgia,serif;text-shadow:0 2px 0 #7f1d1d;white-space:nowrap}
        .gz-badge{display:inline-block;margin-top:7px;background:#facc15;color:#7f1d1d;font:800 11px system-ui,sans-serif;padding:3px 9px;border-radius:99px;letter-spacing:.03em;transform-origin:left center;animation:gz-pulse 1.4s ease-in-out infinite;white-space:nowrap}
        .gz-cta{position:absolute;right:12px;top:34px;background:#fff;color:#b91c1c;font:800 12px system-ui,sans-serif;padding:8px 11px;border-radius:9px;box-shadow:0 3px 0 #7f1d1d;animation:gz-nudge 1.2s ease-in-out infinite}
        .gz-star{position:absolute;color:#fde68a;font-size:14px;animation:gz-twinkle 1.6s ease-in-out infinite}
        .gz-bar{position:absolute;left:0;right:0;bottom:0;height:24px;background:rgba(0,0,0,.6);overflow:hidden;font:600 11px system-ui,sans-serif;white-space:nowrap}
        .gz-tick{position:absolute;top:5px;left:0;display:flex;animation:gz-tick 8s linear infinite;will-change:transform}
        .gz-tick span{white-space:pre;flex:none}
        @keyframes gz-bg{from{background-position:0 0}to{background-position:300% 0}}
        @keyframes gz-sway{0%,100%{transform:rotate(-8deg) translateY(0)}50%{transform:rotate(3deg) translateY(-3px)}}
        @keyframes gz-pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.07)}}
        @keyframes gz-nudge{0%,100%{transform:translateX(0)}50%{transform:translateX(-5px)}}
        @keyframes gz-twinkle{0%,100%{opacity:0;transform:scale(.5) rotate(0)}50%{opacity:1;transform:scale(1.2) rotate(90deg)}}
        @keyframes gz-tick{from{transform:translateX(0)}to{transform:translateX(-33.3333%)}}
        @media (prefers-reduced-motion:reduce){.gz-bg,.gz-paper,.gz-badge,.gz-cta,.gz-star,.gz-tick{animation:none}}
        @media (max-width:380px){.gz-cta{display:none}.gz-txt{right:12px}}
      `}</style>
      <div className="gz-bg" />
      <div className="gz-paper" aria-hidden="true">
        <b>GAZETE</b>
        <u />
        <i />
        <i />
        <i style={{ width: "60%" }} />
      </div>
      <div className="gz-txt">
        <div className="gz-sub">4 BÜYÜKLER FANTASY</div>
        <h2 className="gz-h">LİG GAZETESİ</h2>
        <div className="gz-badge">🔴 YENİ SAYI ÇIKTI · {issue}. SAYI</div>
      </div>
      <div className="gz-cta">Oku ›</div>
      <span className="gz-star" style={{ right: 96, top: 8 }} aria-hidden="true">✦</span>
      <span className="gz-star" style={{ right: 140, top: 52, animationDelay: ".5s" }} aria-hidden="true">✦</span>
      <span className="gz-star" style={{ right: 60, top: 70, animationDelay: "1s" }} aria-hidden="true">✦</span>
      <div className="gz-bar" aria-hidden="true">
        <div className="gz-tick">
          <span>{TICKER}</span>
          <span>{TICKER}</span>
          <span>{TICKER}</span>
        </div>
      </div>
    </Link>
  );
}
