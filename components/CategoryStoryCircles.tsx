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
    <section className="py-8 sm:py-12 bg-gradient-to-b from-[#FAF7FC]/50 to-white border-b border-[#D8C2E7]/25">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header bar */}
        <div className="flex items-center justify-between mb-6 sm:mb-8">
          <div>
            <span className="text-xs font-semibold tracking-widest uppercase text-[#7A3293] block">
              Collezioni & Trattamenti
            </span>
            <h2 className="font-serif text-2xl sm:text-3xl text-[#1F1B24] tracking-tight mt-0.5">
              Esplora per Categoria
            </h2>
          </div>
          <Link
            href="/prodotti"
            className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold text-[#5E1788] hover:text-[#7A3293] transition-colors"
          >
            <span>Tutto il Catalogo (341)</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {/* Scrollable Story Rail */}
        <div className="flex items-center justify-start md:justify-center gap-5 sm:gap-8 overflow-x-auto scrollbar-none py-2 px-1 -mx-4 sm:mx-0 px-4 sm:px-0">
          {CATEGORIES_DATA.map((cat) => {
            const Icon = cat.icon;
            return (
              <Link
                key={cat.id}
                href={cat.href}
                className="group flex flex-col items-center shrink-0 text-center transition-transform hover:-translate-y-1 focus:outline-none"
              >
                {/* Luxury Gradient Outer Ring */}
                <div className="relative p-[3px] rounded-full bg-gradient-to-tr from-[#5E1788] via-[#D462A6] to-[#D8C2E7] shadow-sm group-hover:shadow-md transition-all duration-300">
                  {/* Floating Special Badge for Atelier Servizi */}
                  {cat.badge && (
                    <span className="absolute -top-2 -right-2 z-10 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold tracking-wider uppercase bg-gradient-to-r from-[#D462A6] to-[#5E1788] text-white shadow-md ring-2 ring-white">
                      {cat.badge}
                    </span>
                  )}

                  {/* Inner Icon Circle */}
                  <div className={`w-18 h-18 sm:w-20 sm:h-20 rounded-full flex flex-col items-center justify-center p-3 transition-colors ${
                    cat.isSpecial
                      ? "bg-gradient-to-br from-[#FAF7FC] to-[#F3E8FA] text-[#5E1788]"
                      : "bg-white text-[#5E1788] group-hover:bg-[#FAF7FC]"
                  }`}>
                    <Icon className="h-7 w-7 sm:h-8 sm:w-8 transition-transform duration-300 group-hover:scale-110 text-[#5E1788]" />
                  </div>
                </div>

                {/* Category Label */}
                <span className="mt-3 text-xs sm:text-sm font-semibold text-[#1F1B24] group-hover:text-[#5E1788] tracking-tight transition-colors">
                  {cat.name}
                </span>

                {/* Micro Subtitle */}
                <span className="text-xs text-neutral-500 font-light mt-0.5 hidden sm:block">
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
