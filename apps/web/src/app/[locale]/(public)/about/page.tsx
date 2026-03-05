/**
 * Hakkimizda Sayfasi (About Page)
 *
 * Platform hakkinda genel bilgi sunan statik sayfa. Icerik olarak:
 * - Platform istatistikleri (uye sayisi, islem hacmi vb.)
 * - Misyon ve vizyon aciklamalari
 * - Platformun avantajlari ve ozellikleri
 * - Iletisim bilgileri (adres, telefon, e-posta)
 */
'use client';

import { Shield, Users, Globe, Award, Building, Phone, Mail, MapPin } from 'lucide-react';

export default function AboutPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      {/* Hero */}
      <div className="text-center mb-16">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">Hakkımızda</h1>
        <p className="text-lg text-gray-500 max-w-2xl mx-auto">
          Türkiye&apos;nin lider dijital müzayede platformu olarak sanat, antika ve koleksiyon
          dünyasını herkes için erişilebilir kılıyoruz.
        </p>
      </div>

      {/* Istatistikler - Platformun sayisal basarilari */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-16">
        {[
          { value: '50.000+', label: 'Kayıtlı Üye' },
          { value: '12.000+', label: 'Tamamlanan Müzayede' },
          { value: '₺500M+', label: 'İşlem Hacmi' },
          { value: '98%', label: 'Müşteri Memnuniyeti' },
        ].map((stat) => (
          <div key={stat.label} className="text-center p-6 bg-white rounded-xl border">
            <p className="text-3xl font-bold text-blue-600 mb-1">{stat.value}</p>
            <p className="text-sm text-gray-500">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Misyon ve Vizyon - Platformun amac ve hedeflerini aciklar */}
      <div className="grid md:grid-cols-2 gap-12 mb-16">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Misyonumuz</h2>
          <p className="text-gray-600 leading-relaxed mb-4">
            Sanat ve antika koleksiyonculuğunu dijitalleştirerek, güvenilir, şeffaf ve
            herkes için erişilebilir bir müzayede deneyimi sunmak. Geleneksel müzayede
            evlerinin prestijini, modern teknolojinin kolaylığıyla birleştiriyoruz.
          </p>
          <p className="text-gray-600 leading-relaxed">
            Blockchain tabanlı orijinallik sertifikaları, yapay zeka destekli değerleme
            araçları ve canlı yayın teknolojisiyle sektöre yenilik getiriyoruz.
          </p>
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Vizyonumuz</h2>
          <p className="text-gray-600 leading-relaxed mb-4">
            Bölgenin en büyük ve en güvenilir dijital müzayede ekosistemi olarak,
            sanat ve koleksiyon piyasasını dönüştürmek. Hem bireysel koleksiyonerlere
            hem de müzayede evlerine kapsamlı çözümler sunuyoruz.
          </p>
          <p className="text-gray-600 leading-relaxed">
            6 farklı müzayede türü, fraksiyonel sahiplik, NFT sertifikasyonu ve
            canlı müzayede yayını ile endüstrinin geleceğini şekillendiriyoruz.
          </p>
        </div>
      </div>

      {/* Ozellikler - Platformun sundugu avantajlar (guvenlik, dil destegi, blockchain vb.) */}
      <div className="mb-16">
        <h2 className="text-2xl font-bold text-gray-900 text-center mb-8">Neden Biz?</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { icon: Shield, title: 'Güvenli İşlemler', desc: 'Escrow ödeme sistemi, 2FA doğrulama ve KVKK uyumlu altyapı ile tam güvenlik.' },
            { icon: Globe, title: 'Çoklu Dil Desteği', desc: 'Türkçe, İngilizce ve Arapça dahil çoklu dil ve RTL desteği.' },
            { icon: Award, title: 'Blockchain Sertifika', desc: 'Her eser için değiştirilemez NFT orijinallik sertifikası ve sahiplik zinciri.' },
            { icon: Users, title: 'Geniş Topluluk', desc: '50.000+ koleksiyoner, yüzlerce satıcı ve onlarca müzayede evi.' },
            { icon: Building, title: 'Kurumsal Çözümler', desc: 'Müzayede evleri için özel panel, toplu ürün yükleme ve canlı yayın altyapısı.' },
            { icon: Phone, title: '7/24 Destek', desc: 'Uzman destek ekibimiz her zaman yanınızda. Canlı chat, telefon ve e-posta.' },
          ].map((feature) => (
            <div key={feature.title} className="bg-white rounded-xl border p-6">
              <feature.icon className="w-8 h-8 text-blue-600 mb-3" />
              <h3 className="font-semibold text-gray-900 mb-2">{feature.title}</h3>
              <p className="text-sm text-gray-500">{feature.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Iletisim - Adres, telefon ve e-posta bilgileri */}
      <div className="bg-gray-50 rounded-2xl p-8 md:p-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">İletişim</h2>
        <div className="grid md:grid-cols-3 gap-6">
          <div className="flex items-start gap-3">
            <MapPin className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <p className="font-medium text-gray-900">Adres</p>
              <p className="text-sm text-gray-500">Levent, Büyükdere Cad. No:185, 34394 Şişli/İstanbul</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Phone className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <p className="font-medium text-gray-900">Telefon</p>
              <p className="text-sm text-gray-500">+90 (212) 555 00 00</p>
              <p className="text-sm text-gray-500">Pazartesi - Cuma, 09:00 - 18:00</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Mail className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <p className="font-medium text-gray-900">E-posta</p>
              <p className="text-sm text-gray-500">info@muzayede.com</p>
              <p className="text-sm text-gray-500">destek@muzayede.com</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
