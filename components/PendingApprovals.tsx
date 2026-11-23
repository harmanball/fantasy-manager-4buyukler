"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

interface Pending {
  id: string;
  email: string | null;
  username: string | null;
  squad_name: string | null;
  created_at: string;
}

// Admin sayfasında gösterilir: onay bekleyen üyeler, e-postalarıyla.
export function PendingApprovals() {
  const [list, setList] = useState<Pending[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data, error } = await supabase.rpc("admin_pending_users");
    if (error) {
      setMsg(`Liste alınamadı: ${error.message}`);
      setList([]);
      return;
    }
    setList((data ?? []) as Pending[]);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function act(p: Pending, ok: boolean) {
    const name = p.squad_name || p.username || p.email || "bu kişi";
    if (!ok && !window.confirm(`${name} reddedilecek ve hesabı silinecek. Emin misin?`)) return;
    setBusy(p.id);
    setMsg(null);
    const { error } = await supabase.rpc(ok ? "admin_approve_user" : "admin_reject_user", { uid: p.id });
    setBusy(null);
    if (error) setMsg(error.message);
    else {
      setMsg(ok ? `${name} onaylandı.` : `${name} reddedildi.`);
      await load();
    }
  }

  if (list === null) return null;

  return (
    <section className="mb-4 rounded-lg border border-charcoal/15 bg-white p-4">
      <div className="mb-2 flex items-center gap-2">
        <h2 className="font-display text-base font-semibold">Üyelik onayı</h2>
        {list.length > 0 && (
          <span className="rounded-full bg-red-600 px-2 py-0.5 text-[11px] font-bold text-white">{list.length} bekliyor</span>
        )}
      </div>
      {list.length === 0 ? (
        <p className="text-sm text-charcoal/60">Onay bekleyen kimse yok.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-charcoal/10">
          {list.map((p) => (
            <li key={p.id} className="flex flex-wrap items-center gap-2 py-2.5">
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold">{p.squad_name || p.username || "İsimsiz takım"}</div>
                <div className="truncate text-xs text-charcoal/60">
                  {p.email} · {new Date(p.created_at).toLocaleString("tr-TR", { dateStyle: "short", timeStyle: "short" })}
                </div>
              </div>
              <button
                type="button"
                disabled={busy === p.id}
                onClick={() => act(p, true)}
                className="rounded-md bg-green-700 px-3 py-1.5 text-xs font-bold text-white disabled:opacity-40"
              >
                Onayla
              </button>
              <button
                type="button"
                disabled={busy === p.id}
                onClick={() => act(p, false)}
                className="rounded-md border border-red-700 px-3 py-1.5 text-xs font-bold text-red-700 disabled:opacity-40"
              >
                Reddet
              </button>
            </li>
          ))}
        </ul>
      )}
      {msg && <p className="mt-2 text-xs text-charcoal/70">{msg}</p>}
    </section>
  );
}
