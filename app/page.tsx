import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-3xl flex-col justify-center px-4 py-10 sm:px-6">
      <div className="relative overflow-hidden rounded-xl bg-pitch px-5 py-10 sm:px-10 sm:py-16">
        <svg
          viewBox="0 0 600 340"
          preserveAspectRatio="none"
          className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.15]"
          aria-hidden="true"
        >
          <rect x="10" y="10" width="580" height="320" fill="none" stroke="#F5F1E8" strokeWidth="1.5" />
          <line x1="300" y1="10" x2="300" y2="330" stroke="#F5F1E8" strokeWidth="1.5" />
          <circle cx="300" cy="170" r="45" fill="none" stroke="#F5F1E8" strokeWidth="1.5" />
          <rect x="10" y="95" width="60" height="150" fill="none" stroke="#F5F1E8" strokeWidth="1.5" />
          <rect x="530" y="95" width="60" height="150" fill="none" stroke="#F5F1E8" strokeWidth="1.5" />
        </svg>

        <div className="relative flex flex-col items-start">
          <span className="mb-5 rounded-full border border-gold bg-gold/15 px-3 py-1 text-xs font-medium text-gold">
            harmanball ailesinden — yeni mod
          </span>

          <h1 className="font-display text-3xl font-semibold leading-tight tracking-wide text-ivory sm:text-4xl">
            FANTASY MANAGER
          </h1>
          <p className="font-display mb-4 text-lg font-medium tracking-widest text-gold sm:text-xl">
            4 BÜYÜKLER
          </p>

          <p className="mb-6 max-w-md text-sm leading-relaxed text-ivory/70">
            Galatasaray, Fenerbahçe, Beşiktaş ve Trabzonspor&apos;dan 11
            kişilik kadronu kur, kaptanını seç, her hafta sahada yerini al.
          </p>

          <div className="mb-7 flex flex-wrap gap-2.5">
            <Link
              href="/kadro"
              className="rounded-md bg-gold px-5 py-2.5 text-sm font-medium text-charcoal"
            >
              Kadromu kur
            </Link>
            <Link
              href="/nasil-oynanir"
              className="rounded-md border border-muted-green px-5 py-2.5 text-sm font-medium text-ivory"
            >
              Nasıl oynanır
            </Link>
          </div>

          <div className="flex h-1 w-full max-w-[280px] overflow-hidden rounded-full">
            <div className="flex-1 bg-[#A90432]" />
            <div className="flex-1 bg-[#00338D]" />
            <div className="flex-1 bg-[#F5F1E8]" />
            <div className="flex-1 bg-[#7A1E3C]" />
          </div>
        </div>
      </div>
    </main>
  );
}
