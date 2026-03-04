'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import NextImage from 'next/image';
import Link from 'next/link';
import {
  CreditCard,
  Building2,
  Shield,
  CheckCircle2,
  Package,
  Truck,
  AlertCircle,
} from 'lucide-react';

function SafeImage(props: React.ComponentProps<typeof NextImage>) {
  const src = typeof props.src === 'string' ? props.src : '';
  if (src.startsWith('/images/')) {
    return (
      <div className={`flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900 ${props.fill ? 'absolute inset-0' : ''}`} style={!props.fill ? { width: typeof props.width === 'number' ? props.width : undefined, height: typeof props.height === 'number' ? props.height : undefined } : undefined}>
        <span className="text-gray-500 text-xs">No image</span>
      </div>
    );
  }
  return <NextImage {...props} />;
}

interface OrderDetail {
  id: string;
  hammerPrice: number;
  buyerCommission: number;
  vatAmount: number;
  totalAmount: number;
  status: string;
  lot: {
    product: {
      id: string;
      title: string;
      media: Array<{ url: string; isPrimary: boolean }>;
    };
  };
  auction: { id: string; title: string };
  shippingOptions?: Array<{
    id: string;
    carrier: string;
    price: number;
    estimatedDays: number;
  }>;
}

type PaymentMethod = 'credit_card' | 'bank_transfer';

