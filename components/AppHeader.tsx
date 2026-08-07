"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/useSession";
import { supabase } from "@/lib/supabase";
import { shareText, getSiteUrl } from "@/lib/share";
import { Icon, IconName } from "./Icon";

// Puanlarım ve Lig Sıralaması hem üst barda hem hamburger menüsünde yer alır.
const NAV_ITEMS: { href: string; label: string; icon: IconName }[] = [
  { href: "/", label: "Ana sayfa", icon: "home" },
  { href: "/kadro", label: "Kadro", icon: "shirt" },
  { href: "/puanlarim", label: "Puanlarım", icon: "chart" },
  { href: "/siralama", label: "Lig Sıralaması", icon: "trophy" },
  { href: "/futbolcu-puanlari", label: "Futbolcu Puanları", icon: "users" },
  { href: "/haftanin-takimi", label: "Haftanın Takımı", icon: "star" },
  { href: "/profil", label: "Profil", icon: "user" },
];

export function AppHeader() {
  const { session } = useSession();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [squadName, setSquadName] = useState<string | null>(null);

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
          <span className="hidden font-display text-base font-semibold sm:inline sm:text-xl">
            Fantasy Manager: 4 Büyükler
          </span>
        </div>

        {/* Üst barın tam ortasında sabit iki link */}
        <div className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center gap-2 whitespace-nowrap sm:gap-4">
          <Link
            href="/puanlarim"
            className="text-[11px] font-medium text-foreground/70 underline underline-offset-2 hover:text-foreground sm:text-sm"
          >
            Puanlarım
          </Link>
          <Link
            href="/siralama"
            className="text-[11px] font-medium text-foreground/70 underline underline-offset-2 hover:text-foreground sm:text-sm"
          >
            Lig Sıralaması
          </Link>
        </div>

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
      </header>

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
    </div>
  );
}
