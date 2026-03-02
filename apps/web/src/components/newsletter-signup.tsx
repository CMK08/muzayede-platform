'use client';

import { useState } from 'react';
import { Mail, CheckCircle2, ArrowRight } from 'lucide-react';

export default function NewsletterSignup() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;

    setStatus('loading');
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
      await fetch(`${apiUrl}/notifications/newsletter`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      setStatus('success');
      setEmail('');
    } catch {
      setStatus('error');
    }
  }

  if (status === 'success') {
    return (
      <div className="flex items-center gap-2 text-green-400">
        <CheckCircle2 className="w-5 h-5" />
        <span className="text-sm">Bültenimize kaydoldunuz!</span>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <div className="relative flex-1">
        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          placeholder="E-posta adresiniz"
          className="w-full pl-10 pr-3 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white placeholder:text-gray-400 text-sm focus:border-blue-400 focus:outline-none"
        />
      </div>
      <button
        type="submit"
        disabled={status === 'loading'}
        className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 text-white font-medium px-4 py-2.5 rounded-lg text-sm transition"
      >
        Abone Ol
        <ArrowRight className="w-4 h-4" />
      </button>
    </form>
  );
}
