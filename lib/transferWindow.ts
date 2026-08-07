// Haftalık kadro/transfer penceresi yalnızca Salı, Çarşamba, Perşembe açıktır.
// JS'te getDay(): 0=Pazar, 1=Pazartesi, 2=Salı, 3=Çarşamba, 4=Perşembe, 5=Cuma, 6=Cumartesi
const OPEN_DAYS = [2, 3, 4];

export function isTransferWindowOpen(): boolean {
  return OPEN_DAYS.includes(new Date().getDay());
}
