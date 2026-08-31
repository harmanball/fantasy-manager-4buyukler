import { createAdminClient, requireAdmin } from "@/lib/supabaseAdmin";
import { fetchTrackedFixturesServer } from "@/lib/fixturesServer";

const CLOSE_BEFORE_KICKOFF_MS = 3 * 60 * 60 * 1000; // 3 saat

// Deadline artık admin panelinden istenmiyor. ÖNCELİKLE fikstür verisinden
// hesaplanır: 4 büyüklerin bu hafta oynayacağı ilk maçın kickoff'undan 3
// saat öncesi. Bu hesap SADECE hafta oluşturulurken (burada) yapılır ve
// veritabanına yazılır — transfer penceresi kontrolü (lib/transferWindow.ts)
// bundan sonra sadece bu sabit değeri okur, her seferinde yeniden
// hesaplamaz. Bu bilinçli bir tercih: aksi halde, hafta içinde bazı
// takımların maçı oynanıp bazılarınınki oynanmadığında, "sıradaki maç"
// yeniden hesaplanır ve pencere BEKLENMEDİK ŞEKİLDE TEKRAR AÇILIR (yaşanan
// hata tam olarak buydu). Fikstür verisi hiç alınamazsa, eski yedek kural
// (oluşturma anından sonraki ilk Cuma 00:00) devreye girer.
async function computeDeadline(): Promise<string> {
  try {
    const fixtures = await fetchTrackedFixturesServer();
    if (fixtures.length > 0) {
      const first = fixtures[0];
      const kickoff = new Date(`${first.date}T${first.time || "00:00"}:00`);
      if (!isNaN(kickoff.getTime())) {
        return new Date(kickoff.getTime() - CLOSE_BEFORE_KICKOFF_MS).toISOString();
      }
    }
  } catch (err) {
    console.error("Fikstür bazlı deadline hesaplanamadı, yedek kurala düşülüyor:", err);
  }
  return nextFridayMidnight();
}

function nextFridayMidnight(): string {
  const now = new Date();
  let daysUntilFriday = (5 - now.getDay() + 7) % 7;
  if (daysUntilFriday === 0) daysUntilFriday = 7;
  const d = new Date(now);
  d.setDate(now.getDate() + daysUntilFriday);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

export async function POST(request: Request) {
  const auth = await requireAdmin(request);
  if (!auth.ok) {
    return Response.json({ error: auth.message }, { status: auth.status });
  }
  const body = await request.json();
  const { weekNumber, name, deadline } = body as {
    weekNumber: number;
    name?: string;
    deadline?: string;
  };
  if (!weekNumber) {
    return Response.json({ error: "Hafta numarası zorunlu." }, { status: 400 });
  }
  const admin = createAdminClient();
  const { error } = await admin.from("gameweeks").insert({
    week_number: weekNumber,
    name: name || `${weekNumber}. Hafta`,
    deadline: deadline || (await computeDeadline()),
    status: "open",
  });
  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
  return Response.json({ ok: true });
}
