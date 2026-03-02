'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Store, Upload, CheckCircle2, ArrowRight, FileText, Shield } from 'lucide-react';
import api from '@/lib/api';

export default function SellerApplyPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const [form, setForm] = useState({
    storeName: '',
    storeDescription: '',
    businessType: 'individual',
    taxNumber: '',
    companyName: '',
    iban: '',
    bankName: '',
    phone: '',
    address: '',
    city: '',
    specialties: [] as string[],
    experienceYears: '',
    website: '',
    agreeTerms: false,
  });

  const specialtyOptions = [
    'Tablo & Resim', 'Heykel', 'Antika Mobilya', 'Mücevher',
    'Saat', 'Porselen & Seramik', 'Halı & Kilim', 'Kitap & Elyazması',
    'Fotoğraf', 'Modern Sanat', 'Dekoratif Sanat', 'Koleksiyon',
  ];

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  function toggleSpecialty(s: string) {
    setForm((prev) => ({
      ...prev,
      specialties: prev.specialties.includes(s)
        ? prev.specialties.filter((x) => x !== s)
        : [...prev.specialties, s],
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/seller/apply', form);
      setSuccess(true);
    } catch {
      // handle error
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full text-center bg-white rounded-2xl shadow-sm border p-10">
          <div className="w-20 h-20 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-3">Başvurunuz Alındı!</h1>
          <p className="text-gray-500 mb-6">
            Satıcı başvurunuz incelemeye alınmıştır. Sonuç e-posta ve bildirim ile
            tarafınıza iletilecektir. Bu süreç genellikle 1-3 iş günü sürer.
          </p>
          <button
            onClick={() => router.push('/')}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded-lg transition"
          >
            Ana Sayfaya Dön
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <div className="text-center mb-10">
        <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center mx-auto mb-4">
          <Store className="w-8 h-8 text-blue-600" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Satıcı Olun</h1>
        <p className="text-gray-500">
          Müzayede platformunda eserlerinizi satışa sunun. Başvuru sonrası
          hesabınız onaylanacaktır.
        </p>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center justify-center gap-4 mb-10">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                step >= s ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-400'
              }`}
            >
              {s}
            </div>
            <span className={`text-sm ${step >= s ? 'text-gray-700 font-medium' : 'text-gray-400'}`}>
              {s === 1 ? 'Mağaza Bilgileri' : s === 2 ? 'İş Detayları' : 'Uzmanlık & Onay'}
            </span>
            {s < 3 && <ArrowRight className="w-4 h-4 text-gray-300" />}
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border p-8">
        {/* Step 1: Store Info */}
        {step === 1 && (
          <div className="space-y-5">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Mağaza Bilgileri</h2>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mağaza Adı *</label>
              <input
                name="storeName"
                value={form.storeName}
                onChange={handleChange}
                required
                className="w-full border rounded-lg px-4 py-2.5 focus:border-blue-500 focus:outline-none"
                placeholder="Örn: Sanat Galerisi Istanbul"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mağaza Açıklaması</label>
              <textarea
                name="storeDescription"
                value={form.storeDescription}
                onChange={handleChange}
                rows={3}
                className="w-full border rounded-lg px-4 py-2.5 focus:border-blue-500 focus:outline-none"
                placeholder="Mağazanızı kısaca tanıtın..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">İş Türü *</label>
              <select
                name="businessType"
                value={form.businessType}
                onChange={handleChange}
                className="w-full border rounded-lg px-4 py-2.5"
              >
                <option value="individual">Bireysel Satıcı</option>
                <option value="company">Şirket / Tüzel Kişi</option>
                <option value="auction_house">Müzayede Evi</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Telefon *</label>
              <input
                name="phone"
                value={form.phone}
                onChange={handleChange}
                required
                type="tel"
                className="w-full border rounded-lg px-4 py-2.5 focus:border-blue-500 focus:outline-none"
                placeholder="+90 5XX XXX XX XX"
              />
            </div>

            <button
              type="button"
              onClick={() => setStep(2)}
              disabled={!form.storeName || !form.phone}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white font-bold py-3 rounded-lg transition"
            >
              Devam Et
            </button>
          </div>
        )}

        {/* Step 2: Business Details */}
        {step === 2 && (
          <div className="space-y-5">
            <h2 className="text-xl font-bold text-gray-900 mb-4">İş Detayları</h2>

            {form.businessType !== 'individual' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Şirket Adı</label>
                  <input
                    name="companyName"
                    value={form.companyName}
                    onChange={handleChange}
                    className="w-full border rounded-lg px-4 py-2.5 focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Vergi Numarası</label>
                  <input
                    name="taxNumber"
                    value={form.taxNumber}
                    onChange={handleChange}
                    className="w-full border rounded-lg px-4 py-2.5 focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">IBAN *</label>
              <input
                name="iban"
                value={form.iban}
                onChange={handleChange}
                required
                className="w-full border rounded-lg px-4 py-2.5 focus:border-blue-500 focus:outline-none font-mono"
                placeholder="TR00 0000 0000 0000 0000 0000 00"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Banka Adı *</label>
              <input
                name="bankName"
                value={form.bankName}
                onChange={handleChange}
                required
                className="w-full border rounded-lg px-4 py-2.5 focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Adres *</label>
              <input
                name="address"
                value={form.address}
                onChange={handleChange}
                required
                className="w-full border rounded-lg px-4 py-2.5 focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Şehir *</label>
              <input
                name="city"
                value={form.city}
                onChange={handleChange}
                required
                className="w-full border rounded-lg px-4 py-2.5 focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="flex-1 border text-gray-700 font-medium py-3 rounded-lg hover:bg-gray-50 transition"
              >
                Geri
              </button>
              <button
                type="button"
                onClick={() => setStep(3)}
                disabled={!form.iban || !form.bankName || !form.address}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white font-bold py-3 rounded-lg transition"
              >
                Devam Et
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Specialties & Confirmation */}
        {step === 3 && (
          <div className="space-y-5">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Uzmanlık Alanları & Onay</h2>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Uzmanlık Alanlarınız</label>
              <div className="flex flex-wrap gap-2">
                {specialtyOptions.map((s) => (
                  <button
                    type="button"
                    key={s}
                    onClick={() => toggleSpecialty(s)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${
                      form.specialties.includes(s)
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Deneyim (Yıl)</label>
              <input
                name="experienceYears"
                value={form.experienceYears}
                onChange={handleChange}
                type="number"
                className="w-full border rounded-lg px-4 py-2.5 focus:border-blue-500 focus:outline-none"
                placeholder="5"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Web Sitesi (opsiyonel)</label>
              <input
                name="website"
                value={form.website}
                onChange={handleChange}
                type="url"
                className="w-full border rounded-lg px-4 py-2.5 focus:border-blue-500 focus:outline-none"
                placeholder="https://"
              />
            </div>

            <div className="bg-blue-50 rounded-xl p-4 space-y-2 text-sm">
              <div className="flex items-center gap-2 text-blue-700 font-medium">
                <Shield className="w-4 h-4" /> Satıcı Sözleşmesi
              </div>
              <p className="text-blue-600">
                Başvurunuzu göndererek satıcı sözleşmesini ve komisyon politikasını kabul
                etmiş olursunuz. Standart komisyon oranı: Alıcı %15, Satıcı %10.
              </p>
            </div>

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={form.agreeTerms}
                onChange={(e) => setForm({ ...form, agreeTerms: e.target.checked })}
                className="mt-1"
              />
              <span className="text-sm text-gray-600">
                Satıcı sözleşmesini, komisyon politikasını ve KVKK aydınlatma metnini
                okudum ve kabul ediyorum.
              </span>
            </label>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="flex-1 border text-gray-700 font-medium py-3 rounded-lg hover:bg-gray-50 transition"
              >
                Geri
              </button>
              <button
                type="submit"
                disabled={!form.agreeTerms || loading}
                className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white font-bold py-3 rounded-lg transition"
              >
                {loading ? 'Gönderiliyor...' : 'Başvuruyu Gönder'}
              </button>
            </div>
          </div>
        )}
      </form>

      {/* Benefits */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
        <div className="text-center p-6">
          <Store className="w-10 h-10 text-blue-600 mx-auto mb-3" />
          <h3 className="font-semibold text-gray-900 mb-1">Kendi Mağazanız</h3>
          <p className="text-sm text-gray-500">Özel mağaza sayfanız ve markanızla satış yapın.</p>
        </div>
        <div className="text-center p-6">
          <Upload className="w-10 h-10 text-blue-600 mx-auto mb-3" />
          <h3 className="font-semibold text-gray-900 mb-1">Kolay Yükleme</h3>
          <p className="text-sm text-gray-500">Toplu ürün yükleme ve müzayede oluşturma araçları.</p>
        </div>
        <div className="text-center p-6">
          <FileText className="w-10 h-10 text-blue-600 mx-auto mb-3" />
          <h3 className="font-semibold text-gray-900 mb-1">Detaylı Raporlar</h3>
          <p className="text-sm text-gray-500">Satış, gelir ve performans analizleri.</p>
        </div>
      </div>
    </div>
  );
}
