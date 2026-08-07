import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-3xl flex-col justify-center px-4 py-10 sm:px-6">
      <div className="relative overflow-hidden rounded-xl border-2 border-gold/60 bg-pitch px-5 py-10 shadow-lg sm:px-10 sm:py-16">
        {/* Dekoratif saha deseni — viewBox kare (1:1), "slice" kırpma ile
            konteyner ne oranda olursa olsun daire/kutular asla bozulmaz */}
        <svg
          viewBox="0 0 400 400"
          preserveAspectRatio="xMidYMid slice"
          className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.15]"
          aria-hidden="true"
        >
          <rect x="10" y="10" width="380" height="380" fill="none" stroke="#F5F1E8" strokeWidth="1.5" />
          <line x1="200" y1="10" x2="200" y2="390" stroke="#F5F1E8" strokeWidth="1.5" />
          <circle cx="200" cy="200" r="55" fill="none" stroke="#F5F1E8" strokeWidth="1.5" />
          <circle cx="200" cy="200" r="2.5" fill="#F5F1E8" />
          <rect x="10" y="140" width="70" height="120" fill="none" stroke="#F5F1E8" strokeWidth="1.5" />
          <rect x="320" y="140" width="70" height="120" fill="none" stroke="#F5F1E8" strokeWidth="1.5" />
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
              Kadronu Kur / Giriş
            </Link>
            <Link
              href="/nasil-oynanir"
              className="rounded-md border border-muted-green px-5 py-2.5 text-sm font-medium text-ivory"
            >
              Nasıl Oynanır?
            </Link>
            <Link
              href="/siralama"
              className="rounded-md border border-muted-green px-5 py-2.5 text-sm font-medium text-ivory"
            >
              Lig Sıralaması
            </Link>
            <Link
              href="/futbolcu-puanlari"
              className="rounded-md border border-muted-green px-5 py-2.5 text-sm font-medium text-ivory"
            >
              Futbolcu Puanları
            </Link>
          </div>

          <div className="flex h-1.5 w-full max-w-[280px] overflow-hidden rounded-full">
            {[
              "#FFFFFF", // beyaz
              "#000000", // siyah
              "#00338D", // lacivert
              "#FFED00", // açık sarı
              "#FDB912", // koyu sarı
              "#A90432", // kırmızı
              "#7A1E3C", // bordo
              "#5CB8E4", // mavi
            ].map((color, i) => (
              <div key={i} className="flex-1" style={{ background: color }} />
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
