import { sendPushToAll } from "@/lib/sendPush";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const result = await sendPushToAll({
    title: "Transfer penceresi bu gece kapanıyor ⏰",
    body: "Bu gece 23.59'da transfer penceresi kapanacak, kadronu güncellemeyi unutma! Sınırsız transfer yapabilirsin.",
    url: "/kadro",
  });

  return Response.json(result);
}
