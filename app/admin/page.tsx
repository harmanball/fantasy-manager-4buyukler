"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/useSession";
import { supabase } from "@/lib/supabase";
import { ADMIN_EMAILS } from "@/lib/adminConfig";
import { fetchPlayers, Player } from "@/lib/players";
import { parseStatsBlock, ParsedStatRow } from "@/lib/statsParser";

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
  const [newWeekDeadline, setNewWeekDeadline] = useState("");
  const [creatingWeek, setCreatingWeek] = useState(false);
  const [createMsg, setCreateMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionLoading && !session) router.push("/giris");
  }, [sessionLoading, session, router]);

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
  }, [isAdmin]);

  const knownKeys = new Set(
    players.map((p) => `${p.team}::${p.name.trim().toLowerCase()}`)
  );

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
        deadline: newWeekDeadline,
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
    setNewWeekDeadline("");
    supabase
      .from("gameweeks")
      .select("id, week_number, name, status, deadline")
      .order("week_number", { ascending: true })
      .then(({ data }) => setGameweeks(data ?? []));
  }

  if (sessionLoading || !session) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-2xl items-center justify-center px-3">
        <p className="text-sm text-foreground/50">Yükleniyor…</p>
      </main>
    );
  }

  if (!isAdmin) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-2xl items-center justify-center px-3">
        <p className="text-sm text-foreground/60">
          Bu sayfa yalnızca yönetici için.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col gap-6 px-3 py-4 sm:px-6 sm:py-6">
      <h1 className="font-display text-lg font-semibold sm:text-xl">
        Yönetici Paneli
      </h1>

      <section className="rounded-lg border border-charcoal/10 bg-white p-4">
        <h2 className="mb-3 text-sm font-semibold">Yeni Hafta Oluştur</h2>
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
          <input
            type="datetime-local"
            required
            value={newWeekDeadline}
            onChange={(e) => setNewWeekDeadline(e.target.value)}
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
    </main>
  );
}
