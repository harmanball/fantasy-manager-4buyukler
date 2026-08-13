"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/useSession";
import { supabase } from "@/lib/supabase";
import { shareText, getSiteUrl } from "@/lib/share";
import { useInstallPrompt } from "@/lib/useInstallPrompt";
import { Icon, IconName } from "./Icon";

// Puanlarım ve Lig Sıralaması hem üst barda hem hamburger menüsünde yer alır.
const NAV_ITEMS: { href: string; label: string; icon: IconName }[] = [
  { href: "/", label: "Ana sayfa", icon: "home" },
  { href: "/nasil-oynanir", label: "Nasıl Oynanır?", icon: "info" },
  { href: "/kadro", label: "Kadro", icon: "shirt" },
  { href: "/puanlarim", label: "Puanlarım", icon: "chart" },
  { href: "/siralama", label: "Lig Sıralaması", icon: "trophy" },
  { href: "/futbolcu-puanlari", label: "Futbolcu Puanları", icon: "users" },
  { href: "/haftanin-takimi", label: "Haftanın Takımı", icon: "star" },
  { href: "/profil", label: "Profil", icon: "user" },
];

function PitchLogo() {
  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 100 100"
      className="shrink-0 rounded-md"
      aria-hidden="true"
    >
      <rect x="4" y="4" width="92" height="92" rx="10" fill="#0F3D2E" />
      <rect x="12" y="12" width="76" height="76" fill="none" stroke="#F5F1E8" strokeWidth="4" />
      <line x1="12" y1="50" x2="88" y2="50" stroke="#F5F1E8" strokeWidth="4" />
      <circle cx="50" cy="50" r="14" fill="none" stroke="#F5F1E8" strokeWidth="4" />
      <circle cx="50" cy="50" r="3" fill="#F5F1E8" />
      <rect x="30" y="12" width="40" height="14" fill="none" stroke="#F5F1E8" strokeWidth="4" />
      <rect x="30" y="74" width="40" height="14" fill="none" stroke="#F5F1E8" strokeWidth="4" />
    </svg>
  );
}

function InstallIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 3v12m0 0l-4-4m4 4l4-4M5 17v2a2 2 0 002 2h10a2 2 0 002-2v-2"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function AppHeader() {
  const { session } = useSession();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [squadName, setSquadName] = useState<string | null>(null);
  const [iosInstructionsOpen, setIosInstructionsOpen] = useState(false);
  const { canInstall, promptInstall } = useInstallPrompt();

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!session) {
        setSquadName(null);
        return;
      }
      const { data } = await supabase
        .from("profiles")
        .select("squad_name, username")
        .eq("id", session.user.id)
        .maybeSingle();
      if (cancelled) return;
      if (data) setSquadName(data.squad_name || data.username);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [session]);

  async function handleLogout() {
    await supabase.auth.signOut();
    setMenuOpen(false);
    router.push("/giris");
  }

  function handleInvite() {
    setMenuOpen(false);
    shareText(
      `Fantasy Manager: 4 Büyükler'de kadromu kurdum, gel sen de katıl! ${getSiteUrl()}`
    );
  }

  async function handleInstallClick() {
    setMenuOpen(false);
    const result = await promptInstall();
    if (result === "ios") setIosInstructionsOpen(true);
  }

  return (
    <div className="sticky top-0 z-40">
      <header className="relative flex items-center justify-between border-b border-charcoal/10 bg-background px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMenuOpen((o) => !o)}
            aria-label="Menü"
            aria-expanded={menuOpen}
            className="flex h-11 w-11 items-center justify-center rounded-md text-charcoal hover:bg-charcoal/5"
          >
            <svg width="26" height="26" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path
                d="M2 5h16M2 10h16M2 15h16"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
            </svg>
          </button>
          <Link href="/" className="flex items-center gap-2">
            <PitchLogo />
            <span className="flex flex-col font-display font-semibold leading-tight">
              <span className="text-[11px] sm:text-lg">Fantasy Manager:</span>
              <span className="text-[11px] sm:text-lg">4 Büyükler</span>
            </span>
          </Link>
        </div>

        <div className="flex items-center gap-2">
          {canInstall && (
            <button
              onClick={handleInstallClick}
              aria-label="Uygulamayı ana ekrana ekle"
              className="flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full bg-gold px-3 py-2 text-[11px] font-semibold text-charcoal sm:text-sm"
            >
              <InstallIcon />
              Yükle
            </button>
          )}

          {session ? (
            <Link
              href="/kadro"
              className="whitespace-nowrap rounded-full bg-charcoal px-3 py-2 text-[11px] font-medium text-ivory sm:px-4 sm:text-sm"
            >
              {squadName ? `${squadName} Kadro` : "Kadro"}
            </Link>
          ) : (
            <Link
              href="/giris"
              className="whitespace-nowrap rounded-full bg-charcoal px-3 py-2 text-[11px] font-medium text-ivory sm:px-4 sm:text-sm"
            >
              Giriş yap
            </Link>
          )}
        </div>
      </header>

      <div className="flex items-center justify-center gap-4 border-b border-charcoal/10 bg-background py-1.5">
        <Link
          href="/puanlarim"
          className="text-xs font-medium text-foreground/70 underline underline-offset-2 hover:text-foreground"
        >
          Puanlarım
        </Link>
        <Link
          href="/siralama"
          className="text-xs font-medium text-foreground/70 underline underline-offset-2 hover:text-foreground"
        >
          Lig Sıralaması
        </Link>
      </div>

      {menuOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-charcoal/20"
            onClick={() => setMenuOpen(false)}
          />
          <nav className="absolute left-0 top-full z-50 w-56 overflow-hidden rounded-b-xl border border-t-0 border-charcoal/10 bg-white shadow-lg">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-charcoal/5"
              >
                <Icon name={item.icon} size={16} className="shrink-0 text-pitch" />
                {item.label}
              </Link>
            ))}
            {canInstall && (
              <button
                onClick={handleInstallClick}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-foreground hover:bg-charcoal/5"
              >
                <InstallIcon />
                Ana ekrana ekle
              </button>
            )}
            <button
              onClick={handleInvite}
              className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-gold hover:bg-charcoal/5"
            >
              <Icon name="share" size={16} className="shrink-0" />
              Arkadaşlarını davet et
            </button>
            {session && (
              <button
                onClick={handleLogout}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-red-600 hover:bg-charcoal/5"
              >
                <Icon name="logout" size={16} className="shrink-0" />
                Çıkış
              </button>
            )}
          </nav>
        </>
      )}

      {iosInstructionsOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-charcoal/50"
          onClick={() => setIosInstructionsOpen(false)}
        >
          <div
            className="mx-4 max-w-xs rounded-2xl bg-background px-6 py-6 text-center shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="font-display text-base font-semibold">
              Ana ekrana ekle
            </p>
            <ol className="mt-3 flex flex-col gap-2 text-left text-sm text-foreground/70">
              <li>
                1. Alttaki paylaşım simgesine{" "}
                <span aria-hidden="true">⬆️</span> dokun
              </li>
              <li>2. &quot;Ana Ekrana Ekle&quot; seçeneğini seç</li>
              <li>3. Sağ üstteki &quot;Ekle&quot;ye dokun</li>
            </ol>
            <button
              onClick={() => setIosInstructionsOpen(false)}
              className="mt-5 w-full rounded-lg bg-pitch py-2.5 text-sm font-medium text-ivory"
            >
              Anladım
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
