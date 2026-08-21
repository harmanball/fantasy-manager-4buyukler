"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/useSession";
import { supabase } from "@/lib/supabase";
import { AppHeader } from "@/components/AppHeader";
import { PageHeader } from "@/components/PageHeader";
import { TeamEmblem } from "@/components/TeamEmblem";
import {
  EMBLEMS,
  EmblemId,
  DEFAULT_EMBLEM,
  DEFAULT_COLOR1,
  DEFAULT_COLOR2,
} from "@/lib/emblems";

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

  const [color1, setColor1] = useState(DEFAULT_COLOR1);
  const [color2, setColor2] = useState(DEFAULT_COLOR2);
  const [slogan, setSlogan] = useState("");
  const [emblem, setEmblem] = useState<EmblemId>(DEFAULT_EMBLEM);
  const [customizationSaving, setCustomizationSaving] = useState(false);
  const [customizationMsg, setCustomizationMsg] = useState<string | null>(null);

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
        .select("squad_name, username, team_color1, team_color2, slogan, emblem")
        .eq("id", session!.user.id)
        .maybeSingle();
      if (cancelled) return;
      if (data) {
        setSquadName(data.squad_name || data.username || "");
        setColor1(data.team_color1 || DEFAULT_COLOR1);
        setColor2(data.team_color2 || DEFAULT_COLOR2);
        setSlogan(data.slogan || "");
        setEmblem((data.emblem as EmblemId) || DEFAULT_EMBLEM);
      }
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

  async function handleCustomizationSave(e: React.FormEvent) {
    e.preventDefault();
    if (!session) return;
    setCustomizationSaving(true);
    setCustomizationMsg(null);
    const { error } = await supabase
      .from("profiles")
      .update({
        team_color1: color1,
        team_color2: color2,
        slogan: slogan.trim() || null,
        emblem,
      })
      .eq("id", session.user.id);
    setCustomizationSaving(false);
    setCustomizationMsg(error ? `Hata: ${error.message}` : "Kişiselleştirme kaydedildi ✓");
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
          onSubmit={handleCustomizationSave}
          className="flex flex-col gap-3 rounded-lg border border-charcoal/10 bg-white p-4"
        >
          <h2 className="text-sm font-semibold">Kişiselleştirme</h2>

          <div className="flex flex-col items-center gap-2 rounded-lg bg-background px-3 py-4">
            <TeamEmblem emblem={emblem} color1={color1} color2={color2} size={72} />
            <p className="text-sm font-medium text-charcoal">
              {squadName || "Kadromun Adı"}
            </p>
            {slogan && (
              <p className="text-center text-xs italic text-foreground/60">{slogan}</p>
            )}
          </div>

          <div>
            <p className="mb-1.5 text-xs text-foreground/60">Takım renkleri</p>
            <div className="flex gap-3">
              <label className="flex flex-1 items-center gap-2 text-xs">
                Ana
                <input
                  type="color"
                  value={color1}
                  onChange={(e) => setColor1(e.target.value)}
                  className="h-8 w-9 rounded border border-charcoal/15 p-0.5"
                />
              </label>
              <label className="flex flex-1 items-center gap-2 text-xs">
                Vurgu
                <input
                  type="color"
                  value={color2}
                  onChange={(e) => setColor2(e.target.value)}
                  className="h-8 w-9 rounded border border-charcoal/15 p-0.5"
                />
              </label>
            </div>
          </div>

          <div>
            <p className="mb-1.5 text-xs text-foreground/60">Slogan</p>
            <input
              type="text"
              value={slogan}
              onChange={(e) => setSlogan(e.target.value)}
              maxLength={40}
              placeholder="Kısa bir slogan yaz"
              className="h-10 w-full rounded-lg border border-charcoal/15 px-3 text-sm outline-none focus:border-pitch"
            />
          </div>

          <div>
            <p className="mb-1.5 text-xs text-foreground/60">Amblem</p>
            <div className="grid grid-cols-4 gap-2">
              {EMBLEMS.map((e) => (
                <button
                  key={e.id}
                  type="button"
                  onClick={() => setEmblem(e.id)}
                  className={`flex flex-col items-center gap-1 rounded-lg border px-1 py-2 ${
                    emblem === e.id
                      ? "border-pitch bg-pitch/5"
                      : "border-charcoal/15"
                  }`}
                >
                  <TeamEmblem emblem={e.id} color1={color1} color2={color2} size={26} />
                  <span className="text-[10px] text-foreground/70">{e.label}</span>
                </button>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={customizationSaving}
            className="h-10 rounded-lg bg-pitch text-sm font-medium text-ivory disabled:opacity-50"
          >
            {customizationSaving ? "…" : "Kaydet"}
          </button>
          {customizationMsg && (
            <p className="text-xs text-foreground/70">{customizationMsg}</p>
          )}
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
