'use client';

import { useState, useEffect } from 'react';
import NextImage from 'next/image';
import Link from 'next/link';
import { Calendar, User, ArrowRight } from 'lucide-react';

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

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  coverImageUrl: string | null;
  author: { firstName: string; lastName: string } | null;
  isPublished: boolean;
  publishedAt: string | null;
  createdAt: string;
}

export default function BlogPage() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
    fetch(`${apiUrl}/blog?isPublished=true`)
      .then((r) => r.json())
      .then((data) => {
        setPosts(data.data || data || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-900">Blog</h1>
        <p className="text-gray-600 mt-2">
          Müzayede dünyasından haberler, rehberler ve koleksiyoner ipuçları
        </p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="h-48 bg-gray-200 rounded-xl" />
              <div className="h-5 bg-gray-200 rounded mt-4 w-3/4" />
              <div className="h-3 bg-gray-200 rounded mt-2 w-full" />
              <div className="h-3 bg-gray-200 rounded mt-1 w-2/3" />
            </div>
          ))}
        </div>
      ) : posts.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {posts.map((post, i) => (
            <Link
              key={post.id}
              href={`/blog/${post.slug}`}
              className={`group ${i === 0 ? 'md:col-span-2 lg:col-span-2' : ''}`}
            >
              <article className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition h-full flex flex-col">
                <div className={`relative bg-gray-100 ${i === 0 ? 'h-64' : 'h-48'}`}>
                  {post.coverImageUrl ? (
                    <SafeImage src={post.coverImageUrl} alt={post.title} fill className="object-cover group-hover:scale-105 transition-transform duration-300" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-blue-100 to-purple-100" />
                  )}
                </div>
                <div className="p-5 flex-1 flex flex-col">
                  <div className="flex items-center gap-3 text-xs text-gray-500 mb-3">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(post.publishedAt || post.createdAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </span>
                    {post.author && (
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {post.author.firstName} {post.author.lastName}
                      </span>
                    )}
                  </div>
                  <h2 className={`font-bold text-gray-900 group-hover:text-blue-600 transition ${i === 0 ? 'text-2xl' : 'text-lg'} line-clamp-2`}>
                    {post.title}
                  </h2>
                  {post.excerpt && (
                    <p className="text-gray-600 text-sm mt-2 line-clamp-3 flex-1">{post.excerpt}</p>
                  )}
                  <span className="inline-flex items-center gap-1 text-blue-600 text-sm font-medium mt-4 group-hover:gap-2 transition-all">
                    Devamını Oku <ArrowRight className="w-4 h-4" />
                  </span>
                </div>
              </article>
            </Link>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 text-gray-500">
          <p className="text-lg">Henüz blog yazısı yok.</p>
        </div>
      )}
    </div>
  );
}
