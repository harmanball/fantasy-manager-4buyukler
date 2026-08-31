import { fetchGameweekFixturesFromDb } from "@/lib/gameweekFixtures";

export type { TrackedFixture, TrackedTeamCode } from "@/lib/gameweekFixtures";

export async function GET() {
  const fixtures = await fetchGameweekFixturesFromDb();
  return Response.json({ fixtures });
}
