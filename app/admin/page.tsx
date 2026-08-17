"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/useSession";
import { supabase } from "@/lib/supabase";
import { ADMIN_EMAILS } from "@/lib/adminConfig";
import { fetchPlayers, Player } from "@/lib/players";
import { parseStatsBlock, ParsedStatRow } from "@/lib/statsParser";
import { fetchTransferWindowOverride, TransferWindowOverride } from "@/lib/transferWindow";

interface GameweekRow {
  id: number;
  week_number: number;
  name: string | null;
  status: string;
  deadline: string;
}

const PLACEHOLDER = `# Format: TAKIM|OYUNCU|DAKİKA|GOL|ASİST|TEMİZKALE|SARI|KIRMIZI|KKGOL|PENKAÇAN|MAÇPUANI|MOTM
GS|Victor Osimhen|90|2|1|0|0|0|0|0|8.4|1
GS|Günay Güvenc|90|0|0|0|0|1|0|0|5.6|0`;

export default function AdminPage() {
  const { session, loading: sessionLoading } = useSession();
  const router = useRouter();

  const isAdmin = !!session?.user.email && ADMIN_EMAILS.includes(session.user.email);

  const [gameweeks, setGameweeks] = useState<GameweekRow[]>([]);
  const [selectedGw, setSelectedGw] = useState<number | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);

  const [statsText, setStatsText] = useState("");
  const [parsed, setParsed] = useState<ParsedStatRow[] | null>(null);
  const [saving, setSaving] = useState(false);
  const [resultMsg, setResultMsg] = useState<string | null>(null);

  const [newWeekNumber, setNewWeekNumber] = useState("");
  const [newWeekName, setNewWeekName] = useState("");
  const [creatingWeek, setCreatingWeek] = useState(false);
  const [createMsg, setCreateMsg] = useState<string | null>(null);

  const [transferOverride, setTransferOverride] = useState<TransferWindowOverride>(0);
  const [transferSaving, setTransferSaving] = useState(false);

  const [closingWeek, setClosingWeek] = useState(false);
  const [closeMsg, setCloseMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionLoading && !session) router.push("/giris");
  }, [sessionLoading, session, router]);

  function refreshGameweeks() {
    return supabase
      .from("gameweeks")
      .select("id, week_number, name, status, deadline")
      .order("week_number", { ascending: true })
      .then(({ data }) => setGameweeks(data ?? []));
  }

  useEffect(() => {
    if (!isAdmin) return;
    supabase
      .from("gameweeks")
      .select("id, week_number, name, status, deadline")
      .order("week_number", { ascending: true })
      .then(({ data }) => {
        setGameweeks(data ?? []);
        if (data && data.length > 0) setSelectedGw(data[0].id);
      });
    fetchPlayers().then(setPlayers);
    fetchTransferWindowOverride().then(setTransferOverride);
  }, [isAdmin]);

  const knownKeys = new Set(
    players.map((p) => `${p.team}::${p.name.trim().toLowerCase()}`)
  );

  const selectedGwRow = gameweeks.find((gw) => gw.id === selectedGw) ?? null;

  function handlePreview() {
    setParsed(parseStatsBlock(statsText));
    setResultMsg(null);
  }

  async function handleSave() {
    if (!selectedGw || !parsed) return;
    setSaving(true);
    setResultMsg(null);
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    const res = await fetch("/api/admin/save-stats", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ gameweekId: selectedGw, rows: parsed }),
    });
    const json = await res.json();
    setSaving(false);
    if (!res.ok) {
      setResultMsg(`Hata: ${json.error}`);
      return;
    }
    setResultMsg(
      `${json.matchedCount} oyuncu güncellendi, puanlar hesaplandı ✓` +
        (json.unmatched.length > 0
          ? ` — eşleşmeyenler: ${json.unmatched.join(", ")}`
          : "")
    );
  }

  async function handleSetTransferWindow(value: TransferWindowOverride) {
    setTransferSaving(true);
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    const res = await fetch("/api/admin/set-transfer-window", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ override: value }),
    });
    setTransferSaving(false);
    if (res.ok) setTransferOverride(value);
  }

  async function handleCloseWeek() {
    if (!selectedGw) return;
    const confirmed = window.confirm(
      "Bu haftayı kapatmak istediğine emin misin? Tüm maçların istatistiklerini girdiğinden emin ol. Hafta kapanınca bir sonraki hafta otomatik olarak oluşturulup açılacak."
    );
    if (!confirmed) return;

    setClosingWeek(true);
    setCloseMsg(null);
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    const res = await fetch("/api/admin/close-gameweek", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ gameweekId: selectedGw }),
    });
    const json = await res.json();
    setClosingWeek(false);
    if (!res.ok) {
      setCloseMsg(`Hata: ${json.error}`);
      return;
    }
    if (json.nextWeekCreated) {
      setCloseMsg(`Hafta kapatıldı ✓ — ${json.nextWeekNumber}. Hafta otomatik açıldı ✓`);
    } else if (json.nextWeekError) {
      setCloseMsg(
        `Hafta kapatıldı ✓ — ama ${json.nextWeekNumber}. Hafta otomatik açılamadı (${json.nextWeekError}). "Yeni Hafta Oluştur"dan elle ekleyebilirsin.`
      );
    } else {
      setCloseMsg(`Hafta kapatıldı ✓ — ${json.nextWeekNumber}. Hafta zaten mevcuttu.`);
    }
    refreshGameweeks();
  }

  async function handleCreateWeek(e: React.FormEvent) {
    e.preventDefault();
    setCreatingWeek(true);
    setCreateMsg(null);
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    const res = await fetch("/api/admin/create-gameweek", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        weekNumber: Number(newWeekNumber),
        name: newWeekName,
      }),
    });
    const json = await res.json();
    setCreatingWeek(false);
    if (!res.ok) {
      setCreateMsg(`Hata: ${json.error}`);
      return;
    }
    setCreateMsg("Hafta oluşturuldu ✓");
    setNewWeekNumber("");
    setNewWeekName("");
    refreshGameweeks();
  }

  if (sessionLoading || !session) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-2xl items-center justify-center px-3 py-4">
        <p className="rounded-xl bg-background px-6 py-4 text-sm text-foreground/50">
          Yükleniyor…
        </p>
      </main>
    );
  }

  if (!isAdmin) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-2xl items-center justify-center px-3 py-4">
        <p className="rounded-xl bg-background px-6 py-4 text-sm text-foreground/60">
          Bu sayfa yalnızca yönetici için.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-3 py-4 sm:px-6 sm:py-6">
    <div className="flex flex-col gap-6 rounded-xl bg-background p-4 sm:p-6">
      <h1 className="font-display text-lg font-semibold sm:text-xl">
        Yönetici Paneli
      </h1>

      <section className="rounded-lg border border-charcoal/10 bg-white p-4">
        <h2 className="mb-1 text-sm font-semibold">Transfer Penceresi</h2>
        <p className="mb-3 text-xs text-foreground/50">
          Normalde yalnızca Salı/Çarşamba/Perşembe açıktır. Buradan geçici
          olarak ezebilirsin (örn. sezon başlamadan önce her gün açık
          tutmak için).
        </p>
        <div className="flex gap-2">
          <button
            onClick={() => handleSetTransferWindow(0)}
            disabled={transferSaving}
            className={`flex-1 rounded-lg border px-3 py-2 text-xs font-medium ${
              transferOverride === 0
                ? "border-pitch bg-pitch text-ivory"
                : "border-charcoal/20 text-foreground/70"
            }`}
          >
            Otomatik
          </button>
          <button
            onClick={() => handleSetTransferWindow(1)}
            disabled={transferSaving}
            className={`flex-1 rounded-lg border px-3 py-2 text-xs font-medium ${
              transferOverride === 1
                ? "border-green-600 bg-green-600 text-white"
                : "border-charcoal/20 text-foreground/70"
            }`}
          >
            Zorla Aç
          </button>
          <button
            onClick={() => handleSetTransferWindow(2)}
            disabled={transferSaving}
            className={`flex-1 rounded-lg border px-3 py-2 text-xs font-medium ${
              transferOverride === 2
                ? "border-red-600 bg-red-600 text-white"
                : "border-charcoal/20 text-foreground/70"
            }`}
          >
            Zorla Kapat
          </button>
        </div>
      </section>

      <section className="rounded-lg border border-charcoal/10 bg-white p-4">
        <h2 className="mb-3 text-sm font-semibold">Yeni Hafta Oluştur</h2>
        <p className="mb-3 text-xs text-foreground/50">
          Normalde buna gerek kalmaz — "Haftayı Kapat" bir sonraki haftayı
          otomatik açar. Bu form sadece elle ekleme gerektiren istisnai
          durumlar için.
        </p>
        <form onSubmit={handleCreateWeek} className="flex flex-col gap-2">
          <input
            type="number"
            placeholder="Hafta no (örn. 2)"
            required
            value={newWeekNumber}
            onChange={(e) => setNewWeekNumber(e.target.value)}
            className="h-10 rounded-lg border border-charcoal/15 px-3 text-sm outline-none focus:border-pitch"
          />
          <input
            type="text"
            placeholder="Ad (opsiyonel, örn. 2. Hafta)"
            value={newWeekName}
            onChange={(e) => setNewWeekName(e.target.value)}
            className="h-10 rounded-lg border border-charcoal/15 px-3 text-sm outline-none focus:border-pitch"
          />
          <button
            type="submit"
            disabled={creatingWeek}
            className="h-10 rounded-lg bg-pitch text-sm font-medium text-ivory disabled:opacity-50"
          >
            {creatingWeek ? "…" : "Hafta Oluştur"}
          </button>
          {createMsg && <p className="text-sm text-foreground/70">{createMsg}</p>}
        </form>
      </section>

      <section className="rounded-lg border border-charcoal/10 bg-white p-4">
        <h2 className="mb-3 text-sm font-semibold">Haftalık İstatistik Yükle</h2>

        <label className="mb-1 block text-xs text-foreground/60">Hafta</label>
        <select
          value={selectedGw ?? ""}
          onChange={(e) => setSelectedGw(Number(e.target.value))}
          className="mb-3 h-10 w-full rounded-lg border border-charcoal/15 px-3 text-sm"
        >
          {gameweeks.map((gw) => (
            <option key={gw.id} value={gw.id}>
              {gw.name || `${gw.week_number}. Hafta`} — {gw.status}
            </option>
          ))}
        </select>

        {selectedGwRow && (
          <div className="mb-3 flex items-center justify-between rounded-lg border border-charcoal/10 bg-background px-3 py-2">
            <span className="text-xs text-foreground/60">
              Şu anki durum: <strong>{selectedGwRow.status}</strong>
            </span>
            <button
              onClick={handleCloseWeek}
              disabled={closingWeek || selectedGwRow.status === "finished"}
              className="rounded-lg border border-red-600 px-3 py-1.5 text-xs font-medium text-red-600 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {closingWeek
                ? "…"
                : selectedGwRow.status === "finished"
                ? "Zaten Kapalı"
                : "Haftayı Kapat"}
            </button>
          </div>
        )}
        {closeMsg && <p className="mb-3 text-xs text-foreground/70">{closeMsg}</p>}

        <label className="mb-1 block text-xs text-foreground/60">
          Veri bloğu
        </label>
        <textarea
          value={statsText}
          onChange={(e) => setStatsText(e.target.value)}
          placeholder={PLACEHOLDER}
          rows={8}
          className="mb-2 w-full rounded-lg border border-charcoal/15 p-3 font-mono text-xs outline-none focus:border-pitch"
        />

        <button
          onClick={handlePreview}
          className="mb-3 h-10 w-full rounded-lg border border-charcoal/20 text-sm font-medium"
        >
          Önizle
        </button>

        {parsed && (
          <div className="mb-3 max-h-64 overflow-y-auto rounded-lg border border-charcoal/10">
            <table className="w-full text-xs">
              <thead className="bg-background sticky top-0">
                <tr>
                  <th className="p-2 text-left">Takım</th>
                  <th className="p-2 text-left">Oyuncu</th>
                  <th className="p-2 text-right">Dk</th>
                  <th className="p-2 text-right">Gol</th>
                  <th className="p-2 text-right">Ast</th>
                  <th className="p-2 text-right">Puan</th>
                  <th className="p-2 text-center">Durum</th>
                </tr>
              </thead>
              <tbody>
                {parsed.map((row, i) => {
                  const key = `${row.team.trim().toUpperCase()}::${row.name.trim().toLowerCase()}`;
                  const known = knownKeys.has(key);
                  return (
                    <tr
                      key={i}
                      className={
                        !row.fieldCountOk || !known
                          ? "bg-red-50"
                          : i % 2 === 0
                          ? "bg-white"
                          : "bg-background"
                      }
                    >
                      <td className="p-2">{row.team}</td>
                      <td className="p-2">{row.name}</td>
                      <td className="p-2 text-right">{row.minutes}</td>
                      <td className="p-2 text-right">{row.goals}</td>
                      <td className="p-2 text-right">{row.assists}</td>
                      <td className="p-2 text-right">{row.rating ?? "—"}</td>
                      <td className="p-2 text-center">
                        {!row.fieldCountOk
                          ? "Eksik alan"
                          : !known
                          ? "Eşleşmedi"
                          : "OK"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <button
          onClick={handleSave}
          disabled={!parsed || parsed.length === 0 || saving || !selectedGw}
          className="h-10 w-full rounded-lg bg-pitch text-sm font-medium text-ivory disabled:cursor-not-allowed disabled:opacity-30"
        >
          {saving ? "Kaydediliyor…" : "Kaydet ve Puanla"}
        </button>

        {resultMsg && (
          <p className="mt-2 text-sm text-foreground/70">{resultMsg}</p>
        )}
      </section>
    </div>
    </main>
  );
}
