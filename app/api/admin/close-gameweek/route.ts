import { createAdminClient, requireAdmin } from "@/lib/supabaseAdmin";

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
  const { error } = await admin
    .from("gameweeks")
    .update({ status: "finished" })
    .eq("id", gameweekId);

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ ok: true });
}
