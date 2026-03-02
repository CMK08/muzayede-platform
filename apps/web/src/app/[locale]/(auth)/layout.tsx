import Link from "next/link";
import { Gavel } from "lucide-react";

interface AuthLayoutProps {
  children: React.ReactNode;
}

export default function AuthLayout({ children }: AuthLayoutProps): React.JSX.Element {
  return (
    <div className="flex min-h-screen">
      {/* Left: Form */}
      <div className="flex w-full flex-col items-center justify-center px-4 py-12 lg:w-1/2">
        <div className="mb-8">
          <Link href="/tr" className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-500">
              <Gavel className="h-6 w-6 text-white" />
            </div>
            <span className="font-display text-2xl font-bold">
              <span className="text-gold-gradient">Muzayede</span>
            </span>
          </Link>
        </div>
        <div className="w-full max-w-md">{children}</div>
      </div>

      {/* Right: Decorative */}
      <div className="hidden bg-gradient-to-br from-navy-950 via-navy-900 to-primary-950 lg:flex lg:w-1/2 lg:flex-col lg:items-center lg:justify-center lg:p-12">
        <div className="max-w-md text-center text-white">
          <div className="mb-6 flex justify-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-primary-500/20">
              <Gavel className="h-10 w-10 text-primary-400" />
            </div>
          </div>
          <h2 className="font-display text-3xl font-bold">
            Essiz Urunlerin Adresi
          </h2>
          <p className="mt-4 text-gray-400">
            Turkiye&apos;nin en prestijli online muzayede platformuna hosgeldiniz.
            Benzersiz urunleri kesfedin, teklif verin ve kazanin.
          </p>
          <div className="mt-8 grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-primary-400">12K+</p>
              <p className="text-xs text-gray-500">Muzayede</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-primary-400">50K+</p>
              <p className="text-xs text-gray-500">Uye</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-primary-400">2.5M+</p>
              <p className="text-xs text-gray-500">Teklif</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
