'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Package,
  Upload,
  X,
  ArrowLeft,
  Save,
} from 'lucide-react';
import api, { apiRoutes } from '@/lib/api';

export default function CreateProductPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [images, setImages] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);

  const [form, setForm] = useState({
    title: '',
    shortDescription: '',
    descriptionHtml: '',
    categoryId: '',
    condition: 'USED',
    estimateLow: '',
    estimateHigh: '',
    provenanceText: '',
    artistName: '',
    year: '',
    medium: '',
    dimensions: '',
    weight: '',
    material: '',
    origin: '',
    signed: false,
    certificateAvailable: false,
  });

  const categories = [
    { id: 'cat-1', name: 'Tablolar' },
    { id: 'cat-2', name: 'Heykeller' },
    { id: 'cat-3', name: 'Antika Mobilya' },
    { id: 'cat-4', name: 'Mücevher' },
    { id: 'cat-5', name: 'Saatler' },
    { id: 'cat-6', name: 'Seramik' },
    { id: 'cat-7', name: 'Halı & Kilim' },
    { id: 'cat-8', name: 'Koleksiyon' },
  ];

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      setForm({ ...form, [name]: (e.target as HTMLInputElement).checked });
    } else {
      setForm({ ...form, [name]: value });
    }
  }

  function handleImages(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    setImages((prev) => [...prev, ...files]);
    const newPreviews = files.map((f) => URL.createObjectURL(f));
    setPreviews((prev) => [...prev, ...newPreviews]);
  }

  function removeImage(idx: number) {
    setImages((prev) => prev.filter((_, i) => i !== idx));
    setPreviews((prev) => prev.filter((_, i) => i !== idx));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        ...form,
        estimateLow: Number(form.estimateLow),
        estimateHigh: Number(form.estimateHigh),
        attributes: [
          form.year && { key: 'Yıl', value: form.year },
          form.medium && { key: 'Teknik', value: form.medium },
          form.dimensions && { key: 'Boyut', value: form.dimensions },
          form.weight && { key: 'Ağırlık', value: form.weight },
          form.material && { key: 'Malzeme', value: form.material },
          form.origin && { key: 'Menşe', value: form.origin },
        ].filter(Boolean),
      };

      const { data } = await api.post(apiRoutes.products.create, payload);

      if (images.length > 0 && data.data?.id) {
        const formData = new FormData();
        images.forEach((img) => formData.append('files', img));
        await api.post(`/products/${data.data.id}/media`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }

      router.push('/my-products');
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
        <div className="w-12 h-12 rounded-lg bg-blue-50 flex items-center justify-center">
          <Package className="w-6 h-6 text-blue-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Yeni Ürün Ekle</h1>
          <p className="text-gray-500 text-sm">Ürün bilgilerini doldurun ve görselleri yükleyin</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Basic Info */}
        <div className="bg-white rounded-xl border p-6 space-y-4">
          <h2 className="font-semibold text-lg">Temel Bilgiler</h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Ürün Başlığı *</label>
            <input
              name="title"
              value={form.title}
              onChange={handleChange}
              required
              className="w-full border rounded-lg px-4 py-2.5 focus:border-blue-500 focus:outline-none"
              placeholder="Örn: 19. Yüzyıl Osmanlı Kaligrafi Tablosu"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Kısa Açıklama *</label>
            <input
              name="shortDescription"
              value={form.shortDescription}
              onChange={handleChange}
              required
              className="w-full border rounded-lg px-4 py-2.5 focus:border-blue-500 focus:outline-none"
              placeholder="Kısa bir tanım..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Detaylı Açıklama</label>
            <textarea
              name="descriptionHtml"
              value={form.descriptionHtml}
              onChange={handleChange}
              rows={5}
              className="w-full border rounded-lg px-4 py-2.5 focus:border-blue-500 focus:outline-none"
              placeholder="Ürünün detaylı açıklaması, geçmişi, özellikleri..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Kategori *</label>
              <select
                name="categoryId"
                value={form.categoryId}
                onChange={handleChange}
                required
                className="w-full border rounded-lg px-4 py-2.5"
              >
                <option value="">Seçiniz</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Durum *</label>
              <select
                name="condition"
                value={form.condition}
                onChange={handleChange}
                className="w-full border rounded-lg px-4 py-2.5"
              >
                <option value="NEW">Yeni</option>
                <option value="USED">Kullanılmış</option>
                <option value="RESTORED">Restore Edilmiş</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tahmini Değer (Alt) *</label>
              <input
                name="estimateLow"
                value={form.estimateLow}
                onChange={handleChange}
                required
                type="number"
                className="w-full border rounded-lg px-4 py-2.5 focus:border-blue-500 focus:outline-none"
                placeholder="10000"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tahmini Değer (Üst) *</label>
              <input
                name="estimateHigh"
                value={form.estimateHigh}
                onChange={handleChange}
                required
                type="number"
                className="w-full border rounded-lg px-4 py-2.5 focus:border-blue-500 focus:outline-none"
                placeholder="25000"
              />
            </div>
          </div>
        </div>

        {/* Images */}
        <div className="bg-white rounded-xl border p-6">
          <h2 className="font-semibold text-lg mb-4">Görseller</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {previews.map((src, i) => (
              <div key={i} className="relative aspect-square rounded-lg overflow-hidden border">
                <img src={src} alt="" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => removeImage(i)}
                  className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center"
                >
                  <X className="w-4 h-4" />
                </button>
                {i === 0 && (
                  <span className="absolute bottom-1 left-1 bg-blue-600 text-white text-[10px] px-1.5 py-0.5 rounded">
                    Kapak
                  </span>
                )}
              </div>
            ))}
            <label className="aspect-square border-2 border-dashed rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition">
              <Upload className="w-8 h-8 text-gray-400 mb-1" />
              <span className="text-xs text-gray-400">Görsel Ekle</span>
              <input type="file" multiple accept="image/*" onChange={handleImages} className="hidden" />
            </label>
          </div>
        </div>

        {/* Attributes */}
        <div className="bg-white rounded-xl border p-6 space-y-4">
          <h2 className="font-semibold text-lg">Detay Bilgiler</h2>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sanatçı / Üretici</label>
              <input name="artistName" value={form.artistName} onChange={handleChange} className="w-full border rounded-lg px-4 py-2.5 focus:border-blue-500 focus:outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Yıl / Dönem</label>
              <input name="year" value={form.year} onChange={handleChange} className="w-full border rounded-lg px-4 py-2.5 focus:border-blue-500 focus:outline-none" placeholder="1890" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Teknik / Ortam</label>
              <input name="medium" value={form.medium} onChange={handleChange} className="w-full border rounded-lg px-4 py-2.5 focus:border-blue-500 focus:outline-none" placeholder="Yağlı boya tuval üzerine" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Boyutlar</label>
              <input name="dimensions" value={form.dimensions} onChange={handleChange} className="w-full border rounded-lg px-4 py-2.5 focus:border-blue-500 focus:outline-none" placeholder="50 x 70 cm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Malzeme</label>
              <input name="material" value={form.material} onChange={handleChange} className="w-full border rounded-lg px-4 py-2.5 focus:border-blue-500 focus:outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Menşe</label>
              <input name="origin" value={form.origin} onChange={handleChange} className="w-full border rounded-lg px-4 py-2.5 focus:border-blue-500 focus:outline-none" placeholder="Türkiye" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Provenance / Sahiplik Geçmişi</label>
            <textarea
              name="provenanceText"
              value={form.provenanceText}
              onChange={handleChange}
              rows={3}
              className="w-full border rounded-lg px-4 py-2.5 focus:border-blue-500 focus:outline-none"
              placeholder="Eserin bilinen sahiplik geçmişi..."
            />
          </div>

          <div className="flex gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" name="signed" checked={form.signed} onChange={handleChange} />
              <span className="text-sm text-gray-700">İmzalı</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" name="certificateAvailable" checked={form.certificateAvailable} onChange={handleChange} />
              <span className="text-sm text-gray-700">Sertifika / Ekspertiz Raporu Mevcut</span>
            </label>
          </div>
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
            disabled={loading}
            className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold py-3 rounded-lg transition"
          >
            <Save className="w-5 h-5" />
            {loading ? 'Kaydediliyor...' : 'Ürünü Kaydet'}
          </button>
        </div>
      </form>
    </div>
  );
}
