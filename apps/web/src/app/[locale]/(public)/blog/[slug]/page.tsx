'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, Calendar, User, Clock } from 'lucide-react';

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  contentHtml: string;
  excerpt: string | null;
  coverImageUrl: string | null;
  author: { firstName: string; lastName: string; avatarUrl?: string | null } | null;
  isPublished: boolean;
  publishedAt: string | null;
  createdAt: string;
  tags: Array<{ tag: { id: string; name: string } }>;
}

export default function BlogPostPage() {
  const params = useParams();
  const slug = params.slug as string;
  const [post, setPost] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
    fetch(`${apiUrl}/blog/${slug}`)
      .then((r) => r.json())
      .then((data) => {
        setPost(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-3/4" />
          <div className="h-4 bg-gray-200 rounded w-1/3" />
          <div className="h-64 bg-gray-200 rounded-xl" />
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded w-full" />
            <div className="h-4 bg-gray-200 rounded w-full" />
            <div className="h-4 bg-gray-200 rounded w-2/3" />
          </div>
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12 text-center">
        <h1 className="text-2xl font-bold">Yazı bulunamadı</h1>
        <Link href="/blog" className="text-blue-600 hover:underline mt-4 inline-block">
          Blog sayfasına dön
        </Link>
      </div>
    );
  }

  const readingTime = Math.ceil((post.contentHtml?.replace(/<[^>]*>/g, '').length || 0) / 1000);

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <Link
        href="/blog"
        className="flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-8 text-sm"
      >
        <ArrowLeft className="w-4 h-4" /> Blog
      </Link>

      <article>
        <header className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 leading-tight">{post.title}</h1>

          <div className="flex items-center gap-4 mt-4 text-sm text-gray-500">
            <span className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4" />
              {new Date(post.publishedAt || post.createdAt).toLocaleDateString('tr-TR', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="w-4 h-4" />
              {readingTime} dk okuma
            </span>
          </div>

          {post.author && (
            <div className="flex items-center gap-3 mt-4">
              <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                {post.author.avatarUrl ? (
                  <Image
                    src={post.author.avatarUrl}
                    alt=""
                    width={40}
                    height={40}
                    className="object-cover"
                  />
                ) : (
                  <User className="w-5 h-5 text-gray-400" />
                )}
              </div>
              <div>
                <p className="font-medium text-gray-900 text-sm">
                  {post.author.firstName} {post.author.lastName}
                </p>
                <p className="text-xs text-gray-500">Yazar</p>
              </div>
            </div>
          )}
        </header>

        {post.coverImageUrl && (
          <div className="relative aspect-video rounded-xl overflow-hidden mb-8">
            <Image src={post.coverImageUrl} alt={post.title} fill className="object-cover" />
          </div>
        )}

        <div
          className="prose prose-gray prose-lg max-w-none"
          dangerouslySetInnerHTML={{ __html: post.contentHtml }}
        />

        {post.tags?.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-8 pt-8 border-t">
            {post.tags.map((t) => (
              <span
                key={t.tag.id}
                className="bg-gray-100 text-gray-700 text-xs px-3 py-1 rounded-full"
              >
                #{t.tag.name}
              </span>
            ))}
          </div>
        )}
      </article>
    </div>
  );
}
