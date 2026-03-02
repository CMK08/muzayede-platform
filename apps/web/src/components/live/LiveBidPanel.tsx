'use client';

import { useEffect, useState } from 'react';
import { Socket } from 'socket.io-client';

interface BidData {
  bidId: string;
  userId: string;
  amount: number;
  type: string;
  auctionId: string;
  timestamp: string;
}

interface LotData {
  lotNumber: number;
  productTitle: string;
  currentBid: number;
  startPrice: number;
  estimateLow?: number;
  estimateHigh?: number;
}

interface LiveBidPanelProps {
  socket: Socket | null;
  auctionId: string;
  userId: string;
  token: string;
}

export default function LiveBidPanel({
  socket,
  auctionId,
  userId,
  token,
}: LiveBidPanelProps) {
  const [currentLot, setCurrentLot] = useState<LotData | null>(null);
  const [currentBid, setCurrentBid] = useState(0);
  const [bidHistory, setBidHistory] = useState<BidData[]>([]);
  const [auctioneerCall, setAuctioneerCall] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [nextBidAmount, setNextBidAmount] = useState(0);

  useEffect(() => {
    if (!socket) return;

    socket.on('lot-opened', (data) => {
      setCurrentLot({
        lotNumber: data.lotNumber,
        productTitle: data.productTitle || `Lot #${data.lotNumber}`,
        currentBid: data.startPrice || 0,
        startPrice: data.startPrice || 0,
        estimateLow: data.estimateLow,
        estimateHigh: data.estimateHigh,
      });
      setCurrentBid(data.startPrice || 0);
      setBidHistory([]);
      setAuctioneerCall(null);
    });

    socket.on('new-bid', (data: BidData) => {
      setCurrentBid(data.amount);
      setBidHistory((prev) => [data, ...prev.slice(0, 19)]);
      setAuctioneerCall(null);
    });

    socket.on('lot-sold', (data) => {
      setAuctioneerCall(
        `SATILDI! Lot #${data.lotNumber} — ${formatCurrency(data.hammerPrice)}`,
      );
    });

    socket.on('going-once', () => {
      setAuctioneerCall('BİR KEZ! (Going Once)');
    });

    socket.on('going-twice', () => {
      setAuctioneerCall('İKİ KEZ! (Going Twice)');
    });

    return () => {
      socket.off('lot-opened');
      socket.off('new-bid');
      socket.off('lot-sold');
      socket.off('going-once');
      socket.off('going-twice');
    };
  }, [socket]);

  useEffect(() => {
    // Calculate next bid amount (10% increment or minimum increment)
    const increment = Math.max(currentBid * 0.1, 100);
    setNextBidAmount(Math.ceil((currentBid + increment) / 100) * 100);
  }, [currentBid]);

  async function handlePlaceBid() {
    if (!token || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const apiUrl =
        process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

      const response = await fetch(`${apiUrl}/bids`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          auctionId,
          amount: nextBidAmount,
          type: 'MANUAL',
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        alert(error.message || 'Teklif gönderilemedi');
      }
    } catch {
      alert('Bağlantı hatası');
    } finally {
      setIsSubmitting(false);
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
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
      {/* Current lot info */}
      {currentLot ? (
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-gray-500 uppercase">
              Lot #{currentLot.lotNumber}
            </span>
            {currentLot.estimateLow && currentLot.estimateHigh && (
              <span className="text-xs text-gray-400">
                Tahmin: {formatCurrency(currentLot.estimateLow)} -{' '}
                {formatCurrency(currentLot.estimateHigh)}
              </span>
            )}
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {currentLot.productTitle}
          </h3>
        </div>
      ) : (
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 text-center text-gray-500">
          Lot bekleniyor...
        </div>
      )}

      {/* Auctioneer call banner */}
      {auctioneerCall && (
        <div className="bg-red-600 text-white text-center py-2 px-4 font-bold text-lg animate-pulse">
          {auctioneerCall}
        </div>
      )}

      {/* Current bid */}
      <div className="p-4 text-center bg-gray-50 dark:bg-gray-900">
        <p className="text-xs text-gray-500 uppercase font-medium mb-1">
          Güncel Teklif
        </p>
        <p className="text-3xl font-bold text-green-600">
          {formatCurrency(currentBid)}
        </p>
      </div>

      {/* Bid button */}
      <div className="p-4">
        <button
          onClick={handlePlaceBid}
          disabled={isSubmitting || !currentLot}
          className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-bold py-3 px-6 rounded-lg text-lg transition-colors"
        >
          {isSubmitting ? (
            'Gönderiliyor...'
          ) : (
            <>TEKLİF VER — {formatCurrency(nextBidAmount)}</>
          )}
        </button>
      </div>

      {/* Bid history */}
      <div className="border-t border-gray-200 dark:border-gray-700 max-h-48 overflow-y-auto">
        <div className="px-4 py-2 bg-gray-50 dark:bg-gray-900 sticky top-0">
          <h4 className="text-xs font-semibold text-gray-500 uppercase">
            Teklif Geçmişi
          </h4>
        </div>
        {bidHistory.length === 0 ? (
          <p className="p-4 text-sm text-gray-400 text-center">
            Henüz teklif yok
          </p>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {bidHistory.map((bid, i) => (
              <div
                key={bid.bidId || i}
                className="px-4 py-2 flex justify-between items-center text-sm"
              >
                <span className="text-gray-500">
                  {bid.userId === userId ? 'Siz' : `Alıcı ***${bid.userId.slice(-4)}`}
                </span>
                <span className="font-semibold text-gray-900 dark:text-white">
                  {formatCurrency(bid.amount)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
