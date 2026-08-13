"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function SifreSifirlaPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    // Supabase, e-postadaki linkten gelen kurtarma oturumunu otomatik
    // olarak kurar ve PASSWORD_RECOVERY olayını tetikler.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setReady(true);
    });
    // Sayfa yenilenirse veya olay kaçırılırsa, mevcut oturumu da kontrol et
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== passwordConfirm) {
      setError("Şifreler birbiriyle eşleşmiyor.");
      return;
    }
    setSaving(true);
    setError(null);
    const { error } = await supabase.auth.updateUser({ password });
    setSaving(false);
    if (error) {
      setError(error.message);
      return;
    }
    setDone(true);
    setTimeout(() => router.push("/kadro"), 1500);
  }

  if (done) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-4 py-10">
        <div className="rounded-xl bg-background p-4">
          <div className="rounded-xl border border-charcoal/10 bg-white p-6 text-center">
            <p className="font-display text-lg font-medium">Şifren güncellendi ✓</p>
            <p className="mt-2 text-sm text-foreground/60">Kadro sayfana yönlendiriliyorsun…</p>
          </div>
        </div>
      </main>
    );
  }

  if (!ready) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-4 py-10">
        <div className="rounded-xl bg-background p-4">
          <div className="rounded-xl border border-charcoal/10 bg-white p-6 text-center">
            <p className="text-sm text-foreground/60">
              Bağlantı doğrulanıyor… E-postadaki linke bu sekmeden tıkladığından
              emin ol. Sorun devam ederse{" "}
              <a href="/sifremi-unuttum" className="text-pitch underline underline-offset-2">
                yeni bir sıfırlama linki iste
              </a>
              .
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-4 py-10">
      <div className="rounded-xl bg-background p-4">
        <h1 className="font-display mb-1 text-xl font-semibold">Yeni şifre belirle</h1>
        <p className="mb-6 text-sm text-foreground/60">
          Hesabın için yeni bir şifre gir.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            type="password"
            placeholder="Yeni şifre"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            className="h-11 rounded-lg border border-charcoal/15 bg-white px-3 text-sm outline-none focus:border-pitch"
          />
          <input
            type="password"
            placeholder="Yeni şifre (tekrar)"
            value={passwordConfirm}
            onChange={(e) => setPasswordConfirm(e.target.value)}
            required
            minLength={6}
            className="h-11 rounded-lg border border-charcoal/15 bg-white px-3 text-sm outline-none focus:border-pitch"
          />

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={saving}
            className="h-11 rounded-lg bg-pitch text-sm font-medium text-ivory disabled:opacity-50"
          >
            {saving ? "Kaydediliyor…" : "Şifreyi güncelle"}
          </button>
        </form>
      </div>
    </main>
  );
}
