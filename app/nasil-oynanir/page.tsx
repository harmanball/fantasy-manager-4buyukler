import { AppHeader } from "@/components/AppHeader";
import { PageHeader } from "@/components/PageHeader";

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="font-display text-base font-semibold text-charcoal sm:text-lg">
        {title}
      </h2>
      <div className="flex flex-col gap-1.5 text-sm leading-relaxed text-foreground/80">
        {children}
      </div>
    </section>
  );
}

function Bul({ children }: { children: React.ReactNode }) {
  return (
    <p className="flex gap-2">
      <span className="text-gold">•</span>
      <span>{children}</span>
    </p>
  );
}

const SCORING_ROWS: [string, string, string, string, string][] = [
  ["Maça çıkma (60 dk altı)", "+1", "+1", "+1", "+1"],
  ["60 dakika ve üzeri oynama", "+2", "+2", "+2", "+2"],
  ["Gol", "+6", "+6", "+5", "+4"],
  ["Asist", "+3", "+3", "+3", "+3"],
  ["Gol yememe (60+ dk, temiz kale)", "+4", "+4", "+1", "—"],
  ["Maç puanı 8,0 ve üzeri", "+2", "+2", "+2", "+2"],
  ["Penaltı kaçırma", "-2", "-2", "-2", "-2"],
  ["Sarı kart", "-1", "-1", "-1", "-1"],
  ["Kırmızı kart", "-3", "-3", "-3", "-3"],
  ["Kendi kalesine gol", "-2", "-2", "-2", "-2"],
];

export default function NasilOynanirPage() {
  return (
    <>
      <AppHeader />
      <main className="mx-auto max-w-2xl px-4 py-8 sm:px-6 sm:py-10">
      <div className="flex flex-col gap-8 rounded-xl bg-background p-4 sm:p-6">
        <PageHeader icon="info" title="Nasıl Oynanır?" />

        <Section title="Kadro Kurma">
        <Bul>
          Oyuncu havuzu yalnızca Galatasaray, Fenerbahçe, Beşiktaş ve
          Trabzonspor kadrolarından oluşur.
        </Bul>
        <Bul>Kadro doğrudan <strong>11 oyuncudan</strong> oluşur, yedek yoktur.</Bul>
        <Bul>Kadro yapısı: 1 kaleci + seçilen dizilişe uygun 10 saha oyuncusu.</Bul>
        <Bul>
          Bir kadroda aynı takımdan <strong>en fazla 3 oyuncu</strong>{" "}
          bulunabilir — bu kural dört takımın dördünü de kullanmayı zorunlu
          kılar.
        </Bul>
        <Bul>
          <strong>Bütçe ve oyuncu fiyatı yoktur.</strong> Parasal hiçbir koşul
          bulunmaz, kadronu tamamen serbestçe kurarsın.
        </Bul>
        <Bul>
          Geçerli dizilişler: 4-4-2, 4-5-1, 4-3-3, 3-4-3, 3-5-2, 5-4-1, 5-3-2.
        </Bul>
      </Section>

      <Section title="Kaptanlık">
        <Bul>Kaptan seçtiğin oyuncu o hafta <strong>çift puan (×2)</strong> kazanır.</Bul>
        <Bul>
          Kaptanın o hafta hiç oynamaması durumunda çarpan uygulanmaz, sadece
          taban puan geçerli olur.
        </Bul>
      </Section>

      <Section title="Hafta ve Değişiklik Penceresi">
        <Bul>
          Kadro, diziliş, kaptan ve transfer değişiklikleri yalnızca{" "}
          <strong>Salı–Çarşamba–Perşembe</strong> günleri yapılabilir. Bu
          günler içinde <strong>sınırsız</strong> kez kaydedebilirsin.
        </Bul>
        <Bul>
          Kadro, her durumda o haftanın ilk 4-büyük maçının başlama saatinde
          kesin olarak kilitlenir.
        </Bul>
        <Bul>
          Pencere dışında (örneğin Cumartesi) siteye giren bir kullanıcı o
          hafta için değişiklik yapamaz — kadro sayfası bunu bildirir, ama
          isteğe bağlı olarak bir sonraki hafta için düzenleme yapmaya devam
          edebilir.
        </Bul>
        <Bul>Yalnızca Süper Lig maçları puanlanır.</Bul>
      </Section>

      <Section title="Oyuncu Puanlama Tablosu">
        <div className="overflow-x-auto rounded-lg border border-charcoal/10">
          <table className="w-full min-w-[520px] text-xs sm:text-sm">
            <thead className="bg-background">
              <tr>
                <th className="p-2 text-left font-semibold">Olay</th>
                <th className="p-2 text-right font-semibold">Kaleci</th>
                <th className="p-2 text-right font-semibold">Defans</th>
                <th className="p-2 text-right font-semibold">Orta Saha</th>
                <th className="p-2 text-right font-semibold">Santrfor</th>
              </tr>
            </thead>
            <tbody>
              {SCORING_ROWS.map((row, i) => (
                <tr
                  key={row[0]}
                  className={i % 2 === 0 ? "bg-white" : "bg-background/60"}
                >
                  <td className="p-2">{row[0]}</td>
                  <td className="p-2 text-right">{row[1]}</td>
                  <td className="p-2 text-right">{row[2]}</td>
                  <td className="p-2 text-right">{row[3]}</td>
                  <td className="p-2 text-right">{row[4]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="Maçın Yıldızı Bonusu">
        <Bul>
          Her maçın <strong>Maçın Yıldızı</strong>, FotMob&apos;un
          &quot;Maçın adamı&quot; seçimidir — tamamen kaynak kullanılır.
        </Bul>
        <Bul>Maçın Yıldızı seçilen oyuncunun puanı <strong>×2</strong> ile çarpılır.</Bul>
        <Bul>
          Aynı oyuncu hem kaptanın hem Maçın Yıldızı ise çarpanlar birleşir,
          puanı <strong>×4</strong> olur.
        </Bul>
      </Section>

      <Section title="Veri Kaynağı">
        <Bul>
          Tüm istatistikler (dakika, gol, asist, temiz kale, kart, maç puanı,
          Maçın Yıldızı){" "}
          <a
            href="https://www.fotmob.com"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-pitch underline underline-offset-2"
          >
            www.fotmob.com
          </a>{" "}
          referans alınır.
        </Bul>
      </Section>

      <Section title="Ligler ve Sıralama">
        <Bul>
          <strong>Genel Toplam:</strong> tüm haftaların birikimli puanına göre
          sıralama.
        </Bul>
        <Bul>
          <strong>Haftalık sıralama:</strong> istersen belirli bir haftayı
          seçip yalnızca o haftanın sonuçlarına göre sıralamayı görebilirsin.
        </Bul>
      </Section>

      <Section title="Sezon">
        <Bul>Oyun tam sezon boyunca sürer: 2026-27 Süper Lig sezonu, 34 hafta.</Bul>
      </Section>
      </div>
      </main>
    </>
  );
}
