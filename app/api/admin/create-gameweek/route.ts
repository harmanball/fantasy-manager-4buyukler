import { createAdminClient, requireAdmin } from "@/lib/supabaseAdmin";

export async function POST(request: Request) {
  const auth = await requireAdmin(request);
  if (!auth.ok) {
    return Response.json({ error: auth.message }, { status: auth.status });
  }

  const body = await request.json();
  const { weekNumber, name, deadline } = body as {
    weekNumber: number;
    name: string;
    deadline: string;
  };

  if (!weekNumber || !deadline) {
    return Response.json({ error: "Hafta numarası ve deadline zorunlu." }, { status: 400 });
  }

  const admin = createAdminClient();
  const { error } = await admin.from("gameweeks").insert({
    week_number: weekNumber,
    name: name || `${weekNumber}. Hafta`,
    deadline,
    status: "open",
  });

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
  return Response.json({ ok: true });
}
