"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

interface BrandLogoProps {
  variant?: "header" | "footer" | "hero";
  className?: string;
  compact?: boolean;
}

export default function BrandLogo({
  variant = "header",
  className = "",
  compact = false,
}: BrandLogoProps) {
  const [imageError, setImageError] = useState(false);

  const isFooter = variant === "footer";

  if (isFooter) {
    return (
      <Link
        href="/"
        className={`group inline-block transition-transform hover:scale-[1.02] ${className}`}
        aria-label="Scelta Makeup Home"
      >
        <div className="relative aspect-[1374/807] h-14 sm:h-16 md:h-20 w-auto filter drop-shadow-[0_2px_12px_rgba(212,98,166,0.15)]">
          {!imageError ? (
            <Image
              src="/brand/logo-white.png"
              alt="Scelta Makeup"
              fill
              sizes="(max-width: 640px) 200px, 260px"
              className="object-contain"
              onError={() => setImageError(true)}
              priority
            />
          ) : (
            <div className="flex items-center justify-start h-full font-serif font-bold text-white text-xl tracking-wider">
              SCELTA MAKEUP
            </div>
          )}
        </div>
      </Link>
    );
  }

  return (
    <Link
      href="/"
      className={`group flex items-center transition-all hover:opacity-95 ${className}`}
      aria-label="Scelta Makeup Home"
    >
      <div
        className={`relative aspect-[1374/807] w-auto transition-all duration-300 group-hover:scale-105 ${
          compact ? "h-9 sm:h-11" : "h-11 sm:h-14"
        }`}
      >
        {!imageError ? (
          <Image
            src="/brand/logo-transparent.png"
            alt="Scelta Makeup"
            fill
            sizes="(max-width: 640px) 180px, 220px"
            className="object-contain"
            onError={() => setImageError(true)}
            priority
          />
        ) : (
          <div className="flex items-center justify-center h-full font-serif font-bold text-[#5E1788] text-base sm:text-lg">
            SCELTA MAKEUP
          </div>
        )}
      </div>
    </Link>
  );
}
