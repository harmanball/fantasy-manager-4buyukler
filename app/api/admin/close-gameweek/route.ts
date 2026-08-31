import { createAdminClient, requireAdmin } from "@/lib/supabaseAdmin";
import { fetchTrackedFixturesServer } from "@/lib/fixturesServer";

const CLOSE_BEFORE_KICKOFF_MS = 3 * 60 * 60 * 1000; // 3 saat

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

  // Fikstürü BİR KERE çekiyoruz — hem yeni haftanın deadline'ı hem de
  // gameweek_fixtures "enstantanesi" için.
  const fixtures = await fetchTrackedFixturesServer();
  let computedDeadline = nextFridayMidnight();
  if (fixtures.length > 0) {
    const first = fixtures[0];
    const kickoff = new Date(`${first.date}T${first.time || "00:00"}:00`);
    if (!isNaN(kickoff.getTime())) {
      computedDeadline = new Date(
        kickoff.getTime() - CLOSE_BEFORE_KICKOFF_MS
      ).toISOString();
    }
  }

  const { data: inserted, error: createError } = await admin
    .from("gameweeks")
    .insert({
      week_number: nextWeekNumber,
      name: `${nextWeekNumber}. Hafta`,
      deadline: computedDeadline,
      status: "open",
    })
    .select("id")
    .single();

  if (createError || !inserted) {
    return Response.json({
      ok: true,
      nextWeekCreated: false,
      nextWeekNumber,
      nextWeekError: createError?.message,
    });
  }

  if (fixtures.length > 0) {
    await admin.from("gameweek_fixtures").insert(
      fixtures.map((f) => ({
        gameweek_id: inserted.id,
        team: f.team,
        opponent: f.opponent,
        is_home: f.isHome,
        match_date: f.date,
        match_time: f.time,
        venue: f.venue,
      }))
    );
  }

  return Response.json({ ok: true, nextWeekCreated: true, nextWeekNumber });
}
