import { supabase } from "./supabase";

export type ReactionId = "alkis" | "ates" | "gulen" | "saskin" | "begenmedi";

export const REACTIONS: { id: ReactionId; emoji: string; label: string; verb: string }[] = [
  { id: "alkis", emoji: "👏", label: "Alkış", verb: "alkışladı" },
  { id: "ates", emoji: "🔥", label: "Ateş", verb: "bunu çok beğendi" },
  { id: "gulen", emoji: "😂", label: "Güldü", verb: "güldü" },
  { id: "saskin", emoji: "😮", label: "Şaşırdı", verb: "şaşırdı" },
  { id: "begenmedi", emoji: "👎", label: "Beğenmedi", verb: "beğenmedi" },
];

export interface ReactionState {
  counts: Record<string, Partial<Record<ReactionId, number>>>; // haber -> tepki -> sayı
  mine: Record<string, ReactionId>; // haber -> benim tepkim
  who: Record<string, { userId: string; reaction: ReactionId }[]>; // haber -> kim ne tepki verdi
}

export async function fetchReactions(weekNumber: number, userId?: string): Promise<ReactionState> {
  const state: ReactionState = { counts: {}, mine: {}, who: {} };
  const { data, error } = await supabase
    .from("gazete_reactions")
    .select("user_id, story_id, reaction")
    .eq("week_number", weekNumber)
    .range(0, 4999);
  if (error || !data) return state;
  for (const r of data as { user_id: string; story_id: string; reaction: ReactionId }[]) {
    const c = (state.counts[r.story_id] ??= {});
    c[r.reaction] = (c[r.reaction] ?? 0) + 1;
    (state.who[r.story_id] ??= []).push({ userId: r.user_id, reaction: r.reaction });
    if (userId && r.user_id === userId) state.mine[r.story_id] = r.reaction;
  }
  return state;
}

// reaction === null → tepkiyi geri al. Hata varsa mesajı döndürür.
export async function setReaction(
  userId: string,
  weekNumber: number,
  storyId: string,
  reaction: ReactionId | null
): Promise<string | null> {
  if (reaction === null) {
    const { error } = await supabase
      .from("gazete_reactions")
      .delete()
      .eq("user_id", userId)
      .eq("week_number", weekNumber)
      .eq("story_id", storyId);
    return error ? error.message : null;
  }
  const { error } = await supabase
    .from("gazete_reactions")
    .upsert(
      { user_id: userId, week_number: weekNumber, story_id: storyId, reaction },
      { onConflict: "user_id,week_number,story_id" }
    );
  return error ? error.message : null;
}
