import { createAdminClient, requireAdmin } from "@/lib/supabaseAdmin";

export async function POST(request: Request) {
  const auth = await requireAdmin(request);
  if (!auth.ok) {
    return Response.json({ error: auth.message }, { status: auth.status });
  }

  const body = await request.json();
  const { gameweekId, scores } = body as {
    gameweekId: number;
    scores: { team: string; teamScore: number; opponentScore: number }[];
  };

  if (!gameweekId || !Array.isArray(scores) || scores.length === 0) {
    return Response.json({ ok: true, updated: 0 });
  }

  const admin = createAdminClient();
  let updated = 0;

  for (const s of scores) {
    const { error, count } = await admin
      .from("gameweek_fixtures")
      .update({ team_score: s.teamScore, opponent_score: s.opponentScore })
      .eq("gameweek_id", gameweekId)
      .eq("team", s.team);
    if (!error) updated++;
  }

  return Response.json({ ok: true, updated });
}
