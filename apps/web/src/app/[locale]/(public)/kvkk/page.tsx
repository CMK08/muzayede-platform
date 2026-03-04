"use client";

export default function KVKKPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <h1 className="mb-8 text-3xl font-bold">KVKK Aydınlatma Metni</h1>
      <div className="prose prose-gray max-w-none space-y-6">
        <p className="text-gray-600">
          Son güncelleme: 1 Ocak 2026
        </p>

        <h2 className="text-xl font-semibold">1. Veri Sorumlusu</h2>
        <p>
          Müzayede Platform A.Ş. (&quot;Şirket&quot;) olarak, 6698 sayılı Kişisel Verilerin Korunması
          Kanunu (&quot;KVKK&quot;) kapsamında veri sorumlusu sıfatıyla kişisel verilerinizi
          işlemekteyiz.
        </p>

        <h2 className="text-xl font-semibold">2. İşlenen Kişisel Veriler</h2>
        <ul className="list-disc pl-6 space-y-2">
          <li><strong>Kimlik bilgileri:</strong> Ad, soyad, T.C. kimlik numarası</li>
          <li><strong>İletişim bilgileri:</strong> E-posta adresi, telefon numarası, adres</li>
          <li><strong>Finansal bilgiler:</strong> Banka hesap bilgileri, ödeme bilgileri</li>
          <li><strong>İşlem bilgileri:</strong> Teklif geçmişi, satın alma geçmişi</li>
          <li><strong>Dijital iz bilgileri:</strong> IP adresi, çerez verileri, cihaz bilgileri</li>
        </ul>

        <h2 className="text-xl font-semibold">3. Kişisel Verilerin İşlenme Amaçları</h2>
        <ul className="list-disc pl-6 space-y-2">
          <li>Üyelik kaydı ve hesap yönetimi</li>
          <li>Müzayede hizmetlerinin sunulması</li>
          <li>Ödeme işlemlerinin gerçekleştirilmesi</li>
          <li>Yasal yükümlülüklerin yerine getirilmesi</li>
          <li>Müşteri ilişkileri yönetimi</li>
          <li>Hizmet kalitesinin artırılması</li>
        </ul>

        <h2 className="text-xl font-semibold">4. Kişisel Verilerin Aktarılması</h2>
        <p>
          Kişisel verileriniz, yasal yükümlülüklerimiz çerçevesinde yetkili kamu kurum ve
          kuruluşlarına, ödeme hizmet sağlayıcılarına ve kargo firmalarına aktarılabilmektedir.
        </p>

        <h2 className="text-xl font-semibold">5. Haklarınız</h2>
        <p>KVKK&apos;nın 11. maddesi uyarınca aşağıdaki haklara sahipsiniz:</p>
        <ul className="list-disc pl-6 space-y-2">
          <li>Kişisel verilerinizin işlenip işlenmediğini öğrenme</li>
          <li>İşlenmişse buna ilişkin bilgi talep etme</li>
          <li>İşlenme amacını ve bunların amacına uygun kullanılıp kullanılmadığını öğrenme</li>
          <li>Yurt içinde veya yurt dışında aktarıldığı üçüncü kişileri bilme</li>
          <li>Eksik veya yanlış işlenmişse düzeltilmesini isteme</li>
          <li>Silinmesini veya yok edilmesini isteme</li>
        </ul>

        <h2 className="text-xl font-semibold">6. İletişim</h2>
        <p>
          KVKK kapsamındaki haklarınızı kullanmak için{" "}
          <a href="mailto:kvkk@muzayede.com" className="text-blue-600 hover:underline">
            kvkk@muzayede.com
          </a>{" "}
          adresine başvurabilirsiniz.
        </p>
      </div>
    </div>
  );
}
