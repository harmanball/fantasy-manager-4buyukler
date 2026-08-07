"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/useSession";
import { supabase } from "@/lib/supabase";
import { AppHeader } from "@/components/AppHeader";
import { PageHeader } from "@/components/PageHeader";

export default function ProfilPage() {
  const { session, loading: sessionLoading } = useSession();
  const router = useRouter();

  const [squadName, setSquadName] = useState("");
  const [squadSaving, setSquadSaving] = useState(false);
  const [squadMsg, setSquadMsg] = useState<string | null>(null);

  const [email, setEmail] = useState("");
  const [emailSaving, setEmailSaving] = useState(false);
  const [emailMsg, setEmailMsg] = useState<string | null>(null);

  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionLoading && !session) router.push("/giris");
  }, [sessionLoading, session, router]);

  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    async function load() {
      setEmail(session!.user.email ?? "");
      const { data } = await supabase
        .from("profiles")
        .select("squad_name, username")
        .eq("id", session!.user.id)
        .maybeSingle();
      if (cancelled) return;
      if (data) setSquadName(data.squad_name || data.username || "");
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [session]);

  async function handleSquadNameSave(e: React.FormEvent) {
    e.preventDefault();
    if (!session) return;
    setSquadSaving(true);
    setSquadMsg(null);
    const { error } = await supabase
      .from("profiles")
      .update({ squad_name: squadName })
      .eq("id", session.user.id);
    setSquadSaving(false);
    setSquadMsg(error ? `Hata: ${error.message}` : "Takım adı güncellendi ✓");
  }

  async function handleEmailSave(e: React.FormEvent) {
    e.preventDefault();
    setEmailSaving(true);
    setEmailMsg(null);
    const { error } = await supabase.auth.updateUser({ email });
    setEmailSaving(false);
    setEmailMsg(
      error
        ? `Hata: ${error.message}`
        : "Onay linki yeni e-posta adresine gönderildi. Onaylayana kadar eski adresin geçerli kalır."
    );
  }

  async function handlePasswordSave(e: React.FormEvent) {
    e.preventDefault();
    if (password !== passwordConfirm) {
      setPasswordMsg("Şifreler birbiriyle eşleşmiyor.");
      return;
    }
    setPasswordSaving(true);
    setPasswordMsg(null);
    const { error } = await supabase.auth.updateUser({ password });
    setPasswordSaving(false);
    setPasswordMsg(error ? `Hata: ${error.message}` : "Şifre güncellendi ✓");
    if (!error) {
      setPassword("");
      setPasswordConfirm("");
    }
  }

  if (sessionLoading || !session) {
    return (
      <>
        <AppHeader />
        <main className="mx-auto flex min-h-[calc(100dvh-57px)] max-w-md items-center justify-center px-3 py-4">
          <p className="rounded-xl bg-background px-6 py-4 text-sm text-foreground/50">
            Yükleniyor…
          </p>
        </main>
      </>
    );
  }

  return (
    <>
      <AppHeader />
      <main className="mx-auto max-w-md px-3 py-4 sm:px-6 sm:py-6">
      <div className="flex flex-col gap-6 rounded-xl bg-background p-4 sm:p-6">
        <PageHeader icon="user" title="Profil" />

        <form
          onSubmit={handleSquadNameSave}
          className="flex flex-col gap-2 rounded-lg border border-charcoal/10 bg-white p-4"
        >
          <h2 className="text-sm font-semibold">Takım adı</h2>
          <input
            type="text"
            value={squadName}
            onChange={(e) => setSquadName(e.target.value)}
            required
            className="h-10 rounded-lg border border-charcoal/15 px-3 text-sm outline-none focus:border-pitch"
          />
          <button
            type="submit"
            disabled={squadSaving}
            className="h-10 rounded-lg bg-pitch text-sm font-medium text-ivory disabled:opacity-50"
          >
            {squadSaving ? "…" : "Kaydet"}
          </button>
          {squadMsg && <p className="text-xs text-foreground/70">{squadMsg}</p>}
        </form>

        <form
          onSubmit={handleEmailSave}
          className="flex flex-col gap-2 rounded-lg border border-charcoal/10 bg-white p-4"
        >
          <h2 className="text-sm font-semibold">E-posta</h2>
          <input
            type="email"
            inputMode="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="h-10 rounded-lg border border-charcoal/15 px-3 text-sm outline-none focus:border-pitch"
          />
          <button
            type="submit"
            disabled={emailSaving}
            className="h-10 rounded-lg bg-pitch text-sm font-medium text-ivory disabled:opacity-50"
          >
            {emailSaving ? "…" : "Kaydet"}
          </button>
          {emailMsg && <p className="text-xs text-foreground/70">{emailMsg}</p>}
        </form>

        <form
          onSubmit={handlePasswordSave}
          className="flex flex-col gap-2 rounded-lg border border-charcoal/10 bg-white p-4"
        >
          <h2 className="text-sm font-semibold">Şifre değiştir</h2>
          <input
            type="password"
            placeholder="Yeni şifre"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            className="h-10 rounded-lg border border-charcoal/15 px-3 text-sm outline-none focus:border-pitch"
          />
          <input
            type="password"
            placeholder="Yeni şifre (tekrar)"
            value={passwordConfirm}
            onChange={(e) => setPasswordConfirm(e.target.value)}
            required
            minLength={6}
            className="h-10 rounded-lg border border-charcoal/15 px-3 text-sm outline-none focus:border-pitch"
          />
          <button
            type="submit"
            disabled={passwordSaving}
            className="h-10 rounded-lg bg-pitch text-sm font-medium text-ivory disabled:opacity-50"
          >
            {passwordSaving ? "…" : "Kaydet"}
          </button>
          {passwordMsg && <p className="text-xs text-foreground/70">{passwordMsg}</p>}
        </form>
      </div>
      </main>
    </>
  );
}
