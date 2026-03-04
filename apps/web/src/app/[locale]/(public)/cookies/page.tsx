"use client";

export default function CookiesPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <h1 className="mb-8 text-3xl font-bold">Çerez Politikası</h1>
      <div className="prose prose-gray max-w-none space-y-6">
        <p className="text-gray-600">
          Son güncelleme: 1 Ocak 2026
        </p>

        <h2 className="text-xl font-semibold">1. Çerez Nedir?</h2>
        <p>
          Çerezler, web sitemizi ziyaret ettiğinizde tarayıcınız aracılığıyla cihazınıza
          yerleştirilen küçük metin dosyalarıdır. Bu dosyalar, sizi tanımamıza ve tercihlerinizi
          hatırlamamıza yardımcı olur.
        </p>

        <h2 className="text-xl font-semibold">2. Kullandığımız Çerez Türleri</h2>

        <h3 className="text-lg font-medium">Zorunlu Çerezler</h3>
        <p>
          Web sitesinin düzgün çalışması için gerekli olan çerezlerdir. Oturum yönetimi ve
          güvenlik amacıyla kullanılır.
        </p>

        <h3 className="text-lg font-medium">İşlevsel Çerezler</h3>
        <p>
          Dil tercihi, tema seçimi gibi kişiselleştirme ayarlarınızı hatırlamak için kullanılır.
        </p>

        <h3 className="text-lg font-medium">Analitik Çerezler</h3>
        <p>
          Web sitesi kullanımını analiz etmek ve hizmet kalitesini artırmak amacıyla kullanılır.
        </p>

        <h3 className="text-lg font-medium">Pazarlama Çerezleri</h3>
        <p>
          İlgi alanlarınıza uygun içerik ve reklamlar sunmak için kullanılır.
        </p>

        <h2 className="text-xl font-semibold">3. Çerezleri Yönetme</h2>
        <p>
          Tarayıcı ayarlarınızdan çerezleri devre dışı bırakabilir veya silebilirsiniz. Ancak
          zorunlu çerezlerin devre dışı bırakılması, web sitesinin bazı özelliklerinin düzgün
          çalışmamasına neden olabilir.
        </p>

        <h2 className="text-xl font-semibold">4. İletişim</h2>
        <p>
          Çerez politikamız hakkında sorularınız için{" "}
          <a href="mailto:info@muzayede.com" className="text-blue-600 hover:underline">
            info@muzayede.com
          </a>{" "}
          adresine ulaşabilirsiniz.
        </p>
      </div>
    </div>
  );
}
