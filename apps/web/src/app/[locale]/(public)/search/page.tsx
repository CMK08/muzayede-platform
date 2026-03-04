'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import NextImage from 'next/image';
import Link from 'next/link';
import { Search, SlidersHorizontal, X, Package } from 'lucide-react';

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

interface SearchResult {
  id: string;
  title: string;
  shortDescription: string;
  estimateLow: number;
  estimateHigh: number;
  condition: string;
  category: string;
  imageUrl: string | null;
  status: string;
}

interface Facets {
  categories: Array<{ key: string; doc_count: number }>;
  priceRanges: Array<{ key: string; from: number; to: number; doc_count: number }>;
  statuses: Array<{ key: string; doc_count: number }>;
}

export default function SearchPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialQuery = searchParams.get('q') || '';

  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [facets, setFacets] = useState<Facets | null>(null);
  const [totalHits, setTotalHits] = useState(0);
  const [loading, setLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // Filters
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [priceMin, setPriceMin] = useState<string>('');
  const [priceMax, setPriceMax] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('relevance');

  const performSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      setTotalHits(0);
      return;
    }

    setLoading(true);
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

    const params = new URLSearchParams({ q: searchQuery });
    if (selectedCategory) params.set('category', selectedCategory);
    if (priceMin) params.set('priceMin', priceMin);
    if (priceMax) params.set('priceMax', priceMax);
    if (sortBy !== 'relevance') params.set('sort', sortBy);

    try {
      const res = await fetch(`${apiUrl}/search?${params}`);
      const data = await res.json();
      setResults(data.hits || data.data || []);
      setTotalHits(data.total || data.hits?.length || 0);
      if (data.facets) setFacets(data.facets);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [selectedCategory, priceMin, priceMax, sortBy]);

  useEffect(() => {
    if (initialQuery) {
      performSearch(initialQuery);
    }
  }, [initialQuery, performSearch]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    router.push(`/search?q=${encodeURIComponent(query)}`);
    performSearch(query);
  }

  function formatCurrency(amount: number) {
    return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(amount);
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Search Bar */}
      <form onSubmit={handleSearch} className="relative max-w-3xl mx-auto mb-8">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ürün, sanatçı, kategori ara..."
            className="w-full pl-12 pr-4 py-4 text-lg border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none transition"
          />
          {query && (
            <button
              type="button"
              onClick={() => { setQuery(''); setResults([]); setTotalHits(0); }}
              className="absolute right-14 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
          )}
          <button
            type="submit"
            className="absolute right-2 top-1/2 -translate-y-1/2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition"
          >
            Ara
          </button>
        </div>
      </form>

      {/* Results Header */}
      {totalHits > 0 && (
        <div className="flex items-center justify-between mb-6">
          <p className="text-gray-600">
            <strong>{totalHits}</strong> sonuç bulundu
            {initialQuery && <> — &quot;{initialQuery}&quot;</>}
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 px-4 py-2 border rounded-lg text-sm hover:bg-gray-50 transition"
            >
              <SlidersHorizontal className="w-4 h-4" />
              Filtrele
            </button>
            <select
              value={sortBy}
              onChange={(e) => { setSortBy(e.target.value); performSearch(query); }}
              className="border rounded-lg px-3 py-2 text-sm"
            >
              <option value="relevance">Alakalı</option>
              <option value="price_asc">Fiyat: Düşükten Yükseğe</option>
              <option value="price_desc">Fiyat: Yüksekten Düşüğe</option>
              <option value="newest">En Yeni</option>
            </select>
          </div>
        </div>
      )}

      <div className="flex gap-8">
        {/* Sidebar Filters */}
        {showFilters && facets && (
          <div className="w-64 flex-shrink-0 space-y-6">
            {/* Categories */}
            {facets.categories?.length > 0 && (
              <div>
                <h3 className="font-semibold text-sm uppercase text-gray-500 mb-3">Kategoriler</h3>
                <div className="space-y-1">
                  <button
                    onClick={() => { setSelectedCategory(''); performSearch(query); }}
                    className={`block w-full text-left px-3 py-2 rounded text-sm ${!selectedCategory ? 'bg-blue-50 text-blue-700 font-medium' : 'hover:bg-gray-50'}`}
                  >
                    Tümü
                  </button>
                  {facets.categories.map((cat) => (
                    <button
                      key={cat.key}
                      onClick={() => { setSelectedCategory(cat.key); performSearch(query); }}
                      className={`block w-full text-left px-3 py-2 rounded text-sm ${selectedCategory === cat.key ? 'bg-blue-50 text-blue-700 font-medium' : 'hover:bg-gray-50'}`}
                    >
                      {cat.key} <span className="text-gray-400">({cat.doc_count})</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Price Range */}
            <div>
              <h3 className="font-semibold text-sm uppercase text-gray-500 mb-3">Fiyat Aralığı</h3>
              <div className="flex gap-2">
                <input
                  type="number"
                  placeholder="Min"
                  value={priceMin}
                  onChange={(e) => setPriceMin(e.target.value)}
                  className="w-full border rounded px-2 py-1.5 text-sm"
                />
                <span className="text-gray-400 self-center">-</span>
                <input
                  type="number"
                  placeholder="Max"
                  value={priceMax}
                  onChange={(e) => setPriceMax(e.target.value)}
                  className="w-full border rounded px-2 py-1.5 text-sm"
                />
              </div>
              <button
                onClick={() => performSearch(query)}
                className="mt-2 w-full text-sm bg-gray-100 hover:bg-gray-200 py-1.5 rounded transition"
              >
                Uygula
              </button>
            </div>
          </div>
        )}

        {/* Results Grid */}
        <div className="flex-1">
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="aspect-square bg-gray-200 rounded-lg" />
                  <div className="h-4 bg-gray-200 rounded mt-3 w-3/4" />
                  <div className="h-3 bg-gray-200 rounded mt-2 w-1/2" />
                </div>
              ))}
            </div>
          ) : results.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {results.map((item) => (
                <Link
                  key={item.id}
                  href={`/products/${item.id}`}
                  className="group block bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition"
                >
                  <div className="relative aspect-square bg-gray-100">
                    {item.imageUrl ? (
                      <SafeImage src={item.imageUrl} alt={item.title} fill className="object-cover group-hover:scale-105 transition-transform" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-300">
                        <Package className="w-12 h-12" />
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 line-clamp-2 transition">
                      {item.title}
                    </h3>
                    {item.category && (
                      <p className="text-xs text-gray-500 mt-1">{item.category}</p>
                    )}
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">
                        {formatCurrency(item.estimateLow)} - {formatCurrency(item.estimateHigh)}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        item.condition === 'NEW' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {item.condition === 'NEW' ? 'Yeni' : item.condition === 'USED' ? 'Kullanılmış' : 'Restore'}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : initialQuery ? (
            <div className="text-center py-16">
              <Search className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-700">Sonuç bulunamadı</h2>
              <p className="text-gray-500 mt-2">
                &quot;{initialQuery}&quot; için sonuç bulunamadı. Farklı terimlerle deneyin.
              </p>
            </div>
          ) : (
            <div className="text-center py-16">
              <Search className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-700">Arama yapın</h2>
              <p className="text-gray-500 mt-2">
                Ürün, sanatçı veya kategori aramak için yukarıdaki arama kutusunu kullanın.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
