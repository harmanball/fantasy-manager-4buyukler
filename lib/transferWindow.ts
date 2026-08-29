import { supabase } from "./supabase";
import { fetchUpcomingFixtures } from "./fixtures";

// Pencere kapanışı artık haftanın sabit deadline'ına (Cuma 00:00) değil,
// 4 büyüklerin O HAFTAKİ İLK MAÇININ başlama saatinden 3 SAAT ÖNCESİNE göre
// hesaplanıyor — WeeklyFixtures ile aynı, kronolojik sıralanmış fikstür
// verisi kullanılıyor (bkz. /api/fixtures). Örnek: haftanın ilk maçı Cuma
// 21:30'da başlıyorsa, pencere o gün 18:30'da kapanır.
//
// Bu veri alınamazsa (ağ sorunu, kaynak çökmesi vb.) sırasıyla: önce
// haftanın eski deadline alanına, o da yoksa eski gün bazlı (Salı/
// Çarşamba/Perşembe) güvenlik ağına düşülür.
const CLOSE_BEFORE_KICKOFF_MS = 3 * 60 * 60 * 1000; // 3 saat

// JS'te getDay(): 0=Pazar, 1=Pazartesi, 2=Salı, 3=Çarşamba, 4=Perşembe, 5=Cuma, 6=Cumartesi
const OPEN_DAYS = [2, 3, 4];

export type TransferWindowOverride = 0 | 1 | 2; // 0=Otomatik, 1=Zorla açık, 2=Zorla kapalı

// Hiçbir veri bulunamadığında (uç durum) düşülen eski, güne dayalı
// güvenlik ağı.
function isDayWithinWindow(): boolean {
  return OPEN_DAYS.includes(new Date().getDay());
}

export async function fetchTransferWindowOverride(): Promise<TransferWindowOverride> {
  const { data, error } = await supabase
    .from("game_settings")
    .select("value")
    .eq("key", "transfer_window_override")
    .maybeSingle();

  if (error || !data) return 0;
  const v = data.value as number;
  return v === 1 || v === 2 ? v : 0;
}

// 4 büyüklerin sıradaki ilk maçının kickoff'undan 3 saat önceki zamanı
// hesaplar. WeeklyFixtures'ın kullandığı aynı, kronolojik sıralanmış
// fikstür listesinin ilk elemanı esas alınır.
async function computeFixtureBasedCloseTime(): Promise<Date | null> {
  const fixtures = await fetchUpcomingFixtures();
  if (!fixtures || fixtures.length === 0) return null;

  const first = fixtures[0];
  if (!first.date) return null;

  const kickoff = new Date(`${first.date}T${first.time || "00:00"}:00`);
  if (isNaN(kickoff.getTime())) return null;

  return new Date(kickoff.getTime() - CLOSE_BEFORE_KICKOFF_MS);
}

// Şu an "open"/"upcoming" durumundaki haftanın deadline'ını getirir —
// fikstür verisi hiç alınamazsa devreye giren ikincil güvenlik ağı.
async function fetchOpenGameweekDeadline(): Promise<Date | null> {
  const { data, error } = await supabase
    .from("gameweeks")
    .select("deadline")
    .in("status", ["open", "upcoming"])
    .order("week_number", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error || !data?.deadline) return null;
  return new Date(data.deadline);
}

// Admin ayarını da hesaba katan asıl kontrol — kadro sayfası bunu kullanır.
export async function fetchIsTransferWindowOpen(): Promise<boolean> {
  const override = await fetchTransferWindowOverride();
  if (override === 1) return true;
  if (override === 2) return false;

  const fixtureCloseTime = await computeFixtureBasedCloseTime();
  if (fixtureCloseTime) return new Date() < fixtureCloseTime;

  const deadline = await fetchOpenGameweekDeadline();
  if (deadline) return new Date() < deadline;

  return isDayWithinWindow();
}
