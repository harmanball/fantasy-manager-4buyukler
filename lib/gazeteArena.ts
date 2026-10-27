import { supabase } from "./supabase";
import { fetchIsTransferWindowOpen } from "./transferWindow";

// Meydan Okuma + Basın Toplantısı: gazete sayfasındaki etkileşimli bölüm için veri ve işlemler.

export interface ArenaQuestion {
  id: number;
  askerId: string;
  targetId: string;
  gameweekId: number | null;
  question: string;
  answer: string | null;
}

export interface ArenaData {
  week: { id: number; weekNumber: number } | null; // sıradaki (en erken açık/yaklaşan) hafta
  windowOpen: boolean; // pencere kapandıysa meydan okumalar kilitli
  challenges: { challengerId: string; rivalId: string }[]; // sıradaki hafta için ilanlar
  questions: ArenaQuestion[]; // benim görebildiğim sorular (cevaplananlar + benimle ilgili olanlar)
  askedThisWeek: number; // bu hafta benim sorduğum soru sayısı
}

export const MAX_QUESTIONS_PER_WEEK = 2;
export const MAX_QUESTION_LENGTH = 140;
export const MAX_ANSWER_LENGTH = 300;

export async function fetchArena(meId: string): Promise<ArenaData> {
  const empty: ArenaData = { week: null, windowOpen: false, challenges: [], questions: [], askedThisWeek: 0 };
  const { data: gw } = await supabase
    .from("gameweeks")
    .select("id, week_number")
    .in("status", ["open", "upcoming"])
    .order("week_number", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (!gw) return empty;
  const week = { id: gw.id as number, weekNumber: gw.week_number as number };

  let windowOpen = false;
  try {
    windowOpen = await fetchIsTransferWindowOpen();
  } catch {
    windowOpen = false;
  }

  const [{ data: ch }, { data: qs }] = await Promise.all([
    supabase.from("gazete_challenges").select("challenger_id, rival_id").eq("gameweek_id", week.id).range(0, 999),
    supabase
      .from("gazete_press_questions")
      .select("id, asker_id, target_id, gameweek_id, question, answer")
      .order("id", { ascending: false })
      .range(0, 499),
  ]);

  const questions: ArenaQuestion[] = ((qs ?? []) as Record<string, unknown>[]).map((r) => ({
    id: r.id as number,
    askerId: r.asker_id as string,
    targetId: r.target_id as string,
    gameweekId: (r.gameweek_id as number | null) ?? null,
    question: r.question as string,
    answer: (r.answer as string | null) ?? null,
  }));

  return {
    week,
    windowOpen,
    challenges: ((ch ?? []) as Record<string, unknown>[]).map((r) => ({
      challengerId: r.challenger_id as string,
      rivalId: r.rival_id as string,
    })),
    questions,
    askedThisWeek: questions.filter((q) => q.askerId === meId && q.gameweekId === week.id).length,
  };
}

function errText(e: { message?: string } | null): string | null {
  if (!e) return null;
  return e.message?.includes("sıradaki hafta") || e.message?.includes("en fazla")
    ? e.message
    : "Kaydedilemedi, tekrar dene.";
}

export async function setChallenge(meId: string, weekId: number, rivalId: string): Promise<string | null> {
  const { error } = await supabase
    .from("gazete_challenges")
    .upsert({ challenger_id: meId, rival_id: rivalId, gameweek_id: weekId }, { onConflict: "challenger_id,gameweek_id" });
  return errText(error);
}

export async function clearChallenge(meId: string, weekId: number): Promise<string | null> {
  const { error } = await supabase.from("gazete_challenges").delete().eq("challenger_id", meId).eq("gameweek_id", weekId);
  return errText(error);
}

export async function askQuestion(meId: string, targetId: string, question: string): Promise<string | null> {
  const { error } = await supabase
    .from("gazete_press_questions")
    .insert({ asker_id: meId, target_id: targetId, question: question.trim().slice(0, MAX_QUESTION_LENGTH) });
  return errText(error);
}

export async function answerQuestion(id: number, answer: string): Promise<string | null> {
  const { error } = await supabase
    .from("gazete_press_questions")
    .update({ answer: answer.trim().slice(0, MAX_ANSWER_LENGTH) })
    .eq("id", id);
  return errText(error);
}

export async function deleteQuestion(id: number): Promise<string | null> {
  const { error } = await supabase.from("gazete_press_questions").delete().eq("id", id);
  return errText(error);
}
