"use client";

import React, { useState } from "react";
import Image, { type ImageProps } from "next/image";
import { Gavel } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Inline SVG placeholder shown when an auction image fails to load or is missing.
 * Renders a dark background with a gavel icon and "MUZAYEDE" text, matching
 * the overall platform brand colors (navy + gold).
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
      {/* Subtle radial highlight */}
      <div className="absolute inset-0 opacity-20 pointer-events-none">
        <div
          className="h-full w-full"
          style={{
            background:
              "radial-gradient(circle at 50% 40%, rgba(212, 168, 67, 0.15) 0%, transparent 60%)",
          }}
        />
      </div>

      {/* Gavel icon */}
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

      {/* Text */}
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
 * A wrapper around Next.js Image that gracefully handles missing or broken
 * auction images. When the image source is invalid, empty, or fails to load,
 * it shows the AuctionImagePlaceholder instead of a broken image icon.
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
  const [hasError, setHasError] = useState(false);

  // Determine if we have a valid image source
  const isValidSrc =
    src &&
    src.trim() !== "" &&
    !src.endsWith("placeholder-auction.jpg"); // the old JPG placeholder does not exist

  if (!isValidSrc || hasError) {
    return (
      <AuctionImagePlaceholder
        className={placeholderClassName}
        compact={compact}
      />
    );
  }

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
