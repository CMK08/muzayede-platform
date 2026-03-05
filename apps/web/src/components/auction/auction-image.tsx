/**
 * AuctionImage & AuctionImagePlaceholder -- Muzayede gorsel bilesenleri.
 *
 * AuctionImage:
 *   Next.js Image bilesenini sarar. Gorsel kaynagi bos, gecersiz veya
 *   yuklenirken hata olusursa otomatik olarak AuctionImagePlaceholder
 *   gosterir. Boylece kirik gorsel ikonu yerine marka renklerinde
 *   sik bir yer tutucu goruntulenir.
 *
 * AuctionImagePlaceholder:
 *   Gorsel mevcut olmadiginda gosterilen yer tutucu bilesen.
 *   Koyu arka plan uzerinde cekic (gavel) ikonu ve "MUZAYEDE"
 *   yazisi ile platform marka kimligini yansitir.
 */
"use client";

import React, { useState } from "react";
import Image, { type ImageProps } from "next/image";
import { Gavel } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Gorsel yuklenemediginde veya mevcut olmadiginda gosterilen yer tutucu bilesen.
 * Koyu (navy) arka plan uzerinde cekic ikonu ve "MUZAYEDE" yazisi gosterir.
 */
export function AuctionImagePlaceholder({
  className,
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-navy-950 via-navy-900 to-navy-950",
        className
      )}
    >
      {/* Hafif radyal isik efekti -- gorsel derinlik hissi verir */}
      <div className="absolute inset-0 opacity-20 pointer-events-none">
        <div
          className="h-full w-full"
          style={{
            background:
              "radial-gradient(circle at 50% 40%, rgba(212, 168, 67, 0.15) 0%, transparent 60%)",
          }}
        />
      </div>

      {/* Cekic ikonu -- muzayede platformunun temel simgesi */}
      <div className="relative mb-2">
        <div className="rounded-xl bg-primary-500/10 p-3">
          <Gavel
            className={cn(
              "text-primary-400/60",
              compact ? "h-6 w-6" : "h-10 w-10"
            )}
          />
        </div>
      </div>

      {/* Marka yazisi -- compact modda gizlenir */}
      {!compact && (
        <>
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-primary-400/50">
            Muzayede
          </p>
          <p className="mt-1 text-[10px] tracking-wider text-gray-500/40">
            Gorsel yuklenecek
          </p>
        </>
      )}
    </div>
  );
}

/**
 * Next.js Image etrafinda sarmalayici bilesen.
 * Gecersiz, bos veya yuklenemeyen gorseller icin otomatik olarak
 * AuctionImagePlaceholder gosterir. Boylece kullanici asla
 * kirik gorsel ikonu gormez.
 */
interface AuctionImageProps extends Omit<ImageProps, "onError" | "src"> {
  src?: string | null;
  compact?: boolean;
  placeholderClassName?: string;
}

export function AuctionImage({
  src,
  alt,
  compact = false,
  placeholderClassName,
  className,
  ...props
}: AuctionImageProps) {
  // Gorsel yukleme hatasi olup olmadigini takip eden state
  const [hasError, setHasError] = useState(false);

  // Gecerli bir gorsel kaynagi olup olmadigini kontrol et
  // Yer tutucu dosya adlari ve yerel /images/ yollari gecersiz sayilir (seed verileri)
  const isValidSrc =
    src &&
    src.trim() !== "" &&
    !src.endsWith("placeholder-auction.jpg") &&
    !src.startsWith("/images/"); // local /images/ paths don't exist — seed data placeholders

  // Kaynak gecersizse veya yukleme hatasi olduysa yer tutucu goster
  if (!isValidSrc || hasError) {
    return (
      <AuctionImagePlaceholder
        className={placeholderClassName}
        compact={compact}
      />
    );
  }

  // Gecerli gorsel -- hata olusursa onError ile yer tutucuya geri donulur
  return (
    <Image
      src={src}
      alt={alt}
      className={className}
      onError={() => setHasError(true)}
      {...props}
    />
  );
}
