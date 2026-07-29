"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  fetchPlayerPointsBreakdown,
  PlayerPointsBreakdown,
} from "@/lib/playerPoints";

const COLS: { key: keyof PlayerPointsBreakdown; label: string }[] = [
  { key: "mac_sayisi", label: "Maç" },
  { key: "oynama_puani", label: "Oynama" },
  { key: "gol_puani", label: "Gol" },
  { key: "asist_puani", label: "Asist" },
  { key: "temiz_kale_puani", label: "T.Kale" },
  { key: "kart_puani", label: "Kart" },
  { key: "kk_gol_puani", label: "KK Gol" },
  { key: "pen_kacan_puani", label: "Pen.Kaçan" },
  { key: "mac_puani_bonusu", label: "Maç Puanı Bonus" },
];

export default function FutbolcuPuanlariPage() {
  const [rows, setRows] = useState<PlayerPointsBreakdown[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  useEffect(() => {
    fetchPlayerPointsBreakdown().then((r) => {
      setRows(r);
      setLoading(false);
    });
  }, []);

  const filtered = rows.filter((r) =>
    r.name.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <main className="mx-auto flex min-h-dvh max-w-4xl flex-col gap-4 px-3 py-4 sm:px-6 sm:py-6">
      <header className="flex items-center justify-between">
        <h1 className="font-display text-lg font-semibold sm:text-xl">
          Futbolcu Puanları
        </h1>
        <Link
          href="/"
          className="text-xs text-foreground/50 underline underline-offset-2"
        >
          Ana sayfa
        </Link>
      </header>

      <input
        type="text"
        inputMode="search"
        placeholder="Oyuncu ara"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="h-10 w-full rounded-lg border border-charcoal/15 bg-white px-3 text-sm outline-none focus:border-pitch"
      />

      {loading ? (
        <p className="py-10 text-center text-sm text-foreground/50">
          Yükleniyor…
        </p>
      ) : filtered.length === 0 ? (
        <p className="rounded-lg border border-charcoal/10 bg-white px-4 py-6 text-center text-sm text-foreground/60">
          Henüz istatistik girilmedi — ilk hafta işlenince puanlar burada
          görünecek.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-charcoal/10 bg-white">
          <table className="w-full min-w-[720px] text-xs">
            <thead className="bg-background">
              <tr>
                <th className="sticky left-0 bg-background p-2 text-left">
                  Oyuncu
                </th>
                <th className="p-2 text-left">Takım</th>
                {COLS.map((c) => (
                  <th key={c.key} className="p-2 text-right whitespace-nowrap">
                    {c.label}
                  </th>
                ))}
                <th className="p-2 text-right font-semibold">Toplam</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r, i) => (
                <tr
                  key={r.player_id}
                  className={i % 2 === 0 ? "bg-white" : "bg-background/60"}
                >
                  <td className="sticky left-0 whitespace-nowrap bg-inherit p-2 font-medium">
                    {r.name}
                  </td>
                  <td className="p-2 text-foreground/60">{r.team}</td>
                  {COLS.map((c) => (
                    <td key={c.key} className="p-2 text-right">
                      {r[c.key] as number}
                    </td>
                  ))}
                  <td className="p-2 text-right font-display font-semibold">
                    {r.toplam_puan}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
