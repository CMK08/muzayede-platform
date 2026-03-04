"use client";

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <h1 className="mb-8 text-3xl font-bold">Kullanım Şartları</h1>
      <div className="prose prose-gray max-w-none space-y-6">
        <p className="text-gray-600">
          Son güncelleme: 1 Ocak 2026
        </p>

        <h2 className="text-xl font-semibold">1. Genel Hükümler</h2>
        <p>
          Bu kullanım şartları, Müzayede Platform A.Ş. (&quot;Platform&quot;) tarafından sunulan
          dijital müzayede hizmetlerinin kullanımını düzenler. Platformu kullanarak bu şartları
          kabul etmiş sayılırsınız.
        </p>

        <h2 className="text-xl font-semibold">2. Üyelik</h2>
        <ul className="list-disc pl-6 space-y-2">
          <li>Üyelik için 18 yaşını doldurmuş olmak zorunludur</li>
          <li>Doğru ve güncel bilgiler sağlamak üyenin sorumluluğundadır</li>
          <li>Hesap güvenliği üyenin sorumluluğundadır</li>
          <li>Her kişi yalnızca bir hesap açabilir</li>
        </ul>

        <h2 className="text-xl font-semibold">3. Müzayede Kuralları</h2>
        <ul className="list-disc pl-6 space-y-2">
          <li>Verilen teklifler bağlayıcıdır ve geri alınamaz</li>
          <li>Shill bidding (yapay teklif verme) kesinlikle yasaktır</li>
          <li>Müzayede sonucunda kazanan, ödeme yükümlülüğünü yerine getirmek zorundadır</li>
          <li>Platform, şüpheli aktivitelerde hesabı askıya alma hakkını saklı tutar</li>
          <li>Reserve fiyata ulaşılmayan müzayedelerde satış gerçekleşmeyebilir</li>
        </ul>

        <h2 className="text-xl font-semibold">4. Ödeme ve Komisyon</h2>
        <ul className="list-disc pl-6 space-y-2">
          <li>Alıcı komisyonu, son teklif fiyatı üzerinden hesaplanır</li>
          <li>Ödeme, müzayede bitiminden itibaren 3 iş günü içinde yapılmalıdır</li>
          <li>Gecikmeli ödemelerde gecikme bedeli uygulanabilir</li>
          <li>İade koşulları, ürün açıklamasıyla uyumsuzluk durumlarıyla sınırlıdır</li>
        </ul>

        <h2 className="text-xl font-semibold">5. Ürün Sorumluluğu</h2>
        <p>
          Satıcılar, sundukları ürünlerin doğru tanımlanmasından ve orijinalliğinden
          sorumludur. Platform, ürünlerin doğruluğu konusunda aracı konumundadır.
        </p>

        <h2 className="text-xl font-semibold">6. Fikri Mülkiyet</h2>
        <p>
          Platformdaki tüm içerik, tasarım ve yazılım Müzayede Platform A.Ş.&apos;nin
          mülkiyetindedir. İzinsiz kullanım yasaktır.
        </p>

        <h2 className="text-xl font-semibold">7. Sorumluluk Sınırı</h2>
        <p>
          Platform, teknik aksaklıklar, üçüncü taraf hizmet kesintileri veya mücbir sebepler
          nedeniyle oluşabilecek zararlardan sorumlu tutulamaz.
        </p>

        <h2 className="text-xl font-semibold">8. İletişim</h2>
        <p>
          Kullanım şartları hakkında sorularınız için{" "}
          <a href="mailto:hukuk@muzayede.com" className="text-blue-600 hover:underline">
            hukuk@muzayede.com
          </a>{" "}
          adresine ulaşabilirsiniz.
        </p>
      </div>
    </div>
  );
}
