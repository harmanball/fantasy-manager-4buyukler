import { AppHeader } from "@/components/AppHeader";
import { PageHeader } from "@/components/PageHeader";
import { UPDATE_NOTES, UpdateNoteIcon } from "@/lib/updateNotes";

function BellIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M6 8a6 6 0 1112 0c0 4 1.5 5.5 2 6H4c.5-.5 2-2 2-6zM9.5 18a2.5 2.5 0 005 0"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="4" y="5" width="16" height="15" rx="2" stroke="currentColor" strokeWidth="1.8" />
      <path d="M4 9.5h16M8 3v3M16 3v3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function RefreshIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 12a8 8 0 0114-5.3M20 12a8 8 0 01-14 5.3M18 4v4h-4M6 20v-4h4"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PaletteIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 3a9 9 0 100 18c1.1 0 2-.9 2-2 0-.5-.2-1-.5-1.3-.3-.4-.5-.8-.5-1.2 0-1.1.9-2 2-2h2.3c1.5 0 2.7-1.2 2.7-2.7C20 6.9 16.4 3 12 3z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="8" cy="10" r="1.2" fill="currentColor" />
      <circle cx="12" cy="7.5" r="1.2" fill="currentColor" />
      <circle cx="16" cy="10" r="1.2" fill="currentColor" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M12 7.5V12l3 2"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const ICONS: Record<UpdateNoteIcon, () => React.JSX.Element> = {
  bell: BellIcon,
  calendar: CalendarIcon,
  refresh: RefreshIcon,
  palette: PaletteIcon,
  clock: ClockIcon,
};

// Kadro sayfasında açılan "Yenilikler" pop-up'ıyla aynı içeriği (updateNotes.ts)
// kullanır — sadece kalıcı bir sayfa olarak, hamburger menüden her zaman
// erişilebilir. Pop-up'ı bir kez kapatmış olsan bile buradan tekrar
// okuyabilirsin.
export default function GuncellemelerPage() {
  return (
    <>
      <AppHeader />
      <main className="mx-auto max-w-2xl px-3 py-4 sm:px-6 sm:py-6">
      <div className="flex flex-col gap-6 rounded-xl bg-background p-4 sm:p-6">
        <PageHeader icon="info" title="Güncellemeler" />
        <div className="flex flex-col gap-3">
          {UPDATE_NOTES.map((note, i) => {
            const IconComp = ICONS[note.icon];
            return (
              <div
                key={i}
                className="flex gap-3 rounded-lg border border-charcoal/10 bg-white p-4"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-pitch text-gold">
                  <IconComp />
                </div>
                <div>
                  <p className="mb-0.5 text-sm font-medium text-charcoal">{note.title}</p>
                  <p className="text-[13px] leading-relaxed text-foreground/60">
                    {note.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      </main>
    </>
  );
}
