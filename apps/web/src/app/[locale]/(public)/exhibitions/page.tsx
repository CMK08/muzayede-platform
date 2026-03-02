'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Calendar, Eye, Layers } from 'lucide-react';

interface Exhibition {
  id: string;
  title: string;
  description: string | null;
  coverImageUrl: string | null;
  startDate: string;
  endDate: string;
  layout: string;
  _count?: { products: number };
}

export default function ExhibitionsPage() {
  const [exhibitions, setExhibitions] = useState<Exhibition[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
    fetch(`${apiUrl}/exhibitions`)
      .then((r) => r.json())
      .then((data) => {
        setExhibitions(Array.isArray(data) ? data : data.data || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const now = new Date();

  const active = exhibitions.filter(
    (e) => new Date(e.startDate) <= now && new Date(e.endDate) >= now
  );
  const upcoming = exhibitions.filter((e) => new Date(e.startDate) > now);
  const past = exhibitions.filter((e) => new Date(e.endDate) < now);

  function ExhibitionCard({ exhibition }: { exhibition: Exhibition }) {
    const isActive =
      new Date(exhibition.startDate) <= now && new Date(exhibition.endDate) >= now;
    const isUpcoming = new Date(exhibition.startDate) > now;

    return (
      <Link
        href={`/exhibitions/${exhibition.id}`}
        className="group block bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition"
      >
        <div className="relative h-56 bg-gray-100">
          {exhibition.coverImageUrl ? (
            <Image
              src={exhibition.coverImageUrl}
              alt={exhibition.title}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center">
              <Layers className="w-12 h-12 text-indigo-300" />
            </div>
          )}
          {isActive && (
            <span className="absolute top-3 left-3 bg-green-600 text-white text-xs font-bold px-3 py-1 rounded-full">
              Devam Ediyor
            </span>
          )}
          {isUpcoming && (
            <span className="absolute top-3 left-3 bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-full">
              Yakında
            </span>
          )}
        </div>
        <div className="p-5">
          <h3 className="text-xl font-bold text-gray-900 group-hover:text-indigo-600 transition line-clamp-2">
            {exhibition.title}
          </h3>
          {exhibition.description && (
            <p className="text-gray-600 text-sm mt-2 line-clamp-2">{exhibition.description}</p>
          )}
          <div className="flex items-center gap-4 mt-4 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              {new Date(exhibition.startDate).toLocaleDateString('tr-TR', {
                day: 'numeric',
                month: 'short',
              })}{' '}
              –{' '}
              {new Date(exhibition.endDate).toLocaleDateString('tr-TR', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}
            </span>
            <span className="flex items-center gap-1">
              <Eye className="w-3.5 h-3.5" />
              {exhibition._count?.products || 0} eser
            </span>
          </div>
        </div>
      </Link>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-900">Sergiler</h1>
        <p className="text-gray-600 mt-2 max-w-2xl mx-auto">
          Dijital ve sanal sergilerimizi keşfedin. Koleksiyonları inceleyin, sanat eserlerini yakından tanıyın.
        </p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="h-56 bg-gray-200 rounded-2xl" />
              <div className="h-6 bg-gray-200 rounded mt-4 w-3/4" />
              <div className="h-4 bg-gray-200 rounded mt-2 w-full" />
            </div>
          ))}
        </div>
      ) : exhibitions.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <Layers className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <p className="text-lg">Henüz sergi bulunmuyor.</p>
        </div>
      ) : (
        <div className="space-y-12">
          {active.length > 0 && (
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                <span className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
                Devam Eden Sergiler
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {active.map((e) => (
                  <ExhibitionCard key={e.id} exhibition={e} />
                ))}
              </div>
            </section>
          )}

          {upcoming.length > 0 && (
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Yaklaşan Sergiler</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {upcoming.map((e) => (
                  <ExhibitionCard key={e.id} exhibition={e} />
                ))}
              </div>
            </section>
          )}

          {past.length > 0 && (
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-6 text-gray-400">Geçmiş Sergiler</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {past.map((e) => (
                  <ExhibitionCard key={e.id} exhibition={e} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
