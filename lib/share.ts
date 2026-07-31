// Doğrudan WhatsApp'a açar — navigator.share bazı tarayıcılarda (özellikle
// masaüstü) ya hiç yok ya da izin hatası veriyor ve sessizce başarısız
// oluyordu. Tek, öngörülebilir bir yol kullanıyoruz; açılır pencere
// engellenirse metni panoya kopyalayıp kullanıcıyı bilgilendiriyoruz.
export function shareText(text: string) {
  if (typeof window === "undefined") return;

  const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
  const win = window.open(url, "_blank", "noopener,noreferrer");

  if (!win) {
    if (navigator.clipboard) {
      navigator.clipboard
        .writeText(text)
        .then(() => {
          window.alert(
            "Tarayıcın açılır pencereyi engelledi. Paylaşım metni panoya kopyalandı, istediğin yere yapıştırabilirsin."
          );
        })
        .catch(() => {
          window.alert("Paylaşım açılamadı. Tarayıcı ayarlarından açılır pencerelere izin ver.");
        });
    } else {
      window.alert("Paylaşım açılamadı. Tarayıcı ayarlarından açılır pencerelere izin ver.");
    }
  }
}

export function getSiteUrl(): string {
  if (typeof window !== "undefined") return window.location.origin;
  return "";
}
