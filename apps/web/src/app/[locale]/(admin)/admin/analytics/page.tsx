'use client';

import { useState, useEffect } from 'react';
import {
  TrendingUp,
  Users,
  Gavel,
  DollarSign,
  BarChart3,
  PieChart as PieChartIcon,
  Download,
  Calendar,
} from 'lucide-react';
import api from '@/lib/api';

interface AnalyticsData {
  dashboard: {
    totalRevenue: { value: number; change: number };
    totalUsers: { value: number; change: number };
    totalAuctions: { value: number; change: number };
    totalBids: { value: number; change: number };
    conversionRate: { value: number; change: number };
    activeAuctions: { value: number };
  };
  revenueChart: Array<{ date: string; revenue: number; commissionEarned: number }>;
  categoryPerformance: Array<{
    categoryName: string;
    totalRevenue: number;
    auctionCount: number;
    bidCount: number;
  }>;
  topSellers: Array<{ sellerName: string; storeName: string; totalSales: number; auctionCount: number }>;
  topBuyers: Array<{ buyerName: string; totalSpend: number; orderCount: number; winRate: number }>;
}

export default function AdminAnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('30d');

  useEffect(() => {
    fetchAnalytics();
  }, [period]);

  async function fetchAnalytics() {
    setLoading(true);
    try {
      const [dashRes, chartRes, catRes, sellersRes, buyersRes] = await Promise.all([
        api.get(`/analytics/dashboard?period=${period}`),
        api.get(`/analytics/revenue-chart?period=${period}&granularity=day`),
        api.get(`/analytics/category-performance?period=${period}`),
        api.get(`/analytics/top-sellers?period=${period}&limit=10`),
        api.get(`/analytics/top-buyers?period=${period}&limit=10`),
      ]);
      setData({
        dashboard: dashRes.data.overview,
        revenueChart: chartRes.data.data,
        categoryPerformance: catRes.data.categories,
        topSellers: sellersRes.data.sellers,
        topBuyers: buyersRes.data.buyers,
      });
    } catch {
      // fallback
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

  function ChangeIndicator({ value }: { value: number }) {
    const isPositive = value >= 0;
    return (
      <span className={`text-xs font-medium ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
        {isPositive ? '+' : ''}
        {value.toFixed(1)}%
      </span>
    );
  }

  if (loading) {
    return (
      <div className="p-8 space-y-6">
        <div className="h-8 bg-gray-200 rounded w-1/4 animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl border p-6 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-3" />
              <div className="h-8 bg-gray-200 rounded w-2/3" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const d = data?.dashboard;

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Analitik</h1>
          <p className="text-gray-500 mt-1">Platform performans metrikleri</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-white border rounded-lg px-3 py-2">
            <Calendar className="w-4 h-4 text-gray-400" />
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="text-sm border-none focus:outline-none"
            >
              <option value="24h">Son 24 Saat</option>
              <option value="7d">Son 7 Gün</option>
              <option value="30d">Son 30 Gün</option>
              <option value="90d">Son 90 Gün</option>
              <option value="1y">Son 1 Yıl</option>
            </select>
          </div>
          <button className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-lg text-sm font-medium transition">
            <Download className="w-4 h-4" /> Rapor İndir
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        <MetricCard
          icon={DollarSign}
          label="Toplam Gelir"
          value={formatCurrency(d?.totalRevenue?.value || 0)}
          change={d?.totalRevenue?.change || 0}
          color="bg-green-50 text-green-600"
        />
        <MetricCard
          icon={Users}
          label="Toplam Kullanıcı"
          value={String(d?.totalUsers?.value || 0)}
          change={d?.totalUsers?.change || 0}
          color="bg-blue-50 text-blue-600"
        />
        <MetricCard
          icon={Gavel}
          label="Müzayedeler"
          value={String(d?.totalAuctions?.value || 0)}
          change={d?.totalAuctions?.change || 0}
          color="bg-purple-50 text-purple-600"
        />
        <MetricCard
          icon={BarChart3}
          label="Toplam Teklif"
          value={String(d?.totalBids?.value || 0)}
          change={d?.totalBids?.change || 0}
          color="bg-orange-50 text-orange-600"
        />
        <MetricCard
          icon={TrendingUp}
          label="Dönüşüm Oranı"
          value={`%${d?.conversionRate?.value?.toFixed(1) || '0'}`}
          change={d?.conversionRate?.change || 0}
          color="bg-emerald-50 text-emerald-600"
        />
      </div>

      {/* Revenue Chart (simplified table representation) */}
      <div className="bg-white rounded-xl border p-6 mb-8">
        <h2 className="font-semibold text-lg mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5" /> Gelir Grafiği
        </h2>
        {data?.revenueChart && data.revenueChart.length > 0 ? (
          <div className="overflow-x-auto">
            <div className="flex items-end gap-1 h-48 min-w-[600px]">
              {data.revenueChart.map((item) => {
                const maxRevenue = Math.max(...data.revenueChart.map((r) => r.revenue), 1);
                const height = (item.revenue / maxRevenue) * 100;
                return (
                  <div
                    key={item.date}
                    className="flex-1 flex flex-col items-center group"
                  >
                    <div className="relative w-full flex justify-center">
                      <div
                        className="w-full max-w-[30px] bg-blue-500 hover:bg-blue-600 rounded-t transition-all cursor-pointer"
                        style={{ height: `${Math.max(height * 1.8, 4)}px` }}
                        title={`${item.date}: ${formatCurrency(item.revenue)}`}
                      />
                    </div>
                    <span className="text-[10px] text-gray-400 mt-1 rotate-45 origin-left">
                      {item.date.slice(5)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <p className="text-gray-400 text-center py-8">Bu dönem için veri yok</p>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Category Performance */}
        <div className="bg-white rounded-xl border p-6">
          <h2 className="font-semibold text-lg mb-4 flex items-center gap-2">
            <PieChartIcon className="w-5 h-5" /> Kategori Performansı
          </h2>
          <div className="space-y-3">
            {(data?.categoryPerformance || []).slice(0, 8).map((cat) => (
              <div key={cat.categoryName} className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-700">{cat.categoryName}</span>
                    <span className="text-sm text-gray-500">{formatCurrency(cat.totalRevenue)}</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full"
                      style={{
                        width: `${Math.min(
                          100,
                          (cat.totalRevenue /
                            Math.max(
                              ...(data?.categoryPerformance || []).map((c) => c.totalRevenue),
                              1,
                            )) *
                            100,
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}
            {(!data?.categoryPerformance || data.categoryPerformance.length === 0) && (
              <p className="text-gray-400 text-center py-4">Veri yok</p>
            )}
          </div>
        </div>

        {/* Top Sellers */}
        <div className="bg-white rounded-xl border p-6">
          <h2 className="font-semibold text-lg mb-4">En İyi Satıcılar</h2>
          <div className="space-y-3">
            {(data?.topSellers || []).slice(0, 8).map((seller, i) => (
              <div key={seller.sellerName} className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500">
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-700 truncate">{seller.sellerName}</p>
                  {seller.storeName && (
                    <p className="text-xs text-gray-400 truncate">{seller.storeName}</p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-gray-900">
                    {formatCurrency(seller.totalSales)}
                  </p>
                  <p className="text-xs text-gray-400">{seller.auctionCount} satış</p>
                </div>
              </div>
            ))}
            {(!data?.topSellers || data.topSellers.length === 0) && (
              <p className="text-gray-400 text-center py-4">Veri yok</p>
            )}
          </div>
        </div>
      </div>

      {/* Top Buyers */}
      <div className="bg-white rounded-xl border p-6">
        <h2 className="font-semibold text-lg mb-4">En Aktif Alıcılar</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-gray-500 text-left">
                <th className="py-3 font-medium">#</th>
                <th className="py-3 font-medium">Alıcı</th>
                <th className="py-3 font-medium text-right">Toplam Harcama</th>
                <th className="py-3 font-medium text-right">Siparişler</th>
                <th className="py-3 font-medium text-right">Kazanma Oranı</th>
              </tr>
            </thead>
            <tbody>
              {(data?.topBuyers || []).map((buyer, i) => (
                <tr key={buyer.buyerName} className="border-b last:border-b-0">
                  <td className="py-3 text-gray-400">{i + 1}</td>
                  <td className="py-3 font-medium text-gray-700">{buyer.buyerName}</td>
                  <td className="py-3 text-right font-semibold">{formatCurrency(buyer.totalSpend)}</td>
                  <td className="py-3 text-right text-gray-500">{buyer.orderCount}</td>
                  <td className="py-3 text-right">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                      buyer.winRate >= 50 ? 'bg-green-50 text-green-700' : 'bg-gray-50 text-gray-600'
                    }`}>
                      %{buyer.winRate.toFixed(1)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {(!data?.topBuyers || data.topBuyers.length === 0) && (
            <p className="text-gray-400 text-center py-8">Veri yok</p>
          )}
        </div>
      </div>
    </div>
  );

  function MetricCard({
    icon: Icon,
    label,
    value,
    change,
    color,
  }: {
    icon: React.ElementType;
    label: string;
    value: string;
    change: number;
    color: string;
  }) {
    return (
      <div className="bg-white rounded-xl border p-5">
        <div className="flex items-center justify-between mb-3">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>
            <Icon className="w-5 h-5" />
          </div>
          <ChangeIndicator value={change} />
        </div>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-xs text-gray-500 mt-1">{label}</p>
      </div>
    );
  }
}