export default function CheckoutPage() {
  const params = useParams();
  const orderId = params.orderId as string;

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('credit_card');
  const [selectedShipping, setSelectedShipping] = useState<string>('');
  const [processing, setProcessing] = useState(false);
  const [step, setStep] = useState(1);

  // Card form
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvc, setCardCvc] = useState('');
  const [cardName, setCardName] = useState('');
  const [installments, setInstallments] = useState(1);

  useEffect(() => {
    if (!orderId) return;
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
    const token = localStorage.getItem('token');
    fetch(`${apiUrl}/orders/${orderId}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((r) => r.json())
      .then((data) => {
        setOrder(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [orderId]);

  function formatCurrency(amount: number) {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY',
      maximumFractionDigits: 0,
    }).format(amount);
  }

  async function handlePayment() {
    if (processing) return;
    setProcessing(true);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
      const token = localStorage.getItem('token');

      const body: Record<string, unknown> = {
        orderId,
        method: paymentMethod,
        shippingOptionId: selectedShipping || undefined,
      };

      if (paymentMethod === 'credit_card') {
        body.card = {
          number: cardNumber.replace(/\s/g, ''),
          expiry: cardExpiry,
          cvc: cardCvc,
          holderName: cardName,
          installments,
        };
      }

      const res = await fetch(`${apiUrl}/payments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        setStep(3);
      } else {
        const err = await res.json();
        alert(err.message || 'Ödeme başarısız oldu');
      }
    } catch {
      alert('Ödeme işlemi sırasında bir hata oluştu');
    } finally {
      setProcessing(false);
    }
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/3" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <div className="h-48 bg-gray-200 rounded-xl" />
              <div className="h-12 bg-gray-200 rounded" />
            </div>
            <div className="h-64 bg-gray-200 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center">
        <AlertCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h1 className="text-2xl font-bold">Sipariş bulunamadı</h1>
        <Link href="/my-orders" className="text-blue-600 hover:underline mt-4 inline-block">
          Siparişlerime dön
        </Link>
      </div>
    );
  }

  // Success step
  if (step === 3) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <CheckCircle2 className="w-20 h-20 text-green-500 mx-auto mb-6" />
        <h1 className="text-3xl font-bold text-gray-900">Ödeme Başarılı!</h1>
        <p className="text-gray-600 mt-3">
          Siparişiniz başarıyla oluşturuldu. Kargo süreci hakkında bilgilendirileceksiniz.
        </p>
        <div className="flex gap-4 justify-center mt-8">
          <Link
            href={`/orders/${orderId}`}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-lg transition"
          >
            Sipariş Detayı
          </Link>
          <Link
            href="/auctions"
            className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-3 px-6 rounded-lg transition"
          >
            Müzayedelere Dön
          </Link>
        </div>
      </div>
    );
  }

  const productImage =
    order.lot?.product?.media?.find((m) => m.isPrimary)?.url ||
    order.lot?.product?.media?.[0]?.url;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Ödeme</h1>

      {/* Progress Steps */}
      <div className="flex items-center gap-4 mb-10">
        {[
          { num: 1, label: 'Ödeme Yöntemi' },
          { num: 2, label: 'Onay' },
        ].map((s) => (
          <div key={s.num} className="flex items-center gap-2">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                step >= s.num ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'
              }`}
            >
              {s.num}
            </div>
            <span className={`text-sm ${step >= s.num ? 'text-gray-900 font-medium' : 'text-gray-400'}`}>
              {s.label}
            </span>
            {s.num < 2 && <div className="w-16 h-0.5 bg-gray-200 mx-2" />}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: Payment Form */}
        <div className="lg:col-span-2 space-y-6">
          {step === 1 && (
            <>
              {/* Payment Method */}
              <div className="bg-white rounded-xl border p-6">
                <h2 className="font-semibold text-lg mb-4">Ödeme Yöntemi</h2>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setPaymentMethod('credit_card')}
                    className={`flex items-center gap-3 p-4 rounded-lg border-2 transition ${
                      paymentMethod === 'credit_card'
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <CreditCard className="w-6 h-6" />
                    <div className="text-left">
                      <p className="font-medium text-sm">Kredi Kartı</p>
                      <p className="text-xs text-gray-500">Taksit seçeneği</p>
                    </div>
                  </button>
                  <button
                    onClick={() => setPaymentMethod('bank_transfer')}
                    className={`flex items-center gap-3 p-4 rounded-lg border-2 transition ${
                      paymentMethod === 'bank_transfer'
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <Building2 className="w-6 h-6" />
                    <div className="text-left">
                      <p className="font-medium text-sm">Havale / EFT</p>
                      <p className="text-xs text-gray-500">Banka transferi</p>
                    </div>
                  </button>
                </div>
              </div>

              {/* Credit Card Form */}
              {paymentMethod === 'credit_card' && (
                <div className="bg-white rounded-xl border p-6 space-y-4">
                  <h2 className="font-semibold text-lg mb-2">Kart Bilgileri</h2>
                  <div>
                    <label className="text-sm text-gray-600 block mb-1">Kart Üzerindeki İsim</label>
                    <input
                      type="text"
                      value={cardName}
                      onChange={(e) => setCardName(e.target.value)}
                      placeholder="Ad Soyad"
                      className="w-full border rounded-lg px-4 py-3 focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-gray-600 block mb-1">Kart Numarası</label>
                    <input
                      type="text"
                      value={cardNumber}
                      onChange={(e) => {
                        const v = e.target.value.replace(/\D/g, '').slice(0, 16);
                        setCardNumber(v.replace(/(\d{4})/g, '$1 ').trim());
                      }}
                      placeholder="0000 0000 0000 0000"
                      className="w-full border rounded-lg px-4 py-3 focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm text-gray-600 block mb-1">Son Kullanma</label>
                      <input
                        type="text"
                        value={cardExpiry}
                        onChange={(e) => {
                          let v = e.target.value.replace(/\D/g, '').slice(0, 4);
                          if (v.length >= 3) v = v.slice(0, 2) + '/' + v.slice(2);
                          setCardExpiry(v);
                        }}
                        placeholder="AA/YY"
                        className="w-full border rounded-lg px-4 py-3 focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-sm text-gray-600 block mb-1">CVC</label>
                      <input
                        type="text"
                        value={cardCvc}
                        onChange={(e) => setCardCvc(e.target.value.replace(/\D/g, '').slice(0, 4))}
                        placeholder="000"
                        className="w-full border rounded-lg px-4 py-3 focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm text-gray-600 block mb-1">Taksit</label>
                    <select
                      value={installments}
                      onChange={(e) => setInstallments(Number(e.target.value))}
                      className="w-full border rounded-lg px-4 py-3"
                    >
                      <option value={1}>Tek Çekim</option>
                      <option value={3}>3 Taksit</option>
                      <option value={6}>6 Taksit</option>
                      <option value={9}>9 Taksit</option>
                      <option value={12}>12 Taksit</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Bank Transfer Info */}
              {paymentMethod === 'bank_transfer' && (
                <div className="bg-white rounded-xl border p-6">
                  <h2 className="font-semibold text-lg mb-4">Havale / EFT Bilgileri</h2>
                  <div className="bg-blue-50 rounded-lg p-4 space-y-2 text-sm">
                    <p><strong>Banka:</strong> T. İş Bankası</p>
                    <p><strong>Şube:</strong> Beyoğlu Şubesi (1234)</p>
                    <p><strong>IBAN:</strong> TR00 0006 4000 0012 3456 7890 12</p>
                    <p><strong>Hesap Adı:</strong> Müzayede Platform A.Ş.</p>
                    <p className="text-blue-700 font-medium mt-2">
                      Açıklama: SİPARİŞ-{orderId.slice(0, 8).toUpperCase()}
                    </p>
                  </div>
                  <p className="text-xs text-gray-500 mt-3">
                    Havale/EFT yaptıktan sonra sipariş durumunuz otomatik güncellenecektir.
                  </p>
                </div>
              )}

              {/* Shipping */}
              {order.shippingOptions && order.shippingOptions.length > 0 && (
                <div className="bg-white rounded-xl border p-6">
                  <h2 className="font-semibold text-lg mb-4">Kargo Seçenekleri</h2>
                  <div className="space-y-3">
                    {order.shippingOptions.map((opt) => (
                      <button
                        key={opt.id}
                        onClick={() => setSelectedShipping(opt.id)}
                        className={`flex items-center justify-between w-full p-4 rounded-lg border-2 transition ${
                          selectedShipping === opt.id
                            ? 'border-blue-600 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <Truck className="w-5 h-5 text-gray-500" />
                          <div className="text-left">
                            <p className="font-medium text-sm">{opt.carrier}</p>
                            <p className="text-xs text-gray-500">
                              Tahmini {opt.estimatedDays} iş günü
                            </p>
                          </div>
                        </div>
                        <span className="font-medium">{formatCurrency(opt.price)}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <button
                onClick={() => setStep(2)}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-lg transition"
              >
                Devam Et
              </button>
            </>
          )}

          {step === 2 && (
            <div className="bg-white rounded-xl border p-6 space-y-6">
              <h2 className="font-semibold text-lg">Ödeme Onayı</h2>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
                <Shield className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-amber-800">
                  <p className="font-medium">Güvenli Ödeme</p>
                  <p className="text-xs mt-1">
                    Ödemeniz iyzico güvenli ödeme altyapısı ile işlenecektir. Kart bilgileriniz
                    şifrelenerek iletilir.
                  </p>
                </div>
              </div>

              <div className="text-sm space-y-2">
                <p>
                  <strong>Yöntem:</strong>{' '}
                  {paymentMethod === 'credit_card' ? 'Kredi Kartı' : 'Havale / EFT'}
                </p>
                {paymentMethod === 'credit_card' && cardNumber && (
                  <p>
                    <strong>Kart:</strong> **** **** **** {cardNumber.slice(-4)}
                  </p>
                )}
                {installments > 1 && (
                  <p>
                    <strong>Taksit:</strong> {installments}x{' '}
                    {formatCurrency(order.totalAmount / installments)}
                  </p>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep(1)}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-4 rounded-lg transition"
                >
                  Geri
                </button>
                <button
                  onClick={handlePayment}
                  disabled={processing}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-4 rounded-lg transition disabled:opacity-50"
                >
                  {processing ? 'İşleniyor...' : `${formatCurrency(order.totalAmount)} Öde`}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right: Order Summary */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl border p-6 sticky top-4">
            <h2 className="font-semibold text-lg mb-4">Sipariş Özeti</h2>

            {order.lot?.product && (
              <div className="flex gap-3 mb-4 pb-4 border-b">
                <div className="w-20 h-20 relative bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                  {productImage ? (
                    <SafeImage src={productImage} alt="" fill className="object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="w-8 h-8 text-gray-300" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-sm text-gray-900 line-clamp-2">
                    {order.lot.product.title}
                  </h3>
                  <p className="text-xs text-gray-500 mt-1">{order.auction?.title}</p>
                </div>
              </div>
            )}

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Çekiç Fiyatı</span>
                <span>{formatCurrency(order.hammerPrice)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Alıcı Komisyonu</span>
                <span>{formatCurrency(order.buyerCommission)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">KDV</span>
                <span>{formatCurrency(order.vatAmount)}</span>
              </div>
              <div className="flex justify-between pt-3 border-t font-bold text-lg">
                <span>Toplam</span>
                <span className="text-green-600">{formatCurrency(order.totalAmount)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
