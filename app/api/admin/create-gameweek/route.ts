import { createAdminClient, requireAdmin } from "@/lib/supabaseAdmin";

// Deadline artık admin panelinden istenmiyor — kadro sayfasındaki
// Salı/Çarşamba/Perşembe kuralıyla zaten hiçbir bağlantısı yok, sadece
// veritabanı sütununu doldurmak için makul bir varsayılan üretiyoruz:
// oluşturma anından sonraki ilk Cuma 00:00 (kadro sayfasındaki
// getWindowCloseTime ile aynı mantık).
function defaultDeadline(): string {
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
    deadline: deadline || defaultDeadline(),
    status: "open",
  });
  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
  return Response.json({ ok: true });
}
