"use client";

import { useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function SifremiUnuttumPage() {
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    setError(null);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/sifre-sifirla`,
    });
    setSending(false);
    if (error) {
      setError(error.message);
      return;
    }
    setSent(true);
  }

  if (sent) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-4 py-10">
        <div className="rounded-xl bg-background p-4">
          <Link
            href="/giris"
            className="mb-4 inline-block text-sm text-foreground/50 underline underline-offset-2"
          >
            ← Girişe dön
          </Link>
          <div className="rounded-xl border border-charcoal/10 bg-white p-6 text-center">
            <p className="font-display text-lg font-medium">E-postanı kontrol et</p>
            <p className="mt-2 text-sm text-foreground/60">
              {email} adresine bir şifre sıfırlama linki gönderdik. Linke
              tıklayıp yeni şifreni belirleyebilirsin.
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-4 py-10">
      <div className="rounded-xl bg-background p-4">
        <Link
          href="/giris"
          className="mb-4 inline-block text-sm text-foreground/50 underline underline-offset-2"
        >
          ← Girişe dön
        </Link>
        <h1 className="font-display mb-1 text-xl font-semibold">Şifremi unuttum</h1>
        <p className="mb-6 text-sm text-foreground/60">
          E-posta adresini gir, sana bir sıfırlama linki gönderelim.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            type="email"
            inputMode="email"
            placeholder="E-posta"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="h-11 rounded-lg border border-charcoal/15 bg-white px-3 text-sm outline-none focus:border-pitch"
          />

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={sending}
            className="h-11 rounded-lg bg-pitch text-sm font-medium text-ivory disabled:opacity-50"
          >
            {sending ? "Gönderiliyor…" : "Sıfırlama linki gönder"}
          </button>
        </form>
      </div>
    </main>
  );
}
