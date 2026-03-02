'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Search, MapPin, User } from 'lucide-react';

interface Artist {
  id: string;
  name: string;
  biography: string | null;
  photoUrl: string | null;
  birthYear: number | null;
  nationality: string | null;
  priceIndex: number | null;
  _count?: { products: number };
}

export default function ArtistsPage() {
  const [artists, setArtists] = useState<Artist[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'priceIndex'>('name');

  useEffect(() => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
    fetch(`${apiUrl}/artists`)
      .then((r) => r.json())
      .then((data) => {
        setArtists(Array.isArray(data) ? data : data.data || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const filteredArtists = artists
    .filter((a) => a.name.toLowerCase().includes(search.toLowerCase()) ||
      (a.nationality && a.nationality.toLowerCase().includes(search.toLowerCase())))
    .sort((a, b) => {
      if (sortBy === 'priceIndex') return (b.priceIndex || 0) - (a.priceIndex || 0);
      return a.name.localeCompare(b.name, 'tr');
    });

  // Group by first letter
  const grouped = filteredArtists.reduce<Record<string, Artist[]>>((acc, artist) => {
    const letter = artist.name[0].toUpperCase();
    if (!acc[letter]) acc[letter] = [];
    acc[letter].push(artist);
    return acc;
  }, {});

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="text-center mb-10">
        <h1 className="text-4xl font-bold text-gray-900">Sanatçı Dizini</h1>
        <p className="text-gray-600 mt-2 max-w-2xl mx-auto">
          Platformumuzdaki tüm sanatçıları keşfedin. Eserlerini inceleyin, fiyat endekslerini takip edin.
        </p>
      </div>

      {/* Search & Sort */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between mb-8 max-w-3xl mx-auto">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Sanatçı adı veya ülke ara..."
            className="w-full pl-10 pr-4 py-3 border rounded-xl focus:border-blue-500 focus:outline-none"
          />
        </div>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as 'name' | 'priceIndex')}
          className="border rounded-xl px-4 py-3"
        >
          <option value="name">Ada Göre</option>
          <option value="priceIndex">Fiyat Endeksi</option>
        </select>
      </div>

      {/* Artist Count */}
      <p className="text-sm text-gray-500 mb-6">{filteredArtists.length} sanatçı</p>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="animate-pulse flex gap-4 items-center p-4">
              <div className="w-16 h-16 bg-gray-200 rounded-full" />
              <div className="flex-1">
                <div className="h-4 bg-gray-200 rounded w-3/4" />
                <div className="h-3 bg-gray-200 rounded w-1/2 mt-2" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b, 'tr')).map(([letter, letterArtists]) => (
            <div key={letter}>
              <h2 className="text-2xl font-bold text-gray-300 mb-4 border-b pb-2">{letter}</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {letterArtists.map((artist) => (
                  <Link
                    key={artist.id}
                    href={`/artists/${artist.id}`}
                    className="flex items-center gap-4 p-4 rounded-xl hover:bg-gray-50 transition group"
                  >
                    <div className="w-16 h-16 rounded-full overflow-hidden bg-gray-100 flex-shrink-0">
                      {artist.photoUrl ? (
                        <Image src={artist.photoUrl} alt={artist.name} width={64} height={64} className="object-cover w-full h-full" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                          <User className="w-8 h-8" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition truncate">
                        {artist.name}
                      </h3>
                      <div className="flex items-center gap-3 mt-1">
                        {artist.nationality && (
                          <span className="flex items-center gap-1 text-xs text-gray-500">
                            <MapPin className="w-3 h-3" />
                            {artist.nationality}
                          </span>
                        )}
                        {artist.birthYear && (
                          <span className="text-xs text-gray-500">d. {artist.birthYear}</span>
                        )}
                      </div>
                      {artist.priceIndex !== null && artist.priceIndex > 0 && (
                        <div className="mt-1">
                          <span className="text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full font-medium">
                            Endeks: {artist.priceIndex.toFixed(1)}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="text-right text-xs text-gray-400">
                      {artist._count?.products || 0} eser
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
