'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import NextImage from 'next/image';
import Link from 'next/link';
import {
  Package,
  Truck,
  CheckCircle2,
  Clock,
  MapPin,
  FileText,
  ArrowLeft,
  AlertCircle,
  CreditCard,
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

interface OrderTracking {
  id: string;
  hammerPrice: number;
  buyerCommission: number;
  vatAmount: number;
  totalAmount: number;
  status: string;
  createdAt: string;
  lot: {
    product: {
      id: string;
      title: string;
      media: Array<{ url: string; isPrimary: boolean }>;
    };
  };
  auction: { id: string; title: string };
  payment: {
    method: string;
    status: string;
    paidAt: string | null;
  } | null;
  shipment: {
    carrier: string;
    trackingNumber: string | null;
    status: string;
    labelUrl: string | null;
    deliveryPhotoUrl: string | null;
    estimatedDelivery: string | null;
    events: Array<{
      status: string;
      location: string;
      timestamp: string;
      description: string;
    }>;
  } | null;
  invoice: {
    invoiceNumber: string;
    pdfUrl: string;
  } | null;
}

const STATUS_MAP: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  PENDING: { label: 'Ödeme Bekleniyor', color: 'text-yellow-600 bg-yellow-50', icon: Clock },
  PAID: { label: 'Ödendi', color: 'text-blue-600 bg-blue-50', icon: CreditCard },
  SHIPPED: { label: 'Kargoda', color: 'text-purple-600 bg-purple-50', icon: Truck },
  DELIVERED: { label: 'Teslim Edildi', color: 'text-green-600 bg-green-50', icon: CheckCircle2 },
  COMPLETED: { label: 'Tamamlandı', color: 'text-green-600 bg-green-50', icon: CheckCircle2 },
  REFUNDED: { label: 'İade Edildi', color: 'text-red-600 bg-red-50', icon: AlertCircle },
  CANCELLED: { label: 'İptal', color: 'text-gray-600 bg-gray-50', icon: AlertCircle },
};

const STEP_ORDER = ['PENDING', 'PAID', 'SHIPPED', 'DELIVERED', 'COMPLETED'];

