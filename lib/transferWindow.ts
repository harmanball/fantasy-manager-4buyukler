import { supabase } from "./supabase";

// Eskiden pencere yalnızca sabit günlerde (Salı/Çarşamba/Perşembe) açılırdı.
// Artık o an açık olan haftanın GERÇEK deadline'ına (Cuma 00:00) bakıyoruz —
// "Haftayı Kapat" ne zaman basılırsa basılsın (örn. Pazartesi), yeni hafta
// o andan itibaren deadline'a kadar açık kalır; belirli bir güne bağlı değil.
// Admin panelinden bu kural geçici olarak ezilebilir (Zorla Aç / Zorla Kapat).
// JS'te getDay(): 0=Pazar, 1=Pazartesi, 2=Salı, 3=Çarşamba, 4=Perşembe, 5=Cuma, 6=Cumartesi
const OPEN_DAYS = [2, 3, 4];

export type TransferWindowOverride = 0 | 1 | 2; // 0=Otomatik, 1=Zorla açık, 2=Zorla kapalı

// Hiç açık hafta bulunamadığında (uç durum — örn. sistemde daha hiç hafta
// oluşturulmamışsa) düşülen eski, güne dayalı güvenlik ağı.
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

// Şu an "open"/"upcoming" durumundaki haftanın deadline'ını getirir.
// Birden fazla varsa en erken hafta numaralısı esas alınır (fetchOpenGameweek
// ile aynı seçim mantığı).
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

  const deadline = await fetchOpenGameweekDeadline();
  if (!deadline) return isDayWithinWindow();

  return new Date() < deadline;
}
