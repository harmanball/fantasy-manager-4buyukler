import { fetchTrackedFixturesServer } from "@/lib/fixturesServer";

export type { TrackedFixture, TrackedTeamCode } from "@/lib/fixturesServer";

export const revalidate = 3600; // 1 saat — aynı veriyi her istekte yeniden çekmemek için

export async function GET() {
  const fixtures = await fetchTrackedFixturesServer();
  return Response.json({ fixtures });
}
