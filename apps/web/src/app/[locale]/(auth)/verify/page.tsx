'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ShieldCheck, ArrowLeft, RotateCw } from 'lucide-react';
import api, { apiRoutes } from '@/lib/api';

export default function VerifyPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const method = searchParams.get('method') || 'email';
  const destination = searchParams.get('destination') || '';
  const purpose = searchParams.get('purpose') || 'register';

  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendCooldown, setResendCooldown] = useState(60);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  function handleChange(index: number, value: string) {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent) {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  }

  function handlePaste(e: React.ClipboardEvent) {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    const newOtp = [...otp];
    for (let i = 0; i < pasted.length; i++) {
      newOtp[i] = pasted[i];
    }
    setOtp(newOtp);
    const nextIndex = Math.min(pasted.length, 5);
    inputRefs.current[nextIndex]?.focus();
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    const code = otp.join('');
    if (code.length !== 6) {
      setError('Lütfen 6 haneli doğrulama kodunu girin.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await api.post(apiRoutes.auth.verifyOtp, {
        code,
        method,
        destination,
        purpose,
      });

      if (purpose === 'register') {
        router.push('/login?verified=true');
      } else if (purpose === 'reset-password') {
        router.push(`/reset-password?token=${code}`);
      } else {
        router.push('/');
      }
    } catch {
      setError('Doğrulama kodu geçersiz veya süresi dolmuş.');
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    if (resendCooldown > 0) return;
    try {
      await api.post(apiRoutes.auth.sendOtp, { method, destination, purpose });
      setResendCooldown(60);
      setError('');
    } catch {
      setError('Kod gönderilemedi, lütfen tekrar deneyin.');
    }
  }

  const maskedDest =
    method === 'email'
      ? destination.replace(/(.{2})(.*)(@.*)/, '$1***$3')
      : destination.replace(/(.{3})(.*)(.{2})/, '$1****$3');

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-6"
        >
          <ArrowLeft className="w-4 h-4" /> Geri
        </button>

        <div className="bg-white rounded-2xl shadow-sm border p-8">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center">
              <ShieldCheck className="w-8 h-8 text-blue-600" />
            </div>
          </div>

          <h1 className="text-2xl font-bold text-center text-gray-900 mb-2">
            Doğrulama Kodu
          </h1>
          <p className="text-center text-gray-500 text-sm mb-8">
            {method === 'email' ? 'E-posta' : 'Telefon'} adresinize gönderilen 6 haneli
            kodu girin.
            {maskedDest && (
              <span className="block mt-1 font-medium text-gray-700">{maskedDest}</span>
            )}
          </p>

          <form onSubmit={handleVerify}>
            <div className="flex justify-center gap-3 mb-6" onPaste={handlePaste}>
              {otp.map((digit, i) => (
                <input
                  key={i}
                  ref={(el) => { inputRefs.current[i] = el; }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleChange(i, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(i, e)}
                  className="w-12 h-14 text-center text-xl font-bold border-2 rounded-lg focus:border-blue-500 focus:outline-none transition"
                />
              ))}
            </div>

            {error && (
              <p className="text-red-500 text-sm text-center mb-4">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold py-3 rounded-lg transition"
            >
              {loading ? 'Doğrulanıyor...' : 'Doğrula'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={handleResend}
              disabled={resendCooldown > 0}
              className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 disabled:text-gray-400 transition"
            >
              <RotateCw className="w-4 h-4" />
              {resendCooldown > 0
                ? `Tekrar gönder (${resendCooldown}s)`
                : 'Kodu tekrar gönder'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
