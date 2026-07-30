"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/useSession";
import { supabase } from "@/lib/supabase";

const NAV_ITEMS = [
  { href: "/", label: "Ana sayfa" },
  { href: "/kadro", label: "Kadro" },
  { href: "/puanlarim", label: "Puanlarım" },
  { href: "/siralama", label: "Lig Sıralaması" },
  { href: "/futbolcu-puanlari", label: "Futbolcu Puanları" },
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

  return (
    <div className="sticky top-0 z-40">
      <header className="relative flex items-center justify-between border-b border-charcoal/10 bg-background px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMenuOpen((o) => !o)}
            aria-label="Menü"
            aria-expanded={menuOpen}
            className="flex h-9 w-9 items-center justify-center rounded-md text-charcoal hover:bg-charcoal/5"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path
                d="M2 5h16M2 10h16M2 15h16"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
            </svg>
          </button>
          <span className="font-display text-sm font-semibold sm:text-base">
            Fantasy Manager
          </span>
        </div>

        {session ? (
          <Link
            href="/kadro"
            className="rounded-full bg-charcoal px-4 py-2 text-xs font-medium text-ivory sm:text-sm"
          >
            {squadName ?? "Kadro"}
          </Link>
        ) : (
          <Link
            href="/giris"
            className="rounded-full bg-charcoal px-4 py-2 text-xs font-medium text-ivory sm:text-sm"
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
                className="block px-4 py-2.5 text-sm text-foreground hover:bg-charcoal/5"
              >
                {item.label}
              </Link>
            ))}
            {session && (
              <button
                onClick={handleLogout}
                className="block w-full px-4 py-2.5 text-left text-sm text-red-600 hover:bg-charcoal/5"
              >
                Çıkış
              </button>
            )}
          </nav>
        </>
      )}
    </div>
  );
}
