'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import NextImage from 'next/image';
import Link from 'next/link';
import { ArrowLeft, Calendar, Package, User, Layers } from 'lucide-react';

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

interface ExhibitionDetail {
  id: string;
  title: string;
  description: string | null;
  coverImageUrl: string | null;
  startDate: string;
  endDate: string;
  layout: string;
  products: Array<{
    id: string;
    title: string;
    shortDescription: string;
    estimateLow: number;
    estimateHigh: number;
    artist?: { id: string; name: string };
    media: Array<{ url: string; isPrimary: boolean }>;
  }>;
}

export default function ExhibitionDetailPage() {
  const params = useParams();
  const exhibitionId = params.id as string;
  const [exhibition, setExhibition] = useState<ExhibitionDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!exhibitionId) return;
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
    fetch(`${apiUrl}/exhibitions/${exhibitionId}`)
      .then((r) => r.json())
      .then((data) => {
        setExhibition(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [exhibitionId]);

  function formatCurrency(amount: number) {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY',
      maximumFractionDigits: 0,
    }).format(amount);
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="animate-pulse space-y-6">
          <div className="h-64 bg-gray-200 rounded-2xl" />
          <div className="h-8 bg-gray-200 rounded w-1/3" />
          <div className="h-4 bg-gray-200 rounded w-2/3" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-8">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="aspect-square bg-gray-200 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!exhibition) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12 text-center">
        <h1 className="text-2xl font-bold">Sergi bulunamadı</h1>
        <Link href="/exhibitions" className="text-blue-600 hover:underline mt-4 inline-block">
          Sergilere dön
        </Link>
      </div>
    );
  }

  const layoutClass =
    exhibition.layout === 'masonry'
      ? 'columns-2 md:columns-3 lg:columns-4 gap-4 space-y-4'
      : exhibition.layout === 'slider'
        ? 'flex gap-6 overflow-x-auto pb-4 snap-x snap-mandatory'
        : 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6';

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <Link
        href="/exhibitions"
        className="flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-6 text-sm"
      >
        <ArrowLeft className="w-4 h-4" /> Sergiler
      </Link>

      {/* Hero */}
      <div className="relative rounded-2xl overflow-hidden mb-8">
        {exhibition.coverImageUrl ? (
          <div className="relative h-72 md:h-96">
            <SafeImage
              src={exhibition.coverImageUrl}
              alt={exhibition.title}
              fill
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-8">
              <h1 className="text-4xl font-bold text-white">{exhibition.title}</h1>
              <div className="flex items-center gap-4 mt-3 text-white/80 text-sm">
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4" />
                  {new Date(exhibition.startDate).toLocaleDateString('tr-TR', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}{' '}
                  –{' '}
                  {new Date(exhibition.endDate).toLocaleDateString('tr-TR', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </span>
                <span className="flex items-center gap-1.5">
                  <Package className="w-4 h-4" />
                  {exhibition.products?.length || 0} eser
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-gradient-to-br from-indigo-50 to-purple-50 p-8 rounded-2xl">
            <h1 className="text-4xl font-bold text-gray-900">{exhibition.title}</h1>
            <div className="flex items-center gap-4 mt-3 text-gray-500 text-sm">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4" />
                {new Date(exhibition.startDate).toLocaleDateString('tr-TR')} –{' '}
                {new Date(exhibition.endDate).toLocaleDateString('tr-TR')}
              </span>
            </div>
          </div>
        )}
      </div>

      {exhibition.description && (
        <p className="text-gray-600 text-lg leading-relaxed max-w-4xl mb-10">
          {exhibition.description}
        </p>
      )}

      {/* Products */}
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Eserler</h2>

      {exhibition.products?.length > 0 ? (
        <div className={layoutClass}>
          {exhibition.products.map((product) => {
            const primaryMedia =
              product.media?.find((m) => m.isPrimary) || product.media?.[0];

            return (
              <Link
                key={product.id}
                href={`/products/${product.id}`}
                className={`group bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition border ${
                  exhibition.layout === 'slider'
                    ? 'min-w-[280px] snap-start flex-shrink-0'
                    : exhibition.layout === 'masonry'
                      ? 'break-inside-avoid'
                      : ''
                }`}
              >
                <div className="relative aspect-square bg-gray-100">
                  {primaryMedia ? (
                    <SafeImage
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
                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-gray-900 group-hover:text-indigo-600 line-clamp-2 transition text-sm">
                    {product.title}
                  </h3>
                  {product.artist && (
                    <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                      <User className="w-3 h-3" /> {product.artist.name}
                    </p>
                  )}
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
          <Layers className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p>Henüz eser eklenmemiş.</p>
        </div>
      )}
    </div>
  );
}
