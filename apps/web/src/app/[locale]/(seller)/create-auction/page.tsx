'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Gavel,
  ArrowLeft,
  Calendar,
  DollarSign,
  Shield,
  Save,
} from 'lucide-react';
import api, { apiRoutes } from '@/lib/api';

interface Product {
  id: string;
  title: string;
  estimateLow: number;
  estimateHigh: number;
}

const AUCTION_TYPES = [
  { value: 'ENGLISH', label: 'İngiliz Usulü', desc: 'Fiyat yukarı doğru, en yüksek teklif kazanır' },
  { value: 'DUTCH', label: 'Hollanda Usulü', desc: 'Fiyat düşer, ilk teklif veren kazanır' },
  { value: 'SEALED_BID', label: 'Kapalı Zarf', desc: 'Gizli teklifler, açılışta kazanan belirlenir' },
  { value: 'VICKREY', label: 'Vickrey', desc: 'Kapalı zarf, ikinci en yüksek fiyat ödenir' },
  { value: 'TIMED', label: 'Zamanlı Online', desc: 'Belirli süre içinde otomatik teklif toplama' },
  { value: 'HYBRID', label: 'Hibrit', desc: 'Online ön pey + salon bitirme' },
];

export default function CreateAuctionPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedLots, setSelectedLots] = useState<string[]>([]);

  const [form, setForm] = useState({
    title: '',
    description: '',
    type: 'ENGLISH',
    startPrice: '',
    reservePrice: '',
    minIncrement: '',
    buyerCommissionRate: '15',
    sellerCommissionRate: '10',
    startDate: '',
    startTime: '14:00',
    endDate: '',
    endTime: '20:00',
    antiSnipeMinutes: '5',
    antiSnipeExtension: '3',
    currency: 'TRY',
    allowProxy: true,
    allowAbsentee: true,
  });

  useEffect(() => {
    api.get(`${apiRoutes.seller.products}?limit=100`)
      .then(({ data }) => setProducts(data.data || []))
      .catch(() => {});
  }, []);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      setForm({ ...form, [name]: (e.target as HTMLInputElement).checked });
    } else {
      setForm({ ...form, [name]: value });
    }
  }

  function toggleLot(productId: string) {
    setSelectedLots((prev) =>
      prev.includes(productId)
        ? prev.filter((id) => id !== productId)
        : [...prev, productId],
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const startDateTime = new Date(`${form.startDate}T${form.startTime}`);
      const endDateTime = new Date(`${form.endDate}T${form.endTime}`);

      await api.post(apiRoutes.auctions.create, {
        title: form.title,
        description: form.description,
        type: form.type,
        startPrice: Number(form.startPrice),
        reservePrice: form.reservePrice ? Number(form.reservePrice) : null,
        minIncrement: Number(form.minIncrement),
        buyerCommissionRate: Number(form.buyerCommissionRate),
        sellerCommissionRate: Number(form.sellerCommissionRate),
        startDate: startDateTime.toISOString(),
        endDate: endDateTime.toISOString(),
        antiSnipeMinutes: Number(form.antiSnipeMinutes),
        antiSnipeExtension: Number(form.antiSnipeExtension),
        currency: form.currency,
        allowProxy: form.allowProxy,
        allowAbsentee: form.allowAbsentee,
        lotProductIds: selectedLots,
      });

      router.push('/my-auctions');
    } catch {
      // handle error
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <button
        onClick={() => router.back()}
        className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-6"
      >
        <ArrowLeft className="w-4 h-4" /> Geri
      </button>

      <div className="flex items-center gap-3 mb-8">
        <div className="w-12 h-12 rounded-lg bg-purple-50 flex items-center justify-center">
          <Gavel className="w-6 h-6 text-purple-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Yeni Müzayede Oluştur</h1>
          <p className="text-gray-500 text-sm">Müzayede bilgilerini doldurun ve lotlarınızı ekleyin</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Basic Info */}
        <div className="bg-white rounded-xl border p-6 space-y-4">
          <h2 className="font-semibold text-lg">Müzayede Bilgileri</h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Müzayede Başlığı *</label>
            <input
              name="title"
              value={form.title}
              onChange={handleChange}
              required
              className="w-full border rounded-lg px-4 py-2.5 focus:border-blue-500 focus:outline-none"
              placeholder="Örn: Osmanlı Sanatı Koleksiyonu - Mart 2026"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Açıklama</label>
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              rows={3}
              className="w-full border rounded-lg px-4 py-2.5 focus:border-blue-500 focus:outline-none"
              placeholder="Müzayede hakkında bilgi..."
            />
          </div>

          {/* Auction Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Müzayede Türü *</label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {AUCTION_TYPES.map((t) => (
                <label
                  key={t.value}
                  className={`flex flex-col p-3 border rounded-lg cursor-pointer transition ${
                    form.type === t.value
                      ? 'border-purple-500 bg-purple-50'
                      : 'hover:border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="type"
                    value={t.value}
                    checked={form.type === t.value}
                    onChange={handleChange}
                    className="sr-only"
                  />
                  <span className="font-medium text-sm">{t.label}</span>
                  <span className="text-xs text-gray-500 mt-0.5">{t.desc}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Pricing */}
        <div className="bg-white rounded-xl border p-6 space-y-4">
          <h2 className="font-semibold text-lg flex items-center gap-2">
            <DollarSign className="w-5 h-5" /> Fiyatlandırma
          </h2>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Başlangıç Fiyatı (₺) *</label>
              <input name="startPrice" value={form.startPrice} onChange={handleChange} required type="number" className="w-full border rounded-lg px-4 py-2.5 focus:border-blue-500 focus:outline-none" placeholder="1000" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Reserve Fiyat (₺)</label>
              <input name="reservePrice" value={form.reservePrice} onChange={handleChange} type="number" className="w-full border rounded-lg px-4 py-2.5 focus:border-blue-500 focus:outline-none" placeholder="5000" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Minimum Artırım (₺) *</label>
              <input name="minIncrement" value={form.minIncrement} onChange={handleChange} required type="number" className="w-full border rounded-lg px-4 py-2.5 focus:border-blue-500 focus:outline-none" placeholder="100" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Alıcı Komisyonu (%)</label>
              <input name="buyerCommissionRate" value={form.buyerCommissionRate} onChange={handleChange} type="number" step="0.5" className="w-full border rounded-lg px-4 py-2.5 focus:border-blue-500 focus:outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Satıcı Komisyonu (%)</label>
              <input name="sellerCommissionRate" value={form.sellerCommissionRate} onChange={handleChange} type="number" step="0.5" className="w-full border rounded-lg px-4 py-2.5 focus:border-blue-500 focus:outline-none" />
            </div>
          </div>
        </div>

        {/* Schedule */}
        <div className="bg-white rounded-xl border p-6 space-y-4">
          <h2 className="font-semibold text-lg flex items-center gap-2">
            <Calendar className="w-5 h-5" /> Zamanlama
          </h2>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Başlangıç Tarihi *</label>
              <input name="startDate" value={form.startDate} onChange={handleChange} required type="date" className="w-full border rounded-lg px-4 py-2.5" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Başlangıç Saati *</label>
              <input name="startTime" value={form.startTime} onChange={handleChange} required type="time" className="w-full border rounded-lg px-4 py-2.5" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Bitiş Tarihi *</label>
              <input name="endDate" value={form.endDate} onChange={handleChange} required type="date" className="w-full border rounded-lg px-4 py-2.5" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Bitiş Saati *</label>
              <input name="endTime" value={form.endTime} onChange={handleChange} required type="time" className="w-full border rounded-lg px-4 py-2.5" />
            </div>
          </div>

          {/* Anti-snipe */}
          <div className="bg-yellow-50 rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-2 text-yellow-700 font-medium text-sm">
              <Shield className="w-4 h-4" /> Anti-Snipe Koruması
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-yellow-600 mb-1">Son dakika süresi (dk)</label>
                <input name="antiSnipeMinutes" value={form.antiSnipeMinutes} onChange={handleChange} type="number" className="w-full border rounded px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs text-yellow-600 mb-1">Uzatma süresi (dk)</label>
                <input name="antiSnipeExtension" value={form.antiSnipeExtension} onChange={handleChange} type="number" className="w-full border rounded px-3 py-2 text-sm" />
              </div>
            </div>
          </div>

          <div className="flex gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" name="allowProxy" checked={form.allowProxy} onChange={handleChange} />
              <span className="text-sm text-gray-700">Otomatik Teklif (Proxy)</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" name="allowAbsentee" checked={form.allowAbsentee} onChange={handleChange} />
              <span className="text-sm text-gray-700">Yokluk Teklifi</span>
            </label>
          </div>
        </div>

        {/* Lot Selection */}
        <div className="bg-white rounded-xl border p-6">
          <h2 className="font-semibold text-lg mb-4">Lot Seçimi</h2>
          <p className="text-sm text-gray-500 mb-4">
            Müzayedeye eklenecek ürünleri seçin. Seçili: <strong>{selectedLots.length}</strong>
          </p>

          {products.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-72 overflow-y-auto">
              {products.map((p) => (
                <label
                  key={p.id}
                  className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition ${
                    selectedLots.includes(p.id)
                      ? 'border-purple-500 bg-purple-50'
                      : 'hover:border-gray-300'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedLots.includes(p.id)}
                    onChange={() => toggleLot(p.id)}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-700 truncate">{p.title}</p>
                    <p className="text-xs text-gray-400">
                      ₺{p.estimateLow?.toLocaleString()} - ₺{p.estimateHigh?.toLocaleString()}
                    </p>
                  </div>
                </label>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-400 mb-3">Henüz ürün eklenmemiş</p>
              <button
                type="button"
                onClick={() => router.push('/create-product')}
                className="text-blue-600 hover:underline text-sm font-medium"
              >
                Önce ürün ekleyin
              </button>
            </div>
          )}
        </div>

        {/* Submit */}
        <div className="flex gap-4">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex-1 border text-gray-700 font-medium py-3 rounded-lg hover:bg-gray-50 transition"
          >
            İptal
          </button>
          <button
            type="submit"
            disabled={loading || selectedLots.length === 0}
            className="flex-1 flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-300 text-white font-bold py-3 rounded-lg transition"
          >
            <Save className="w-5 h-5" />
            {loading ? 'Oluşturuluyor...' : 'Müzayede Oluştur'}
          </button>
        </div>
      </form>
    </div>
  );
}
