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
  const { weekNumber, name, deadline } = body as {
    weekNumber: number;
    name?: string;
    deadline?: string;
  };
  if (!weekNumber) {
    return Response.json({ error: "Hafta numarası zorunlu." }, { status: 400 });
  }

  const admin = createAdminClient();

  // Fikstürü BİR KERE çekiyoruz — hem deadline hesaplamak hem de
  // gameweek_fixtures tablosuna "enstantane" olarak kaydetmek için aynı
  // veriyi kullanıyoruz.
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

  const { data: inserted, error } = await admin
    .from("gameweeks")
    .insert({
      week_number: weekNumber,
      name: name || `${weekNumber}. Hafta`,
      deadline: deadline || computedDeadline,
      status: "open",
    })
    .select("id")
    .single();

  if (error || !inserted) {
    return Response.json({ error: error?.message ?? "Hafta oluşturulamadı." }, { status: 500 });
  }

  if (fixtures.length > 0) {
    await admin.from("gameweek_fixtures").insert(
      fixtures.map((f: { team: string; opponent: string; isHome: boolean; date: string; time: string; venue: string | null }) => ({
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

  // Kadrosunu güncellemeyen kullanıcılar için: bir önceki haftanın
  // kadrosunu yeni haftaya OTOMATİK KOPYALA — "haftalarca güncellemesen
  // bile kadron saklı kalsın ve puan almaya devam etsin" kuralı gereği.
  // Transfer sayısında bir sınır olmadığı için bu kopyalama herhangi bir
  // transfer hakkını "harcamış" saymaz, sadece aynı seçimleri sessizce
  // taşır.
  const { data: prevGw } = await admin
    .from("gameweeks")
    .select("id")
    .eq("week_number", weekNumber - 1)
    .maybeSingle();

  if (prevGw) {
    const { data: prevPicks } = await admin
      .from("user_picks")
      .select("user_id, player_id, is_captain")
      .eq("gameweek_id", prevGw.id);

    if (prevPicks && prevPicks.length > 0) {
      await admin.from("user_picks").insert(
        prevPicks.map((p: { user_id: string; player_id: string; is_captain: boolean }) => ({
          user_id: p.user_id,
          gameweek_id: inserted.id,
          player_id: p.player_id,
          is_captain: p.is_captain,
        }))
      );
    }
  }

  return Response.json({ ok: true });
}
