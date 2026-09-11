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

  return (
    <Link
      href="/"
      className={`group flex items-center transition-all hover:opacity-95 ${
        compact ? "gap-2" : "gap-3"
      } ${className}`}
      aria-label="Scelta Makeup Home"
    >
      <div className="relative flex items-center justify-center shrink-0">
        {!imageError ? (
          <div
            className={`relative overflow-hidden rounded-full border border-purple-200/50 shadow-xs transition-all duration-300 group-hover:scale-105 ${
              compact
                ? "h-8 w-8 sm:h-9 sm:w-9"
                : "h-10 w-10 sm:h-12 sm:w-12"
            }`}
          >
            <Image
              src="/brand/logo.png"
              alt="Scelta Makeup Logo"
              fill
              sizes="(max-width: 640px) 36px, 48px"
              className="object-cover"
              onError={() => setImageError(true)}
              priority
            />
          </div>
        ) : (
          <div
            className={`flex items-center justify-center rounded-full bg-gradient-to-tr from-[#5E1788] to-[#D462A6] text-white shadow-xs font-serif font-bold ${
              compact
                ? "h-8 w-8 sm:h-9 sm:w-9 text-sm"
                : "h-10 w-10 sm:h-12 sm:w-12 text-lg"
            }`}
          >
            S
          </div>
        )}
      </div>

      <div className="flex flex-col justify-center">
        <span
          className={`font-serif tracking-[0.2em] uppercase font-bold leading-none transition-colors ${
            isFooter
              ? "text-white text-xl sm:text-2xl"
              : compact
              ? "text-base sm:text-lg text-[#1F1B24] group-hover:text-[#5E1788]"
              : "text-[#1F1B24] text-lg sm:text-xl group-hover:text-[#5E1788]"
          }`}
        >
          SCELTA
          <span className="ml-1.5 font-light text-[#7A3293]">MAKEUP</span>
        </span>
        {!compact && (
          <span
            className={`text-[9px] sm:text-[10px] tracking-[0.2em] uppercase font-medium italic mt-0.5 ${
              isFooter ? "text-[#D8C2E7]" : "text-[#7A3293]/80"
            }`}
          >
            L&apos;eleganza di essere autentica
          </span>
        )}
      </div>
    </Link>
  );
}
