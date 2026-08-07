import { createAdminClient, requireAdmin } from "@/lib/supabaseAdmin";

export async function POST(request: Request) {
  const auth = await requireAdmin(request);
  if (!auth.ok) {
    return Response.json({ error: auth.message }, { status: auth.status });
  }

  const body = await request.json();
  const { override } = body as { override: 0 | 1 | 2 };

  if (![0, 1, 2].includes(override)) {
    return Response.json({ error: "Geçersiz değer." }, { status: 400 });
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("game_settings")
    .upsert({ key: "transfer_window_override", value: override }, { onConflict: "key" });

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
  return Response.json({ ok: true });
}
