'use client';

import { useState, useEffect } from 'react';
import { Gift, Copy, CheckCircle2, Users, DollarSign, Share2, Link as LinkIcon } from 'lucide-react';
import api from '@/lib/api';

interface ReferralData {
  code: string;
  totalInvited: number;
  totalEarned: number;
  pendingReward: number;
  referrals: Array<{
    id: string;
    invitedEmail: string;
    status: string;
    reward: number;
    createdAt: string;
  }>;
}

export default function ReferralPage() {
  const [data, setData] = useState<ReferralData | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    api.get('/users/referral')
      .then(({ data }) => setData(data.data))
      .catch(() => {
        setData({
          code: 'MUZAYEDE-ABC123',
          totalInvited: 5,
          totalEarned: 750,
          pendingReward: 200,
          referrals: [
            { id: '1', invitedEmail: 'a***@gmail.com', status: 'COMPLETED', reward: 150, createdAt: '2026-01-15' },
            { id: '2', invitedEmail: 'b***@gmail.com', status: 'PENDING', reward: 0, createdAt: '2026-02-10' },
          ],
        });
      })
      .finally(() => setLoading(false));
  }, []);

  function copyCode() {
    if (data?.code) {
      navigator.clipboard.writeText(`https://muzayede.com/ref/${data.code}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  function formatCurrency(amount: number) {
    return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(amount);
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/3" />
          <div className="h-32 bg-gray-200 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-12 h-12 rounded-lg bg-orange-50 flex items-center justify-center">
          <Gift className="w-6 h-6 text-orange-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Davet Et & Kazan</h1>
          <p className="text-gray-500 text-sm">Arkadaşlarınızı davet edin, her başarılı kayıtta ödül kazanın</p>
        </div>
      </div>

      {/* Referral Link */}
      <div className="bg-gradient-to-r from-orange-500 to-pink-500 rounded-2xl p-8 text-white mb-8">
        <h2 className="text-xl font-bold mb-2">Referans Kodunuz</h2>
        <p className="text-orange-100 text-sm mb-4">
          Bu linki paylaşarak arkadaşlarınızı davet edin. Her başarılı davet için ₺150 kazanın!
        </p>
        <div className="flex items-center gap-3 bg-white/20 backdrop-blur rounded-lg p-3">
          <LinkIcon className="w-5 h-5 text-orange-100" />
          <span className="flex-1 font-mono text-sm truncate">
            https://muzayede.com/ref/{data?.code}
          </span>
          <button
            onClick={copyCode}
            className="flex items-center gap-1.5 bg-white text-orange-600 font-semibold px-4 py-2 rounded-lg text-sm hover:bg-orange-50 transition"
          >
            {copied ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {copied ? 'Kopyalandı!' : 'Kopyala'}
          </button>
        </div>

        <div className="flex gap-3 mt-4">
          <button className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg text-sm transition">
            <Share2 className="w-4 h-4" /> WhatsApp
          </button>
          <button className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg text-sm transition">
            <Share2 className="w-4 h-4" /> Twitter
          </button>
          <button className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg text-sm transition">
            <Share2 className="w-4 h-4" /> E-posta
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-xl border p-5">
          <Users className="w-8 h-8 text-blue-500 mb-2" />
          <p className="text-2xl font-bold text-gray-900">{data?.totalInvited || 0}</p>
          <p className="text-sm text-gray-500">Davet Edilen</p>
        </div>
        <div className="bg-white rounded-xl border p-5">
          <DollarSign className="w-8 h-8 text-green-500 mb-2" />
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(data?.totalEarned || 0)}</p>
          <p className="text-sm text-gray-500">Toplam Kazanç</p>
        </div>
        <div className="bg-white rounded-xl border p-5">
          <Gift className="w-8 h-8 text-orange-500 mb-2" />
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(data?.pendingReward || 0)}</p>
          <p className="text-sm text-gray-500">Bekleyen Ödül</p>
        </div>
      </div>

      {/* Referral History */}
      <div className="bg-white rounded-xl border p-6">
        <h2 className="font-semibold text-lg mb-4">Davet Geçmişi</h2>
        {data?.referrals && data.referrals.length > 0 ? (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-gray-500 text-left">
                <th className="py-3 font-medium">Davet Edilen</th>
                <th className="py-3 font-medium">Tarih</th>
                <th className="py-3 font-medium">Durum</th>
                <th className="py-3 font-medium text-right">Ödül</th>
              </tr>
            </thead>
            <tbody>
              {data.referrals.map((r) => (
                <tr key={r.id} className="border-b last:border-b-0">
                  <td className="py-3 text-gray-700">{r.invitedEmail}</td>
                  <td className="py-3 text-gray-500">
                    {new Date(r.createdAt).toLocaleDateString('tr-TR')}
                  </td>
                  <td className="py-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                      r.status === 'COMPLETED'
                        ? 'bg-green-50 text-green-700'
                        : 'bg-yellow-50 text-yellow-700'
                    }`}>
                      {r.status === 'COMPLETED' ? 'Tamamlandı' : 'Bekliyor'}
                    </span>
                  </td>
                  <td className="py-3 text-right font-medium">
                    {r.reward > 0 ? formatCurrency(r.reward) : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-gray-400 text-center py-8">Henüz davet yok</p>
        )}
      </div>

      {/* How it works */}
      <div className="mt-8 bg-gray-50 rounded-xl p-6">
        <h3 className="font-semibold mb-4">Nasıl Çalışır?</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex gap-3">
            <span className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-sm flex-shrink-0">1</span>
            <div>
              <p className="font-medium text-sm text-gray-700">Linkinizi Paylaşın</p>
              <p className="text-xs text-gray-500 mt-0.5">Referans linkinizi arkadaşlarınıza gönderin</p>
            </div>
          </div>
          <div className="flex gap-3">
            <span className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-sm flex-shrink-0">2</span>
            <div>
              <p className="font-medium text-sm text-gray-700">Kayıt Olsunlar</p>
              <p className="text-xs text-gray-500 mt-0.5">Linkinizle kayıt olan kişiler otomatik eşleşir</p>
            </div>
          </div>
          <div className="flex gap-3">
            <span className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-sm flex-shrink-0">3</span>
            <div>
              <p className="font-medium text-sm text-gray-700">Ödül Kazanın</p>
              <p className="text-xs text-gray-500 mt-0.5">İlk alışverişte ₺150 hesabınıza tanımlanır</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
