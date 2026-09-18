"use client";

import Link from "next/link";
import { 
  Sparkles, 
  Eye, 
  Heart, 
  Droplets, 
  Brush, 
  CalendarCheck,
  ArrowRight
} from "lucide-react";

interface StoryCategory {
  id: string;
  name: string;
  subtitle: string;
  href: string;
  icon: typeof Sparkles;
  isSpecial?: boolean;
  badge?: string;
  gradient: string;
}

const CATEGORIES_DATA: StoryCategory[] = [
  {
    id: "viso",
    name: "Viso",
    subtitle: "Fondotinta & Blush",
    href: "/prodotti?categoria=Viso",
    icon: Sparkles,
    gradient: "from-[#5E1788] via-[#7A3293] to-[#D462A6]",
  },
  {
    id: "occhi",
    name: "Occhi",
    subtitle: "Mascara & Ombretti",
    href: "/prodotti?categoria=Occhi",
    icon: Eye,
    gradient: "from-[#7A3293] via-[#D462A6] to-[#D8C2E7]",
  },
  {
    id: "labbra",
    name: "Labbra",
    subtitle: "Rossetti & Gloss",
    href: "/prodotti?categoria=Labbra",
    icon: Heart,
    gradient: "from-[#D462A6] via-[#E578B5] to-[#5E1788]",
  },
  {
    id: "skincare",
    name: "Skincare & Dermo",
    subtitle: "Sieri & Trattamenti",
    href: "/prodotti?categoria=Skincare+%26+Dermo",
    icon: Droplets,
    gradient: "from-[#5E1788] via-[#8E2BA6] to-[#D8C2E7]",
  },
  {
    id: "accessori",
    name: "Accessori",
    subtitle: "Pennelli & Set",
    href: "/prodotti?categoria=Beauty+%26+Accessori",
    icon: Brush,
    gradient: "from-[#7A3293] via-[#5E1788] to-[#D462A6]",
  },
  {
    id: "atelier",
    name: "Atelier Servizi",
    subtitle: "Cabina Make-Up",
    href: "/prenota",
    icon: CalendarCheck,
    isSpecial: true,
    badge: "-10% Online",
    gradient: "from-[#5E1788] via-[#D462A6] to-[#D8C2E7]",
  },
];

export default function CategoryStoryCircles() {
  return (
    <section className="py-10 sm:py-14 bg-[#F2EBF6] border-y border-[#D8C2E7]/60 relative overflow-hidden shadow-[inset_0_1px_4px_rgba(94,23,136,0.04)]">
      {/* Decorative Atmospheric Accents */}
      <div className="absolute -top-24 left-1/4 w-72 h-72 rounded-full bg-white/40 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 right-1/4 w-72 h-72 rounded-full bg-[#D462A6]/10 blur-3xl pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header bar with solid contrast */}
        <div className="flex items-center justify-between mb-8 sm:mb-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/80 backdrop-blur-xs border border-[#D8C2E7]/70 text-[#5E1788] text-xs font-semibold tracking-widest uppercase shadow-xs mb-2">
              <Sparkles className="h-3.5 w-3.5 text-[#D462A6]" />
              <span>Collezioni & Trattamenti</span>
            </div>
            <h2 className="font-serif text-2xl sm:text-3xl lg:text-4xl text-[#1F1B24] tracking-tight">
              Esplora per Categoria
            </h2>
          </div>
          <Link
            href="/prodotti"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white text-xs font-semibold text-[#5E1788] hover:text-[#7A3293] hover:bg-white/95 border border-[#D8C2E7]/70 shadow-xs transition-all group"
          >
            <span>Catalogo Completo</span>
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>

        {/* Story Rail with Solid Elevated Luxury Cards */}
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 sm:gap-5 lg:gap-6">
          {CATEGORIES_DATA.map((cat) => {
            const Icon = cat.icon;
            return (
              <Link
                key={cat.id}
                href={cat.href}
                className="group flex flex-col items-center text-center p-3.5 sm:p-4 rounded-2xl bg-white/90 backdrop-blur-xs border border-white/80 shadow-xs hover:shadow-lg hover:border-[#D462A6]/40 hover:-translate-y-1 transition-all duration-300 focus:outline-none"
              >
                {/* Outer Ring with Glow */}
                <div className="relative p-[3px] rounded-full bg-gradient-to-tr from-[#5E1788] via-[#D462A6] to-[#D8C2E7] shadow-sm group-hover:shadow-md transition-all duration-300">
                  {/* Floating Special Badge for Atelier Servizi */}
                  {cat.badge && (
                    <span className="absolute -top-2.5 -right-2 z-10 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-bold tracking-wider uppercase bg-gradient-to-r from-[#D462A6] to-[#5E1788] text-white shadow-md ring-2 ring-white whitespace-nowrap">
                      {cat.badge}
                    </span>
                  )}

                  {/* Inner Icon Circle */}
                  <div className={`w-14 h-14 sm:w-16 sm:h-16 lg:w-18 lg:h-18 rounded-full flex flex-col items-center justify-center p-2.5 sm:p-3 transition-colors ${
                    cat.isSpecial
                      ? "bg-gradient-to-br from-[#FAF7FC] to-[#F3E8FA] text-[#5E1788]"
                      : "bg-white text-[#5E1788] group-hover:bg-[#FAF7FC]"
                  }`}>
                    <Icon className="h-6 w-6 sm:h-7 sm:w-7 transition-transform duration-300 group-hover:scale-110 text-[#5E1788]" />
                  </div>
                </div>

                {/* Category Label */}
                <span className="mt-3 text-xs sm:text-sm font-bold text-[#1F1B24] group-hover:text-[#5E1788] tracking-tight transition-colors">
                  {cat.name}
                </span>

                {/* Micro Subtitle */}
                <span className="text-[11px] sm:text-xs text-neutral-500 font-light mt-0.5 line-clamp-1">
                  {cat.subtitle}
                </span>
              </Link>
            );
          })}
        </div>

      </div>
    </section>
  );
}
