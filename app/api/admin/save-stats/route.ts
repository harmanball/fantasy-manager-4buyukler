import { createAdminClient, requireAdmin } from "@/lib/supabaseAdmin";

interface IncomingRow {
  team: string;
  name: string;
  minutes: number;
  goals: number;
  assists: number;
  cleanSheet: boolean;
  yellow: number;
  red: number;
  ownGoal: number;
  penMissed: number;
  rating: number | null;
  motm: boolean;
}

export async function POST(request: Request) {
  const auth = await requireAdmin(request);
  if (!auth.ok) {
    return Response.json({ error: auth.message }, { status: auth.status });
  }

  const body = await request.json();
  const { gameweekId, rows } = body as { gameweekId: number; rows: IncomingRow[] };

  if (!gameweekId || !Array.isArray(rows) || rows.length === 0) {
    return Response.json({ error: "Hafta ve satır verisi zorunlu." }, { status: 400 });
  }

  const admin = createAdminClient();

  // Oyuncuları (takım + isim) ile eşleştirmek için referans listesi çek
  const { data: playerRows, error: playerErr } = await admin
    .from("players")
    .select("id, name, teams(short_code)");

  if (playerErr) {
    return Response.json({ error: playerErr.message }, { status: 500 });
  }

  const lookup = new Map<string, string>();
  for (const p of playerRows ?? []) {
    const teamRel = p.teams as unknown as { short_code: string } | { short_code: string }[];
    const code = Array.isArray(teamRel) ? teamRel[0]?.short_code : teamRel?.short_code;
    if (!code) continue;
    lookup.set(`${code}::${(p.name as string).trim().toLowerCase()}`, p.id as string);
  }

  const matched: { player_id: string; row: IncomingRow }[] = [];
  const unmatched: IncomingRow[] = [];

  for (const row of rows) {
    const key = `${row.team.trim().toUpperCase()}::${row.name.trim().toLowerCase()}`;
    const playerId = lookup.get(key);
    if (playerId) {
      matched.push({ player_id: playerId, row });
    } else {
      unmatched.push(row);
    }
  }

  if (matched.length > 0) {
    const statRows = matched.map(({ player_id, row }) => ({
      player_id,
      gameweek_id: gameweekId,
      minutes: row.minutes,
      goals: row.goals,
      assists: row.assists,
      clean_sheet: row.cleanSheet,
      yellow_card: row.yellow,
      red_card: row.red,
      own_goals: row.ownGoal,
      penalty_missed: row.penMissed,
      match_rating: row.rating,
      is_motm: row.motm,
    }));

    const { error: upsertErr } = await admin
      .from("player_stats")
      .upsert(statRows, { onConflict: "player_id,gameweek_id" });

    if (upsertErr) {
      return Response.json({ error: upsertErr.message }, { status: 500 });
    }

    const { error: rpcErr } = await admin.rpc("calculate_gameweek_points", {
      gw_id: gameweekId,
    });
    if (rpcErr) {
      return Response.json({ error: `Puanlar hesaplanamadı: ${rpcErr.message}` }, { status: 500 });
    }
  }

  return Response.json({
    ok: true,
    matchedCount: matched.length,
    unmatched: unmatched.map((r) => `${r.team} — ${r.name}`),
  });
}
