'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { MapPin, Calendar, TrendingUp, Package, User, ArrowLeft } from 'lucide-react';

interface ArtistDetail {
  id: string;
  name: string;
  biography: string | null;
  photoUrl: string | null;
  birthYear: number | null;
  nationality: string | null;
  priceIndex: number | null;
  products: Array<{
    id: string;
    title: string;
    shortDescription: string;
    estimateLow: number;
    estimateHigh: number;
    media: Array<{ url: string; isPrimary: boolean }>;
    lots: Array<{ auction: { id: string; title: string; status: string } }>;
  }>;
}

export default function ArtistDetailPage() {
  const params = useParams();
  const artistId = params.id as string;
  const [artist, setArtist] = useState<ArtistDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!artistId) return;
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
    fetch(`${apiUrl}/artists/${artistId}`)
      .then((r) => r.json())
      .then((data) => { setArtist(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [artistId]);

  function formatCurrency(amount: number) {
    return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(amount);
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="animate-pulse space-y-6">
          <div className="flex items-center gap-6">
            <div className="w-32 h-32 bg-gray-200 rounded-full" />
            <div className="space-y-3 flex-1">
              <div className="h-8 bg-gray-200 rounded w-1/3" />
              <div className="h-4 bg-gray-200 rounded w-1/4" />
            </div>
          </div>
          <div className="h-32 bg-gray-200 rounded" />
        </div>
      </div>
    );
  }

  if (!artist) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12 text-center">
        <h1 className="text-2xl font-bold">Sanatçı bulunamadı</h1>
        <Link href="/artists" className="text-blue-600 hover:underline mt-4 inline-block">Sanatçı dizinine dön</Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Back */}
      <Link href="/artists" className="flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-6 text-sm">
        <ArrowLeft className="w-4 h-4" /> Sanatçı Dizini
      </Link>

      {/* Artist Header */}
      <div className="bg-white rounded-2xl shadow-sm border p-8 mb-8">
        <div className="flex flex-col md:flex-row items-start gap-8">
          <div className="w-40 h-40 rounded-full overflow-hidden bg-gray-100 flex-shrink-0">
            {artist.photoUrl ? (
              <Image src={artist.photoUrl} alt={artist.name} width={160} height={160} className="object-cover w-full h-full" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <User className="w-16 h-16 text-gray-300" />
              </div>
            )}
          </div>

          <div className="flex-1">
            <h1 className="text-4xl font-bold text-gray-900">{artist.name}</h1>

            <div className="flex flex-wrap items-center gap-4 mt-3">
              {artist.nationality && (
                <span className="flex items-center gap-1.5 text-gray-600">
                  <MapPin className="w-4 h-4" /> {artist.nationality}
                </span>
              )}
              {artist.birthYear && (
                <span className="flex items-center gap-1.5 text-gray-600">
                  <Calendar className="w-4 h-4" /> d. {artist.birthYear}
                </span>
              )}
              {artist.priceIndex !== null && artist.priceIndex > 0 && (
                <span className="flex items-center gap-1.5 text-amber-700 bg-amber-50 px-3 py-1 rounded-full text-sm font-medium">
                  <TrendingUp className="w-4 h-4" /> Fiyat Endeksi: {artist.priceIndex.toFixed(1)}
                </span>
              )}
              <span className="flex items-center gap-1.5 text-gray-500 text-sm">
                <Package className="w-4 h-4" /> {artist.products?.length || 0} eser
              </span>
            </div>

            {artist.biography && (
              <p className="text-gray-600 mt-4 leading-relaxed max-w-3xl">{artist.biography}</p>
            )}
          </div>
        </div>
      </div>

      {/* Works */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Eserler</h2>

        {artist.products?.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {artist.products.map((product) => {
              const primaryMedia = product.media?.find((m) => m.isPrimary) || product.media?.[0];
              const activeAuction = product.lots?.find((l) =>
                l.auction?.status === 'LIVE' || l.auction?.status === 'PUBLISHED'
              );

              return (
                <Link
                  key={product.id}
                  href={`/products/${product.id}`}
                  className="group bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition border"
                >
                  <div className="relative aspect-square bg-gray-100">
                    {primaryMedia ? (
                      <Image
                        src={primaryMedia.url}
                        alt={product.title}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-300">
                        <Package className="w-12 h-12" />
                      </div>
                    )}
                    {activeAuction && (
                      <span className="absolute top-3 left-3 bg-green-600 text-white text-xs font-bold px-2 py-1 rounded">
                        Müzayedede
                      </span>
                    )}
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 line-clamp-2 transition text-sm">
                      {product.title}
                    </h3>
                    <p className="text-sm text-gray-500 mt-2">
                      {formatCurrency(product.estimateLow)} — {formatCurrency(product.estimateHigh)}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500">
            <Package className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>Henüz eser bulunmuyor.</p>
          </div>
        )}
      </div>
    </div>
  );
}
