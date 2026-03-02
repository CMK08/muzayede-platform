'use client';

import { useState, useEffect } from 'react';
import { HelpCircle, ChevronDown, Search } from 'lucide-react';

interface FaqItem {
  id: string;
  question: string;
  answer: string;
  category: string;
}

interface FaqGroup {
  category: string;
  count: number;
  items: FaqItem[];
}

export default function FaqPage() {
  const [groups, setGroups] = useState<FaqGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [openItems, setOpenItems] = useState<Set<string>>(new Set());

  useEffect(() => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
    fetch(`${apiUrl}/faq/grouped`)
      .then((r) => r.json())
      .then((data) => setGroups(data.data || data || []))
      .catch(() => {
        setGroups([
          {
            category: 'Genel',
            count: 3,
            items: [
              { id: '1', question: 'Müzayede platformu nedir?', answer: 'Müzayede platformumuz, sanat eserleri, antikalar ve koleksiyon parçalarının çevrimiçi olarak açık artırma yoluyla satışa sunulduğu güvenilir bir dijital platformdur.', category: 'Genel' },
              { id: '2', question: 'Nasıl üye olabilirim?', answer: 'Ana sayfadaki "Kayıt Ol" butonuna tıklayarak e-posta veya telefon numaranızla kolayca kayıt olabilirsiniz. KYC (Kimlik doğrulama) sonrası teklif vermeye başlayabilirsiniz.', category: 'Genel' },
              { id: '3', question: 'Platform güvenli mi?', answer: 'Platformumuz SSL/TLS şifreleme, 2FA (İki faktörlü doğrulama), KYC doğrulaması ve escrow (emanet) ödeme sistemi ile korunmaktadır. Tüm işlemler KVKK uyumludur.', category: 'Genel' },
            ],
          },
          {
            category: 'Teklif Verme',
            count: 3,
            items: [
              { id: '4', question: 'Nasıl teklif verebilirim?', answer: 'Hesabınıza giriş yaptıktan sonra müzayede detay sayfasında "Teklif Ver" butonuna tıklayarak teklif verebilirsiniz. Minimum artırım miktarını geçen bir teklif girmeniz gerekmektedir.', category: 'Teklif Verme' },
              { id: '5', question: 'Otomatik teklif (proxy bidding) nedir?', answer: 'Otomatik teklif sistemi, belirlediğiniz maksimum tutara kadar sizin adınıza otomatik olarak teklif verir. Böylece müzayedeyi sürekli takip etmek zorunda kalmazsınız.', category: 'Teklif Verme' },
              { id: '6', question: 'Teklifimi geri çekebilir miyim?', answer: 'Teklifler genel olarak bağlayıcıdır. Ancak istisnai durumlarda müzayede yöneticisine başvurarak teklif geri çekme talebinde bulunabilirsiniz.', category: 'Teklif Verme' },
            ],
          },
          {
            category: 'Ödeme',
            count: 2,
            items: [
              { id: '7', question: 'Hangi ödeme yöntemlerini kabul ediyorsunuz?', answer: 'Kredi kartı (taksitli), banka havalesi/EFT ve escrow (emanet) ödeme yöntemlerini kabul ediyoruz. iyzico güvenli ödeme altyapısı kullanılmaktadır.', category: 'Ödeme' },
              { id: '8', question: 'Komisyon oranları nedir?', answer: 'Standart alıcı komisyonu %15, satıcı komisyonu %10\'dur. Özel müzayedelerde farklı oranlar uygulanabilir.', category: 'Ödeme' },
            ],
          },
          {
            category: 'Kargo & Teslimat',
            count: 2,
            items: [
              { id: '9', question: 'Kargo nasıl yapılır?', answer: 'Ödeme sonrası satıcı tarafından kargo etiketi oluşturulur. UPS standart kargo, sigortalı kargo ve değerli eserler için beyaz eldiven kargo seçenekleri mevcuttur.', category: 'Kargo & Teslimat' },
              { id: '10', question: 'Kargo takibi yapabilir miyim?', answer: 'Evet, "Siparişlerim" sayfasından gerçek zamanlı kargo takibi yapabilirsiniz. Teslimat durumu hakkında otomatik bildirimler gönderilir.', category: 'Kargo & Teslimat' },
            ],
          },
        ]);
      })
      .finally(() => setLoading(false));
  }, []);

  function toggleItem(id: string) {
    setOpenItems((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const filteredGroups = groups
    .filter((g) => activeCategory === 'all' || g.category === activeCategory)
    .map((g) => ({
      ...g,
      items: g.items.filter(
        (item) =>
          !search ||
          item.question.toLowerCase().includes(search.toLowerCase()) ||
          item.answer.toLowerCase().includes(search.toLowerCase()),
      ),
    }))
    .filter((g) => g.items.length > 0);

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="text-center mb-10">
        <HelpCircle className="w-12 h-12 text-blue-600 mx-auto mb-4" />
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Sıkça Sorulan Sorular</h1>
        <p className="text-gray-500">Merak ettiğiniz her şeyin cevabı burada</p>
      </div>

      {/* Search */}
      <div className="relative max-w-xl mx-auto mb-8">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Sorularda ara..."
          className="w-full pl-12 pr-4 py-3 border-2 rounded-xl focus:border-blue-500 focus:outline-none transition"
        />
      </div>

      {/* Category Tabs */}
      <div className="flex gap-2 flex-wrap justify-center mb-8">
        <button
          onClick={() => setActiveCategory('all')}
          className={`px-4 py-2 rounded-full text-sm font-medium transition ${
            activeCategory === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Tümü
        </button>
        {groups.map((g) => (
          <button
            key={g.category}
            onClick={() => setActiveCategory(g.category)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition ${
              activeCategory === g.category
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {g.category} ({g.count})
          </button>
        ))}
      </div>

      {/* FAQ Accordion */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="animate-pulse bg-gray-200 rounded-xl h-14" />
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          {filteredGroups.map((group) => (
            <div key={group.category}>
              <h2 className="text-lg font-bold text-gray-800 mb-3">{group.category}</h2>
              <div className="space-y-2">
                {group.items.map((item) => (
                  <div key={item.id} className="bg-white border rounded-xl overflow-hidden">
                    <button
                      onClick={() => toggleItem(item.id)}
                      className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-50 transition"
                    >
                      <span className="font-medium text-gray-800 pr-4">{item.question}</span>
                      <ChevronDown
                        className={`w-5 h-5 text-gray-400 flex-shrink-0 transition-transform ${
                          openItems.has(item.id) ? 'rotate-180' : ''
                        }`}
                      />
                    </button>
                    {openItems.has(item.id) && (
                      <div className="px-5 pb-4 text-gray-600 text-sm leading-relaxed border-t pt-3">
                        {item.answer}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}

          {filteredGroups.length === 0 && (
            <div className="text-center py-12">
              <HelpCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">Aramanızla eşleşen soru bulunamadı.</p>
            </div>
          )}
        </div>
      )}

      {/* Contact CTA */}
      <div className="mt-12 text-center bg-gray-50 rounded-xl p-8">
        <h3 className="text-lg font-bold text-gray-900 mb-2">Aradığınızı bulamadınız mı?</h3>
        <p className="text-gray-500 text-sm mb-4">
          Destek ekibimiz size yardımcı olmaktan mutluluk duyar.
        </p>
        <a
          href="mailto:destek@muzayede.com"
          className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded-lg transition"
        >
          Bize Ulaşın
        </a>
      </div>
    </div>
  );
}
