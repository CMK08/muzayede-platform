"use client";

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <h1 className="mb-8 text-3xl font-bold">Gizlilik Politikası</h1>
      <div className="prose prose-gray max-w-none space-y-6">
        <p className="text-gray-600">
          Son güncelleme: 1 Ocak 2026
        </p>

        <h2 className="text-xl font-semibold">1. Giriş</h2>
        <p>
          Müzayede Platform A.Ş. olarak gizliliğinize önem veriyoruz. Bu politika, kişisel
          verilerinizin nasıl toplandığını, kullanıldığını ve korunduğunu açıklar.
        </p>

        <h2 className="text-xl font-semibold">2. Toplanan Bilgiler</h2>
        <p>
          Platformumuzu kullanırken aşağıdaki bilgiler toplanabilir:
        </p>
        <ul className="list-disc pl-6 space-y-2">
          <li>Kayıt sırasında sağlanan kişisel bilgiler</li>
          <li>İşlem ve ödeme bilgileri</li>
          <li>Otomatik olarak toplanan teknik veriler (IP, tarayıcı bilgisi vb.)</li>
          <li>Çerezler aracılığıyla toplanan kullanım verileri</li>
        </ul>

        <h2 className="text-xl font-semibold">3. Bilgilerin Kullanımı</h2>
        <p>
          Toplanan bilgiler hizmet sunumu, güvenlik, yasal uyum ve hizmet iyileştirme
          amacıyla kullanılır.
        </p>

        <h2 className="text-xl font-semibold">4. Veri Güvenliği</h2>
        <p>
          Verilerinizi korumak için endüstri standardı güvenlik önlemleri (SSL/TLS şifreleme,
          güvenlik duvarları, erişim kontrolü) uygulamaktayız.
        </p>

        <h2 className="text-xl font-semibold">5. İletişim</h2>
        <p>
          Gizlilik politikamız hakkında sorularınız için{" "}
          <a href="mailto:gizlilik@muzayede.com" className="text-blue-600 hover:underline">
            gizlilik@muzayede.com
          </a>{" "}
          adresine ulaşabilirsiniz.
        </p>
      </div>
    </div>
  );
}
