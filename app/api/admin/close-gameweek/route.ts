import { createAdminClient, requireAdmin } from "@/lib/supabaseAdmin";
import { fetchTrackedFixturesServer } from "@/lib/fixturesServer";

const CLOSE_BEFORE_KICKOFF_MS = 3 * 60 * 60 * 1000; // 3 saat

// Bkz. create-gameweek/route.ts — aynı, tek seferlik hesaplama mantığı,
// hafta kapanınca otomatik açılan bir sonraki hafta için de kullanılıyor.
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
  const { gameweekId } = body as { gameweekId: number };
  if (!gameweekId) {
    return Response.json({ error: "Hafta ID'si zorunlu." }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data: current, error: fetchError } = await admin
    .from("gameweeks")
    .select("id, week_number")
    .eq("id", gameweekId)
    .maybeSingle();

  if (fetchError || !current) {
    return Response.json(
      { error: fetchError?.message ?? "Hafta bulunamadı." },
      { status: 404 }
    );
  }

  const { error: closeError } = await admin
    .from("gameweeks")
    .update({ status: "finished" })
    .eq("id", gameweekId);

  if (closeError) {
    return Response.json({ error: closeError.message }, { status: 500 });
  }

  const nextWeekNumber = current.week_number + 1;
  const { data: existingNext } = await admin
    .from("gameweeks")
    .select("id")
    .eq("week_number", nextWeekNumber)
    .maybeSingle();

  if (existingNext) {
    return Response.json({ ok: true, nextWeekCreated: false, nextWeekNumber });
  }

  const { error: createError } = await admin.from("gameweeks").insert({
    week_number: nextWeekNumber,
    name: `${nextWeekNumber}. Hafta`,
    deadline: await computeDeadline(),
    status: "open",
  });

  if (createError) {
    return Response.json({
      ok: true,
      nextWeekCreated: false,
      nextWeekNumber,
      nextWeekError: createError.message,
    });
  }

  return Response.json({ ok: true, nextWeekCreated: true, nextWeekNumber });
}
