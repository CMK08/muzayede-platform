'use client';

import { useState, useEffect } from 'react';
import { Star, Award, Trophy, Gift, TrendingUp, Zap, ShoppingBag, Gavel } from 'lucide-react';
import api from '@/lib/api';

interface LoyaltyData {
  points: number;
  tier: 'BRONZE' | 'SILVER' | 'GOLD' | 'DIAMOND';
  nextTier: string | null;
  pointsToNextTier: number;
  totalEarned: number;
  totalRedeemed: number;
  history: Array<{
    id: string;
    type: 'EARNED' | 'REDEEMED';
    points: number;
    description: string;
    createdAt: string;
  }>;
  rewards: Array<{
    id: string;
    title: string;
    description: string;
    pointsCost: number;
    available: boolean;
  }>;
}

const TIER_CONFIG = {
  BRONZE: { label: 'Bronz', color: 'from-amber-600 to-amber-800', icon: Star, min: 0 },
  SILVER: { label: 'Gümüş', color: 'from-gray-400 to-gray-600', icon: Award, min: 1000 },
  GOLD: { label: 'Altın', color: 'from-yellow-400 to-yellow-600', icon: Trophy, min: 5000 },
  DIAMOND: { label: 'Elmas', color: 'from-blue-400 to-purple-600', icon: Zap, min: 25000 },
};

export default function LoyaltyPage() {
  const [data, setData] = useState<LoyaltyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'history' | 'rewards'>('rewards');

  useEffect(() => {
    api.get('/users/loyalty')
      .then(({ data }) => setData(data.data))
      .catch(() => {
        setData({
          points: 2450,
          tier: 'SILVER',
          nextTier: 'GOLD',
          pointsToNextTier: 2550,
          totalEarned: 3200,
          totalRedeemed: 750,
          history: [
            { id: '1', type: 'EARNED', points: 500, description: 'Müzayede kazanımı - Osmanlı tablosu', createdAt: '2026-02-20' },
            { id: '2', type: 'EARNED', points: 150, description: 'Referans ödülü', createdAt: '2026-02-15' },
            { id: '3', type: 'REDEEMED', points: -250, description: 'Komisyon indirimi kullanıldı', createdAt: '2026-02-10' },
            { id: '4', type: 'EARNED', points: 300, description: 'İlk teklif bonusu', createdAt: '2026-01-28' },
          ],
          rewards: [
            { id: 'r1', title: '%5 Komisyon İndirimi', description: 'Bir sonraki alışverişinizde alıcı komisyonundan %5 indirim', pointsCost: 500, available: true },
            { id: 'r2', title: 'Ücretsiz Kargo', description: 'Bir sipariş için ücretsiz standart kargo', pointsCost: 750, available: true },
            { id: 'r3', title: 'VIP Erken Erişim', description: '24 saat önce müzayedelere teklif verme hakkı', pointsCost: 1500, available: true },
            { id: 'r4', title: 'Beyaz Eldiven Kargo', description: 'Bir sipariş için ücretsiz beyaz eldiven kargo', pointsCost: 3000, available: false },
          ],
        });
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading || !data) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/3" />
          <div className="h-48 bg-gray-200 rounded-xl" />
        </div>
      </div>
    );
  }

  const tierConfig = TIER_CONFIG[data.tier];
  const TierIcon = tierConfig.icon;
  const progress = data.nextTier
    ? ((data.points - TIER_CONFIG[data.tier].min) / (TIER_CONFIG[data.tier].min + data.pointsToNextTier - TIER_CONFIG[data.tier].min)) * 100
    : 100;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Tier Card */}
      <div className={`bg-gradient-to-r ${tierConfig.color} rounded-2xl p-8 text-white mb-8`}>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <TierIcon className="w-8 h-8" />
              <h1 className="text-3xl font-bold">{tierConfig.label} Üye</h1>
            </div>
            <p className="text-white/80 text-sm mb-6">Müzayede sadakat programı</p>

            <div className="flex items-baseline gap-1">
              <span className="text-4xl font-bold">{data.points.toLocaleString()}</span>
              <span className="text-white/70">puan</span>
            </div>
          </div>

          <div className="text-right">
            <div className="flex gap-4">
              <div>
                <p className="text-white/60 text-xs">Kazanılan</p>
                <p className="font-bold">{data.totalEarned.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-white/60 text-xs">Harcanan</p>
                <p className="font-bold">{data.totalRedeemed.toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>

        {data.nextTier && (
          <div className="mt-6">
            <div className="flex items-center justify-between text-sm text-white/80 mb-2">
              <span>{tierConfig.label}</span>
              <span>{data.nextTier} seviyesine {data.pointsToNextTier.toLocaleString()} puan</span>
            </div>
            <div className="h-3 bg-white/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-white rounded-full transition-all"
                style={{ width: `${Math.min(100, progress)}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* How to earn */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-xl border p-4 text-center">
          <Gavel className="w-8 h-8 text-blue-500 mx-auto mb-2" />
          <p className="font-bold text-gray-900">+500</p>
          <p className="text-xs text-gray-500">Müzayede Kazanın</p>
        </div>
        <div className="bg-white rounded-xl border p-4 text-center">
          <ShoppingBag className="w-8 h-8 text-green-500 mx-auto mb-2" />
          <p className="font-bold text-gray-900">+100</p>
          <p className="text-xs text-gray-500">İlk Teklif Verin</p>
        </div>
        <div className="bg-white rounded-xl border p-4 text-center">
          <Gift className="w-8 h-8 text-orange-500 mx-auto mb-2" />
          <p className="font-bold text-gray-900">+150</p>
          <p className="text-xs text-gray-500">Arkadaş Davet Edin</p>
        </div>
        <div className="bg-white rounded-xl border p-4 text-center">
          <TrendingUp className="w-8 h-8 text-purple-500 mx-auto mb-2" />
          <p className="font-bold text-gray-900">+50</p>
          <p className="text-xs text-gray-500">Profil Tamamlayın</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b mb-6">
        <button
          onClick={() => setTab('rewards')}
          className={`px-4 py-3 text-sm font-medium border-b-2 transition ${
            tab === 'rewards' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500'
          }`}
        >
          Ödüller
        </button>
        <button
          onClick={() => setTab('history')}
          className={`px-4 py-3 text-sm font-medium border-b-2 transition ${
            tab === 'history' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500'
          }`}
        >
          Puan Geçmişi
        </button>
      </div>

      {tab === 'rewards' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {data.rewards.map((reward) => (
            <div key={reward.id} className="bg-white rounded-xl border p-5 flex flex-col">
              <h3 className="font-semibold text-gray-900 mb-1">{reward.title}</h3>
              <p className="text-sm text-gray-500 flex-1 mb-4">{reward.description}</p>
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-blue-600">
                  {reward.pointsCost.toLocaleString()} puan
                </span>
                <button
                  disabled={!reward.available || data.points < reward.pointsCost}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-200 disabled:text-gray-400 text-white font-medium px-4 py-2 rounded-lg text-sm transition"
                >
                  {data.points < reward.pointsCost ? 'Yetersiz Puan' : reward.available ? 'Kullan' : 'Yakında'}
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl border divide-y">
          {data.history.map((item) => (
            <div key={item.id} className="flex items-center justify-between p-4">
              <div>
                <p className="text-sm font-medium text-gray-700">{item.description}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {new Date(item.createdAt).toLocaleDateString('tr-TR')}
                </p>
              </div>
              <span className={`font-bold ${
                item.type === 'EARNED' ? 'text-green-600' : 'text-red-500'
              }`}>
                {item.type === 'EARNED' ? '+' : ''}{item.points.toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
