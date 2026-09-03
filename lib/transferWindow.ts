import { supabase } from "./supabase";

// Pencere kapanışı, o haftanın veritabanındaki SABİT deadline alanına göre
// belirlenir. Bu deadline artık admin panelinden hafta oluşturulurken
// (create-gameweek / close-gameweek route'larında) TEK SEFERLİK olarak,
// fikstür verisinden ("4 büyüklerin o haftaki ilk maçından 3 saat önce")
// hesaplanıp yazılıyor. Burada CANLI yeniden hesaplama YAPILMIYOR —
// kasıtlı: aksi halde, hafta içinde bazı takımların maçı oynanıp bazılarının
// oynanmadığı anlarda "sıradaki maç" her sorguda değişir ve pencere
// beklenmedik şekilde tekrar açılabilir (yaşanan hata tam olarak buydu).
//
// JS'te getDay(): 0=Pazar, 1=Pazartesi, 2=Salı, 3=Çarşamba, 4=Perşembe, 5=Cuma, 6=Cumartesi
const OPEN_DAYS = [2, 3, 4];

export type TransferWindowOverride = 0 | 1 | 2; // 0=Otomatik, 1=Zorla açık, 2=Zorla kapalı

// Hiç açık hafta / deadline bulunamadığında (uç durum) düşülen eski,
// güne dayalı güvenlik ağı.
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

// Şu an "open"/"upcoming" durumundaki haftanın SABİT deadline'ını getirir.
// Dışa açık: kadro sayfası, pencerenin gerçekte NE ZAMAN kapanacağını
// ekranda göstermek için bunu doğrudan kullanır — artık kendi başına,
// gerçek deadline'dan bağımsız bir tarih hesaplamıyor.
export async function fetchOpenGameweekDeadline(): Promise<Date | null> {
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
