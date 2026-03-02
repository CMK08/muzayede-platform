'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import {
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  Heart,
  Share2,
  Shield,
  Award,
  Package,
  Tag,
  Calendar,
  User,
  Maximize2,
} from 'lucide-react';

interface Product {
  id: string;
  title: string;
  shortDescription: string;
  descriptionHtml: string;
  condition: string;
  provenanceText: string;
  certificateUrl: string | null;
  estimateLow: number;
  estimateHigh: number;
  lotNumber: string;
  seller: { id: string; firstName: string; lastName: string; avatarUrl: string | null };
  category: { id: string; name: string; slug: string; parent?: { name: string } };
  media: Array<{ id: string; url: string; type: string; isPrimary: boolean; sortOrder: number }>;
  attributes: Array<{ key: string; value: string }>;
  tags: Array<{ tag: { id: string; name: string } }>;
  artist?: { id: string; name: string; nationality: string };
  lots: Array<{ auction: { id: string; title: string; status: string; startDate: string; currentPrice: number } }>;
  createdAt: string;
}

export default function ProductDetailPage() {
  const params = useParams();
  const productId = params.id as string;
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedMediaIndex, setSelectedMediaIndex] = useState(0);
  const [isZoomed, setIsZoomed] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);

  useEffect(() => {
    if (!productId) return;
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
    fetch(`${apiUrl}/products/${productId}`)
      .then((r) => r.json())
      .then((data) => {
        setProduct(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [productId]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="animate-pulse space-y-4">
          <div className="h-96 bg-gray-200 rounded-lg" />
          <div className="h-8 bg-gray-200 rounded w-2/3" />
          <div className="h-4 bg-gray-200 rounded w-1/2" />
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12 text-center">
        <h1 className="text-2xl font-bold">Ürün bulunamadı</h1>
        <Link href="/auctions" className="text-blue-600 hover:underline mt-4 inline-block">
          Müzayedelere dön
        </Link>
      </div>
    );
  }

  const media = product.media?.sort((a, b) => a.sortOrder - b.sortOrder) || [];
  const currentMedia = media[selectedMediaIndex];
  const activeAuction = product.lots?.find((l) => l.auction?.status === 'LIVE' || l.auction?.status === 'PUBLISHED');

  function formatCurrency(amount: number) {
    return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(amount);
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Breadcrumb */}
      <nav className="flex items-center text-sm text-gray-500 mb-6 space-x-2">
        <Link href="/" className="hover:text-gray-700">Ana Sayfa</Link>
        <span>/</span>
        {product.category?.parent && (
          <>
            <span>{product.category.parent.name}</span>
            <span>/</span>
          </>
        )}
        <span>{product.category?.name}</span>
        <span>/</span>
        <span className="text-gray-900 font-medium">{product.title}</span>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left: Media Gallery */}
        <div>
          {/* Main Image */}
          <div
            className="relative aspect-square bg-gray-100 rounded-xl overflow-hidden cursor-zoom-in group"
            onClick={() => setIsZoomed(true)}
          >
            {currentMedia ? (
              currentMedia.type === 'VIDEO' ? (
                <video src={currentMedia.url} controls className="w-full h-full object-contain" />
              ) : (
                <Image
                  src={currentMedia.url}
                  alt={product.title}
                  fill
                  className="object-contain group-hover:scale-105 transition-transform duration-300"
                />
              )
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400">
                <Package className="w-16 h-16" />
              </div>
            )}

            <button className="absolute top-4 right-4 bg-white/80 backdrop-blur-sm p-2 rounded-full hover:bg-white transition">
              <ZoomIn className="w-5 h-5" />
            </button>

            {/* Navigation arrows */}
            {media.length > 1 && (
              <>
                <button
                  onClick={(e) => { e.stopPropagation(); setSelectedMediaIndex((prev) => (prev > 0 ? prev - 1 : media.length - 1)); }}
                  className="absolute left-3 top-1/2 -translate-y-1/2 bg-white/80 backdrop-blur-sm p-2 rounded-full hover:bg-white"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); setSelectedMediaIndex((prev) => (prev < media.length - 1 ? prev + 1 : 0)); }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 bg-white/80 backdrop-blur-sm p-2 rounded-full hover:bg-white"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </>
            )}
          </div>

          {/* Thumbnails */}
          {media.length > 1 && (
            <div className="flex gap-2 mt-4 overflow-x-auto pb-2">
              {media.map((m, i) => (
                <button
                  key={m.id}
                  onClick={() => setSelectedMediaIndex(i)}
                  className={`relative w-20 h-20 flex-shrink-0 rounded-lg overflow-hidden border-2 transition ${
                    i === selectedMediaIndex ? 'border-blue-600' : 'border-transparent hover:border-gray-300'
                  }`}
                >
                  <Image src={m.url} alt="" fill className="object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right: Product Info */}
        <div className="space-y-6">
          {/* Title & Actions */}
          <div>
            <div className="flex items-start justify-between">
              <div>
                {product.lotNumber && (
                  <span className="text-sm font-medium text-gray-500 mb-1 block">
                    Lot #{product.lotNumber}
                  </span>
                )}
                <h1 className="text-3xl font-bold text-gray-900">{product.title}</h1>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setIsFavorite(!isFavorite)}
                  className={`p-2 rounded-full border ${isFavorite ? 'bg-red-50 border-red-200 text-red-600' : 'border-gray-200 text-gray-400 hover:text-red-500'}`}
                >
                  <Heart className="w-5 h-5" fill={isFavorite ? 'currentColor' : 'none'} />
                </button>
                <button className="p-2 rounded-full border border-gray-200 text-gray-400 hover:text-blue-500">
                  <Share2 className="w-5 h-5" />
                </button>
              </div>
            </div>

            {product.artist && (
              <Link
                href={`/artists/${product.artist.id}`}
                className="text-lg text-blue-600 hover:underline mt-1 inline-block"
              >
                {product.artist.name}
              </Link>
            )}

            {product.shortDescription && (
              <p className="text-gray-600 mt-3">{product.shortDescription}</p>
            )}
          </div>

          {/* Estimate */}
          <div className="bg-gray-50 rounded-xl p-5">
            <p className="text-sm text-gray-500 font-medium mb-1">Tahmini Değer</p>
            <p className="text-2xl font-bold text-gray-900">
              {formatCurrency(product.estimateLow)} — {formatCurrency(product.estimateHigh)}
            </p>

            {activeAuction && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <p className="text-sm text-gray-500 mb-1">Aktif Müzayede</p>
                <Link
                  href={`/auctions/${activeAuction.auction.id}`}
                  className="text-blue-600 hover:underline font-medium"
                >
                  {activeAuction.auction.title}
                </Link>
                {activeAuction.auction.currentPrice > 0 && (
                  <p className="text-lg font-bold text-green-600 mt-1">
                    Güncel: {formatCurrency(activeAuction.auction.currentPrice)}
                  </p>
                )}
                <Link
                  href={`/auctions/${activeAuction.auction.id}`}
                  className="mt-3 inline-block w-full text-center bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg transition"
                >
                  Teklif Ver
                </Link>
              </div>
            )}
          </div>

          {/* Details */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Detaylar</h2>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center gap-2 text-sm">
                <Tag className="w-4 h-4 text-gray-400" />
                <span className="text-gray-500">Kategori:</span>
                <span className="font-medium">{product.category?.name}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Shield className="w-4 h-4 text-gray-400" />
                <span className="text-gray-500">Durum:</span>
                <span className="font-medium">
                  {product.condition === 'NEW' ? 'Yeni' : product.condition === 'USED' ? 'Kullanılmış' : 'Restore'}
                </span>
              </div>
              {product.artist && (
                <div className="flex items-center gap-2 text-sm">
                  <User className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-500">Sanatçı:</span>
                  <span className="font-medium">{product.artist.name}</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="w-4 h-4 text-gray-400" />
                <span className="text-gray-500">Eklenme:</span>
                <span className="font-medium">{new Date(product.createdAt).toLocaleDateString('tr-TR')}</span>
              </div>
            </div>

            {/* Custom Attributes */}
            {product.attributes?.length > 0 && (
              <div className="border rounded-lg divide-y">
                {product.attributes.map((attr) => (
                  <div key={attr.key} className="flex justify-between px-4 py-2 text-sm">
                    <span className="text-gray-500">{attr.key}</span>
                    <span className="font-medium">{attr.value}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Tags */}
            {product.tags?.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {product.tags.map((t) => (
                  <span key={t.tag.id} className="bg-gray-100 text-gray-700 text-xs px-3 py-1 rounded-full">
                    {t.tag.name}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Provenance */}
          {product.provenanceText && (
            <div className="space-y-2">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Award className="w-5 h-5 text-amber-500" />
                Provenance (Sahiplik Geçmişi)
              </h2>
              <p className="text-gray-600 text-sm whitespace-pre-line">{product.provenanceText}</p>
              {product.certificateUrl && (
                <a
                  href={product.certificateUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 text-sm hover:underline"
                >
                  Sertifika / Ekspertiz Raporu
                </a>
              )}
            </div>
          )}

          {/* Seller Info */}
          {product.seller && (
            <div className="border rounded-lg p-4 flex items-center gap-3">
              <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                {product.seller.avatarUrl ? (
                  <Image src={product.seller.avatarUrl} alt="" width={40} height={40} className="rounded-full" />
                ) : (
                  <User className="w-5 h-5 text-gray-400" />
                )}
              </div>
              <div>
                <p className="font-medium text-sm">
                  {product.seller.firstName} {product.seller.lastName}
                </p>
                <p className="text-xs text-gray-500">Satıcı</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Description Section */}
      {product.descriptionHtml && (
        <div className="mt-12">
          <h2 className="text-2xl font-bold mb-4">Açıklama</h2>
          <div
            className="prose prose-gray max-w-none"
            dangerouslySetInnerHTML={{ __html: product.descriptionHtml }}
          />
        </div>
      )}

      {/* Fullscreen Zoom Modal */}
      {isZoomed && currentMedia && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
          onClick={() => setIsZoomed(false)}
        >
          <button
            className="absolute top-4 right-4 text-white p-2 hover:bg-white/10 rounded-full"
            onClick={() => setIsZoomed(false)}
          >
            <Maximize2 className="w-6 h-6" />
          </button>
          <Image
            src={currentMedia.url}
            alt={product.title}
            width={1200}
            height={1200}
            className="max-w-[90vw] max-h-[90vh] object-contain"
          />
        </div>
      )}
    </div>
  );
}
