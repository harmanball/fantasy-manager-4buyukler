import { supabase } from "./supabase";

// Haftalık kadro/transfer penceresi normalde yalnızca Salı, Çarşamba,
// Perşembe açıktır. Admin panelinden bu kural geçici olarak ezilebilir
// (örn. sezon başlamadan önce her gün açık tutmak için).
// JS'te getDay(): 0=Pazar, 1=Pazartesi, 2=Salı, 3=Çarşamba, 4=Perşembe, 5=Cuma, 6=Cumartesi
const OPEN_DAYS = [2, 3, 4];

export type TransferWindowOverride = 0 | 1 | 2; // 0=Otomatik, 1=Zorla açık, 2=Zorla kapalı

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

// Admin ayarını da hesaba katan asıl kontrol — kadro sayfası bunu kullanır.
export async function fetchIsTransferWindowOpen(): Promise<boolean> {
  const override = await fetchTransferWindowOverride();
  if (override === 1) return true;
  if (override === 2) return false;
  return isDayWithinWindow();
}
