import type { Metadata } from "next";
import { headers } from "next/headers";

interface Props {
  searchParams: Promise<{
    rank?: string;
    points?: string;
    name?: string;
    scope?: string;
  }>;
}

async function resolveSiteOrigin(): Promise<string> {
  const h = await headers();
  const host = h.get("host") ?? "4buyukler.vercel.app";
  const protocol = host.includes("localhost") ? "http" : "https";
  return `${protocol}://${host}`;
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const sp = await searchParams;
  const rank = sp.rank ?? "-";
  const points = sp.points ?? "0";
  const name = sp.name ?? "";
  const scope = sp.scope ?? "Genel Toplam";
  const origin = await resolveSiteOrigin();

  const title = name
    ? `${name} — Lig Sıralamasında #${rank}`
    : `Lig Sıralamasında #${rank}`;
  const description = `Fantasy Manager: 4 Büyükler'de ${scope} #${rank}. sırada, ${points} puanla!`;

  const imageUrl = `${origin}/api/og/siralama?rank=${encodeURIComponent(
    rank
  )}&points=${encodeURIComponent(points)}&name=${encodeURIComponent(
    name
  )}&scope=${encodeURIComponent(scope)}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [{ url: imageUrl, width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [imageUrl],
    },
  };
}

export default async function PaylasSiralamaPage({ searchParams }: Props) {
  const sp = await searchParams;
  const rank = sp.rank ?? "-";
  const points = sp.points ?? "0";
  const name = sp.name ?? "";
  const scope = sp.scope ?? "Genel Toplam";

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-3 px-4 text-center">
      <p className="text-xs uppercase tracking-wide text-foreground/50">
        Fantasy Manager: 4 Büyükler
      </p>
      <p className="text-sm text-foreground/60">{scope}</p>
      <p className="font-display text-6xl font-bold text-gold">#{rank}</p>
      {name && <p className="text-lg font-medium">{name}</p>}
      <p className="text-foreground/70">{points} puan</p>
      <a
        href="/siralama"
        className="mt-4 rounded-lg bg-pitch px-5 py-2.5 text-sm font-medium text-ivory"
      >
        Lig sıralamasını gör
      </a>
    </main>
  );
}
