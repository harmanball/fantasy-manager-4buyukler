export type UpdateNoteIcon = "bell" | "calendar" | "refresh" | "palette" | "clock";

export interface UpdateNote {
  icon: UpdateNoteIcon;
  title: string;
  description: string;
}

// Yeni bir güncelleme notu eklerken:
// 1. UPDATE_NOTES dizisine yeni bir madde ekle (en üste ya da en alta, sırası
//    ekranda göründüğü sıradır).
// 2. UPDATE_NOTES_VERSION'ı değiştir (örn. bir sonraki tarihe/numaraya).
// Sadece 2. adım, daha önce pop-up'ı kapatmış kullanıcılara TEKRAR
// gösterilmesini sağlar — versiyon değişmezse pop-up bir daha çıkmaz.
export const UPDATE_NOTES_VERSION = "2026-09-02-v1";

export const UPDATE_NOTES: UpdateNote[] = [
  {
    icon: "palette",
    title: "Amblem galerisi genişledi",
    description:
      "Profilinden seçebileceğin 8 yeni kalkan tasarımı eklendi — toplamda artık 20 amblem arasından seçim yapabilirsin.",
  },
  {
    icon: "clock",
    title: "Transfer penceresi kuralı netleşti",
    description:
      "Transfer penceresi artık haftanın ilk 4 büyük maçından 3 saat öncesine kadar açık kalıyor, o noktada otomatik kapanıyor.",
  },
  {
    icon: "refresh",
    title: "Güncel transferler işlendi",
    description:
      "4 büyüklerin son transferleri kadrolara işlendi — oyuncu seçerken en güncel liste karşına çıkıyor.",
  },
  {
    icon: "palette",
    title: "Takımını kişiselleştir",
    description:
      "Profil sayfasından takım renklerini, amblemini ve sloganını seçebilirsin — kadron ve lig sıralaması artık sana özel görünüyor.",
  },
  {
    icon: "bell",
    title: "Bildirimler geldi",
    description:
      'Transfer penceresi açılmadan ve kapanmadan önce artık bildirim alabilirsin. Bildirimleri almak için uygulamayı yükle, sonra hamburger menüden "Bildirimleri Aç"a dokun.',
  },
  {
    icon: "calendar",
    title: "Bu hafta kimler oynuyor",
    description:
      "Kadro sayfasının altında artık 4 büyüklerin bu haftaki rakiplerini, tarih ve saatiyle otomatik görebilirsin.",
  },
  {
    icon: "refresh",
    title: "Transferler güncellendi",
    description:
      "4 büyüklerin son transferleri kadrolara işlendi — oyuncu seçerken en güncel liste karşına çıkıyor.",
  },
];
