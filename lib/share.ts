export function shareText(text: string) {
  if (typeof navigator !== "undefined" && navigator.share) {
    navigator.share({ text }).catch(() => {
      // kullanıcı iptal etti, sorun değil
    });
  } else if (typeof window !== "undefined") {
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  }
}

export function getSiteUrl(): string {
  if (typeof window !== "undefined") return window.location.origin;
  return "";
}
