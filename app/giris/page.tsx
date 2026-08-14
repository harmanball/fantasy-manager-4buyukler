"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function GirisPage() {
  const [mode, setMode] = useState<"giris" | "kayit">("giris");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [squadName, setSquadName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [checkEmail, setCheckEmail] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (mode === "kayit" && password !== passwordConfirm) {
      setError("Şifreler birbiriyle eşleşmiyor.");
      return;
    }

    setLoading(true);

    if (mode === "kayit") {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { squad_name: squadName } },
      });
      setLoading(false);
      if (error) {
        setError(error.message);
      } else if (data.session) {
        router.push("/kadro");
      } else {
        setCheckEmail(true);
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      setLoading(false);
      if (error) {
        setError(error.message);
      } else {
        router.push("/kadro");
      }
    }
  }

  if (checkEmail) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-4 py-10">
        <div className="rounded-xl bg-background p-4">
          <Link
            href="/"
            className="mb-4 inline-block text-sm text-foreground/50 underline underline-offset-2"
          >
            ← Ana sayfa
          </Link>
          <div className="rounded-xl border border-charcoal/10 bg-white p-6 text-center">
            <p className="font-display text-lg font-medium">E-postanı kontrol et</p>
            <p className="mt-2 text-sm text-foreground/60">
              {email} adresine bir onay linki gönderdik. Onayladıktan sonra giriş
              yapabilirsin.
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
        href="/"
        className="mb-4 inline-block text-sm text-foreground/50 underline underline-offset-2"
      >
        ← Ana sayfa
      </Link>
      <h1 className="font-display mb-1 text-xl font-semibold">
        {mode === "giris" ? "Giriş yap" : "Hesap oluştur"}
      </h1>
      <p className="mb-6 text-sm text-foreground/60">
        Fantasy Manager: 4 Büyükler
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        {mode === "kayit" && (
          <input
            type="text"
            placeholder="Takım adı"
            required
            value={squadName}
            onChange={(e) => setSquadName(e.target.value)}
            className="h-11 rounded-lg border border-charcoal/15 px-3 text-sm outline-none focus:border-pitch"
          />
        )}
        <input
          type="email"
          inputMode="email"
          placeholder="E-posta"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="h-11 rounded-lg border border-charcoal/15 px-3 text-sm outline-none focus:border-pitch"
        />
        <input
          type="password"
          placeholder="Şifre"
          required
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="h-11 rounded-lg border border-charcoal/15 px-3 text-sm outline-none focus:border-pitch"
        />
        {mode === "kayit" && (
          <input
            type="password"
            placeholder="Şifre (tekrar)"
            required
            minLength={6}
            value={passwordConfirm}
            onChange={(e) => setPasswordConfirm(e.target.value)}
            className="h-11 rounded-lg border border-charcoal/15 px-3 text-sm outline-none focus:border-pitch"
          />
        )}

        {mode === "giris" && (
          <Link
            href="/sifremi-unuttum"
            className="-mt-1 self-end text-xs text-foreground/50 underline underline-offset-2"
          >
            Şifremi unuttum?
          </Link>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="mt-1 h-11 rounded-lg bg-pitch text-sm font-medium text-ivory disabled:opacity-50"
        >
          {loading ? "…" : mode === "giris" ? "Giriş yap" : "Hesap oluştur"}
        </button>
      </form>

      <button
        onClick={() => {
          setMode(mode === "giris" ? "kayit" : "giris");
          setError(null);
        }}
        className="mt-4 text-center text-sm text-foreground/60 underline underline-offset-2"
      >
        {mode === "giris"
          ? "Hesabın yok mu? Kayıt ol"
          : "Zaten hesabın var mı? Giriş yap"}
      </button>
      </div>
    </main>
  );
}
