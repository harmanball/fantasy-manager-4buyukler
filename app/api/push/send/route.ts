import { requireAdmin } from "@/lib/supabaseAdmin";
import { sendPushToAll } from "@/lib/sendPush";

export async function POST(request: Request) {
  const auth = await requireAdmin(request);
  if (!auth.ok) {
    return Response.json({ error: auth.message }, { status: auth.status });
  }

  const body = await request.json();
  const { title, message, url } = body as { title: string; message: string; url?: string };

  if (!title || !message) {
    return Response.json({ error: "Başlık ve mesaj gerekli." }, { status: 400 });
  }

  const result = await sendPushToAll({ title, body: message, url });
  return Response.json(result);
}
