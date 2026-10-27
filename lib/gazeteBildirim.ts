"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "./supabase";

// Lig Gazetesi bildirimleri: meydan okuma, basın toplantısı sorusu ve cevap.
// Ayrı bildirim tablosu yok; mevcut tablolardan hesaplanır, sadece "gördü" bilgisi tutulur.

export type NotifKind = "challenge" | "question" | "answer";
export type NotifTarget = "arena-meydan" | "arena-basin";

export interface Notif {
  key: string; // "<kind>:<id>"
  kind: NotifKind;
  refId: number;
  title: string;
  sub: string;
  at: string; // ISO
  unread: boolean;
  pending: boolean; // cevap bekleyen soru (cevaplanana kadar aksiyon gerekir)
  target: NotifTarget;
}

export const NOTIF_CHANGED = "gazete-notif-changed";
export const GAZETE_SCROLL = "gazete-scroll";

export function timeAgo(iso: string): string {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "az önce";
  if (s < 3600) return `${Math.floor(s / 60)} dk önce`;
  if (s < 86400) return `${Math.floor(s / 3600)} sa önce`;
  const d = Math.floor(s / 86400);
  return d === 1 ? "dün" : `${d} gün önce`;
}

export async function fetchNotifications(meId: string): Promise<Notif[]> {
  const [ch, qs, an, seen] = await Promise.all([
    supabase
      .from("gazete_challenges")
      .select("id, challenger_id, gameweek_id, created_at")
      .eq("rival_id", meId)
      .order("created_at", { ascending: false })
      .limit(15),
    supabase
      .from("gazete_press_questions")
      .select("id, asker_id, question, created_at")
      .eq("target_id", meId)
      .is("answer", null)
      .order("created_at", { ascending: false })
      .limit(15),
    supabase
      .from("gazete_press_questions")
      .select("id, target_id, answered_at, created_at")
      .eq("asker_id", meId)
      .not("answer", "is", null)
      .order("answered_at", { ascending: false })
      .limit(10),
    supabase.from("gazete_notif_seen").select("kind, ref_id").eq("user_id", meId).range(0, 999),
  ]);

  const seenSet = new Set(((seen.data ?? []) as { kind: string; ref_id: number }[]).map((r) => `${r.kind}:${r.ref_id}`));
  const chRows = (ch.data ?? []) as { id: number; challenger_id: string; gameweek_id: number; created_at: string }[];
  const qRows = (qs.data ?? []) as { id: number; asker_id: string; question: string; created_at: string }[];
  const aRows = (an.data ?? []) as { id: number; target_id: string; answered_at: string | null; created_at: string }[];

  const ids = [...new Set([...chRows.map((r) => r.challenger_id), ...qRows.map((r) => r.asker_id), ...aRows.map((r) => r.target_id)])];
  const names = new Map<string, string>();
  if (ids.length > 0) {
    const { data } = await supabase.from("profiles").select("id, squad_name, username").in("id", ids);
    for (const p of (data ?? []) as { id: string; squad_name: string | null; username: string | null }[])
      names.set(p.id, p.squad_name || p.username || "Bir takım");
  }
  const nm = (id: string) => names.get(id) ?? "Bir takım";

  const out: Notif[] = [
    ...chRows.map<Notif>((r) => ({
      key: `challenge:${r.id}`,
      kind: "challenge",
      refId: r.id,
      title: `${nm(r.challenger_id)} sana meydan okudu`,
      sub: `Gazete · ${timeAgo(r.created_at)}`,
      at: r.created_at,
      unread: !seenSet.has(`challenge:${r.id}`),
      pending: false,
      target: "arena-meydan",
    })),
    ...qRows.map<Notif>((r) => ({
      key: `question:${r.id}`,
      kind: "question",
      refId: r.id,
      title: `${nm(r.asker_id)} takımına soru sordu`,
      sub: `“${r.question}” · ${timeAgo(r.created_at)}`,
      at: r.created_at,
      unread: !seenSet.has(`question:${r.id}`),
      pending: true,
      target: "arena-basin",
    })),
    ...aRows.map<Notif>((r) => ({
      key: `answer:${r.id}`,
      kind: "answer",
      refId: r.id,
      title: `Sorun cevaplandı: ${nm(r.target_id)}`,
      sub: `Basın toplantısı · ${timeAgo(r.answered_at ?? r.created_at)}`,
      at: r.answered_at ?? r.created_at,
      unread: !seenSet.has(`answer:${r.id}`),
      pending: false,
      target: "arena-basin",
    })),
  ];
  return out.sort((a, b) => +new Date(b.at) - +new Date(a.at));
}

export async function markSeen(meId: string, items: Pick<Notif, "kind" | "refId">[]): Promise<void> {
  if (items.length === 0) return;
  await supabase
    .from("gazete_notif_seen")
    .upsert(
      items.map((i) => ({ user_id: meId, kind: i.kind, ref_id: i.refId })),
      { onConflict: "user_id,kind,ref_id", ignoreDuplicates: true }
    );
  if (typeof window !== "undefined") window.dispatchEvent(new Event(NOTIF_CHANGED));
}

// Zil ve gazete kutusu aynı veriyi kullanır: periyodik + odak + olay ile yenilenir.
export function useGazeteNotifications(meId: string | undefined) {
  const [items, setItems] = useState<Notif[]>([]);

  const reload = useCallback(async () => {
    if (!meId) {
      setItems([]);
      return;
    }
    try {
      setItems(await fetchNotifications(meId));
    } catch {
      /* tablo yoksa ya da ağ hatasında sessizce boş bırak */
    }
  }, [meId]);

  useEffect(() => {
    reload();
    if (!meId) return;
    const t = setInterval(reload, 60000);
    const onVis = () => document.visibilityState === "visible" && reload();
    window.addEventListener(NOTIF_CHANGED, reload);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      clearInterval(t);
      window.removeEventListener(NOTIF_CHANGED, reload);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [meId, reload]);

  return { items, reload };
}
