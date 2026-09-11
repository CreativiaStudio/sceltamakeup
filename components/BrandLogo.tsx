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
        <div className="bg-white/95 backdrop-blur-md rounded-2xl px-3.5 py-2 border border-white/20 shadow-md inline-block">
          <div className="relative aspect-[1600/908] h-10 sm:h-12 w-auto">
            {!imageError ? (
              <Image
                src="/brand/logo.png"
                alt="Scelta Makeup"
                fill
                sizes="(max-width: 640px) 140px, 180px"
                className="object-contain"
                onError={() => setImageError(true)}
                priority
              />
            ) : (
              <div className="flex items-center justify-center h-full px-2 font-serif font-bold text-[#5E1788] text-base">
                SCELTA MAKEUP
              </div>
            )}
          </div>
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
        className={`relative aspect-[1600/908] w-auto transition-all duration-300 group-hover:scale-105 ${
          compact ? "h-8 sm:h-9" : "h-10 sm:h-12"
        }`}
      >
        {!imageError ? (
          <Image
            src="/brand/logo.png"
            alt="Scelta Makeup"
            fill
            sizes="(max-width: 640px) 140px, 180px"
            className="object-contain"
            onError={() => setImageError(true)}
            priority
          />
        ) : (
          <div className="flex items-center justify-center h-full px-2 font-serif font-bold text-[#5E1788] text-base">
            SCELTA MAKEUP
          </div>
        )}
      </div>
    </Link>
  );
}