export default function OrderTrackingPage() {
  const params = useParams();
  const orderId = params.id as string;
  const [order, setOrder] = useState<OrderTracking | null>(null);
  const [loading, setLoading] = useState(true);

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

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/3" />
          <div className="h-4 bg-gray-200 rounded w-1/2" />
          <div className="h-32 bg-gray-200 rounded-xl" />
          <div className="h-64 bg-gray-200 rounded-xl" />
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

  const statusInfo = STATUS_MAP[order.status] || STATUS_MAP.PENDING;
  const StatusIcon = statusInfo.icon;
  const currentStepIndex = STEP_ORDER.indexOf(order.status);
  const productImage =
    order.lot?.product?.media?.find((m) => m.isPrimary)?.url ||
    order.lot?.product?.media?.[0]?.url;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Link
        href="/my-orders"
        className="flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-6 text-sm"
      >
        <ArrowLeft className="w-4 h-4" /> Siparişlerim
      </Link>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Sipariş Takibi</h1>
          <p className="text-gray-500 text-sm mt-1">
            Sipariş #{orderId.slice(0, 8).toUpperCase()} &middot;{' '}
            {new Date(order.createdAt).toLocaleDateString('tr-TR', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </p>
        </div>
        <div className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium mt-4 md:mt-0 ${statusInfo.color}`}>
          <StatusIcon className="w-4 h-4" />
          {statusInfo.label}
        </div>
      </div>

      {/* Progress Steps */}
      <div className="bg-white rounded-xl border p-6 mb-8">
        <div className="flex items-center justify-between relative">
          <div className="absolute top-5 left-0 right-0 h-0.5 bg-gray-200" />
          <div
            className="absolute top-5 left-0 h-0.5 bg-green-500 transition-all"
            style={{ width: `${Math.max(0, (currentStepIndex / (STEP_ORDER.length - 1)) * 100)}%` }}
          />
          {STEP_ORDER.map((stepKey, i) => {
            const done = i <= currentStepIndex;
            const info = STATUS_MAP[stepKey];
            const Icon = info?.icon || Clock;
            return (
              <div key={stepKey} className="relative flex flex-col items-center z-10">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    done ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-400'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <span className={`text-xs mt-2 ${done ? 'text-green-700 font-medium' : 'text-gray-400'}`}>
                  {info?.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Product */}
          <div className="bg-white rounded-xl border p-6">
            <h2 className="font-semibold text-lg mb-4">Ürün Bilgisi</h2>
            <div className="flex gap-4">
              <div className="w-24 h-24 relative bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                {productImage ? (
                  <SafeImage src={productImage} alt="" fill className="object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Package className="w-8 h-8 text-gray-300" />
                  </div>
                )}
              </div>
              <div>
                <Link
                  href={`/products/${order.lot?.product?.id}`}
                  className="font-semibold text-gray-900 hover:text-blue-600 transition"
                >
                  {order.lot?.product?.title}
                </Link>
                <p className="text-sm text-gray-500 mt-1">{order.auction?.title}</p>
              </div>
            </div>
          </div>

          {/* Shipping Tracking */}
          {order.shipment && (
            <div className="bg-white rounded-xl border p-6">
              <h2 className="font-semibold text-lg mb-4 flex items-center gap-2">
                <Truck className="w-5 h-5" /> Kargo Takibi
              </h2>
              <div className="flex items-center gap-4 mb-4 text-sm">
                <span className="text-gray-500">Kargo Firması: <strong>{order.shipment.carrier}</strong></span>
                {order.shipment.trackingNumber && (
                  <span className="text-gray-500">
                    Takip No: <strong className="text-blue-600">{order.shipment.trackingNumber}</strong>
                  </span>
                )}
              </div>

              {order.shipment.events?.length > 0 && (
                <div className="relative pl-6 space-y-4 border-l-2 border-gray-200">
                  {order.shipment.events.map((event, i) => (
                    <div key={i} className="relative">
                      <div
                        className={`absolute -left-[25px] w-3 h-3 rounded-full ${
                          i === 0 ? 'bg-green-500' : 'bg-gray-300'
                        }`}
                      />
                      <div>
                        <p className="font-medium text-sm">{event.description}</p>
                        <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(event.timestamp).toLocaleString('tr-TR')}
                          </span>
                          {event.location && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {event.location}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {order.shipment.deliveryPhotoUrl && (
                <div className="mt-4 pt-4 border-t">
                  <p className="text-sm font-medium mb-2">Teslimat Fotoğrafı</p>
                  <div className="relative w-48 h-48 rounded-lg overflow-hidden">
                    <SafeImage
                      src={order.shipment.deliveryPhotoUrl}
                      alt="Teslimat"
                      fill
                      className="object-cover"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Payment */}
          {order.payment && (
            <div className="bg-white rounded-xl border p-6">
              <h2 className="font-semibold text-lg mb-4 flex items-center gap-2">
                <CreditCard className="w-5 h-5" /> Ödeme Bilgisi
              </h2>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Yöntem</span>
                  <p className="font-medium">
                    {order.payment.method === 'credit_card' ? 'Kredi Kartı' : 'Havale / EFT'}
                  </p>
                </div>
                <div>
                  <span className="text-gray-500">Durum</span>
                  <p className="font-medium">
                    {order.payment.status === 'COMPLETED' ? 'Ödendi' : 'Beklemede'}
                  </p>
                </div>
                {order.payment.paidAt && (
                  <div>
                    <span className="text-gray-500">Ödeme Tarihi</span>
                    <p className="font-medium">
                      {new Date(order.payment.paidAt).toLocaleDateString('tr-TR')}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right: Summary */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl border p-6 sticky top-4 space-y-4">
            <h2 className="font-semibold text-lg">Fiyat Detayı</h2>

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

            {/* Invoice */}
            {order.invoice && (
              <a
                href={order.invoice.pdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 w-full justify-center bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-3 rounded-lg transition text-sm"
              >
                <FileText className="w-4 h-4" /> Faturayı Görüntüle
              </a>
            )}

            {order.status === 'PENDING' && (
              <Link
                href={`/checkout/${order.id}`}
                className="flex items-center gap-2 w-full justify-center bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition"
              >
                <CreditCard className="w-4 h-4" /> Ödeme Yap
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
