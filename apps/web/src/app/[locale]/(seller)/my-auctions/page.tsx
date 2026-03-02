'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Gavel,
  Plus,
  Clock,
  CheckCircle2,
  AlertCircle,
  Eye,
  Edit2,
  BarChart3,
  Filter,
} from 'lucide-react';
import api, { apiRoutes } from '@/lib/api';

interface SellerAuction {
  id: string;
  title: string;
  type: string;
  status: string;
  startPrice: number;
  currentPrice: number;
  bidCount: number;
  startDate: string;
  endDate: string;
  lotCount: number;
}

const STATUS_MAP: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  DRAFT: { label: 'Taslak', color: 'text-gray-600 bg-gray-100', icon: Edit2 },
  PUBLISHED: { label: 'Yayında', color: 'text-blue-600 bg-blue-50', icon: Eye },
  PRE_BID: { label: 'Ön Teklif', color: 'text-indigo-600 bg-indigo-50', icon: Clock },
  LIVE: { label: 'Canlı', color: 'text-green-600 bg-green-50', icon: Gavel },
  COMPLETED: { label: 'Tamamlandı', color: 'text-emerald-600 bg-emerald-50', icon: CheckCircle2 },
  CANCELLED: { label: 'İptal', color: 'text-red-600 bg-red-50', icon: AlertCircle },
};

const TYPE_LABELS: Record<string, string> = {
  ENGLISH: 'İngiliz Usulü',
  DUTCH: 'Hollanda Usulü',
  SEALED_BID: 'Kapalı Zarf',
  VICKREY: 'Vickrey',
  TIMED: 'Zamanlı',
  HYBRID: 'Hibrit',
};

export default function SellerAuctionsPage() {
  const [auctions, setAuctions] = useState<SellerAuction[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchAuctions();
  }, [page, statusFilter]);

  async function fetchAuctions() {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '12' });
      if (statusFilter) params.set('status', statusFilter);
      const { data } = await api.get(`${apiRoutes.seller.dashboard}/auctions?${params}`);
      setAuctions(data.data || []);
      setTotalPages(data.meta?.totalPages || 1);
    } catch {
      setAuctions([]);
    } finally {
      setLoading(false);
    }
  }

  function formatCurrency(amount: number) {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY',
      maximumFractionDigits: 0,
    }).format(amount);
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Müzayedelerim</h1>
          <p className="text-gray-500 mt-1">Oluşturduğunuz müzayedeleri yönetin</p>
        </div>
        <Link
          href="/seller-dashboard/create-auction"
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-5 py-2.5 rounded-lg transition"
        >
          <Plus className="w-5 h-5" /> Yeni Müzayede
        </Link>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <Filter className="w-4 h-4 text-gray-400" />
        {['', 'DRAFT', 'PUBLISHED', 'LIVE', 'COMPLETED', 'CANCELLED'].map((s) => (
          <button
            key={s}
            onClick={() => { setStatusFilter(s); setPage(1); }}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${
              statusFilter === s
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {s ? STATUS_MAP[s]?.label || s : 'Tümü'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="animate-pulse bg-white rounded-xl border p-6">
              <div className="h-5 bg-gray-200 rounded w-3/4 mb-3" />
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-4" />
              <div className="h-8 bg-gray-200 rounded w-1/3" />
            </div>
          ))}
        </div>
      ) : auctions.length > 0 ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {auctions.map((auction) => {
              const statusInfo = STATUS_MAP[auction.status] || STATUS_MAP.DRAFT;
              const StatusIcon = statusInfo.icon;
              return (
                <div
                  key={auction.id}
                  className="bg-white rounded-xl border hover:shadow-md transition p-6"
                >
                  <div className="flex items-start justify-between mb-3">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${statusInfo.color}`}
                    >
                      <StatusIcon className="w-3.5 h-3.5" />
                      {statusInfo.label}
                    </span>
                    <span className="text-xs text-gray-400">
                      {TYPE_LABELS[auction.type] || auction.type}
                    </span>
                  </div>

                  <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">
                    {auction.title}
                  </h3>

                  <div className="grid grid-cols-2 gap-3 text-sm mb-4">
                    <div>
                      <span className="text-gray-500 text-xs">Başlangıç</span>
                      <p className="font-medium">{formatCurrency(auction.startPrice)}</p>
                    </div>
                    <div>
                      <span className="text-gray-500 text-xs">Güncel</span>
                      <p className="font-medium text-green-600">
                        {formatCurrency(auction.currentPrice)}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-500 text-xs">Teklifler</span>
                      <p className="font-medium">{auction.bidCount}</p>
                    </div>
                    <div>
                      <span className="text-gray-500 text-xs">Lotlar</span>
                      <p className="font-medium">{auction.lotCount}</p>
                    </div>
                  </div>

                  <div className="text-xs text-gray-400 mb-4">
                    {new Date(auction.startDate).toLocaleDateString('tr-TR')} -{' '}
                    {new Date(auction.endDate).toLocaleDateString('tr-TR')}
                  </div>

                  <div className="flex gap-2">
                    <Link
                      href={`/auctions/${auction.id}`}
                      className="flex-1 flex items-center justify-center gap-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium py-2 rounded-lg transition"
                    >
                      <Eye className="w-4 h-4" /> Görüntüle
                    </Link>
                    {auction.status === 'DRAFT' && (
                      <Link
                        href={`/seller-dashboard/edit-auction/${auction.id}`}
                        className="flex-1 flex items-center justify-center gap-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 text-sm font-medium py-2 rounded-lg transition"
                      >
                        <Edit2 className="w-4 h-4" /> Düzenle
                      </Link>
                    )}
                    {auction.status === 'COMPLETED' && (
                      <Link
                        href={`/seller-dashboard/auction-report/${auction.id}`}
                        className="flex-1 flex items-center justify-center gap-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 text-sm font-medium py-2 rounded-lg transition"
                      >
                        <BarChart3 className="w-4 h-4" /> Rapor
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-8">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 border rounded-lg text-sm disabled:opacity-50"
              >
                Önceki
              </button>
              <span className="px-4 py-2 text-sm text-gray-600">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-4 py-2 border rounded-lg text-sm disabled:opacity-50"
              >
                Sonraki
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-16">
          <Gavel className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-700">Henüz müzayedeniz yok</h2>
          <p className="text-gray-500 mt-2 mb-6">
            İlk müzayedenizi oluşturarak satışa başlayın.
          </p>
          <Link
            href="/seller-dashboard/create-auction"
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded-lg transition"
          >
            <Plus className="w-5 h-5" /> Müzayede Oluştur
          </Link>
        </div>
      )}
    </div>
  );
}
