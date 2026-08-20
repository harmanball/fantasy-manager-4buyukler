import type { TrackedFixture } from "@/app/api/fixtures/route";

export type { TrackedFixture, TrackedTeamCode } from "@/app/api/fixtures/route";

export async function fetchUpcomingFixtures(): Promise<TrackedFixture[]> {
  try {
    const res = await fetch("/api/fixtures");
    if (!res.ok) return [];
    const data = await res.json();
    return (data?.fixtures as TrackedFixture[]) ?? [];
  } catch (err) {
    console.error("Fikstür çekilemedi:", err);
    return [];
  }
}
