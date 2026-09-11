// Mega Menu Structure & Subcategory Mapping — Scelta Makeup
// Subcategories are search-term based (no schema changes to catalog.json needed)

import { CategoryKey } from "@/types/product";

export interface MegaMenuSubcategory {
  label: string;
  /** This term is used as a search/filter query when clicked */
  searchTerm: string;
  /** Optional lucide icon name for visual flair */
  icon?: string;
}

export interface MegaMenuCategoryConfig {
  key: CategoryKey;
  label: string;
  description: string;
  subcategories: MegaMenuSubcategory[];
  /** Slug of a featured/bestseller product to highlight */
  featuredProductSlug?: string;
}

export const MEGAMENU_CATEGORIES: MegaMenuCategoryConfig[] = [
  {
    key: "Viso",
    label: "Viso",
    description: "Fondotinta, ciprie, blush e basi per un incarnato impeccabile.",
    subcategories: [
      { label: "Fondotinta", searchTerm: "fondotinta" },
      { label: "Cipria", searchTerm: "cipria" },
      { label: "Blush", searchTerm: "blush" },
      { label: "Terra Abbronzante", searchTerm: "terra abbronzante" },
      { label: "Base Trucco", searchTerm: "base trucco" },
      { label: "Fissatore", searchTerm: "fissatore" },
      { label: "Struccante", searchTerm: "struccante" },
      { label: "Primer", searchTerm: "primer" },
      { label: "Pennelli Viso", searchTerm: "pennello" },
      { label: "Spugne", searchTerm: "spugna" },
    ],
    featuredProductSlug: "fondotinta-hd-effetto-lifting",
  },
  {
    key: "Occhi",
    label: "Occhi",
    description: "Mascara, ombretti, eyeliner e matite per uno sguardo magnetico.",
    subcategories: [
      { label: "Mascara", searchTerm: "mascara" },
      { label: "Ombretti", searchTerm: "ombretto" },
      { label: "Matite Occhi", searchTerm: "matita occhi" },
      { label: "Sopracciglia", searchTerm: "sopraccig" },
      { label: "Kajal", searchTerm: "kajal" },
      { label: "Eyeliner", searchTerm: "delineatore" },
      { label: "Pennelli Occhi", searchTerm: "pennello occhi" },
    ],
    featuredProductSlug: "more-more-mascara",
  },
  {
    key: "Labbra",
    label: "Labbra",
    description: "Rossetti, gloss, matite e trattamenti labbra per labbra irresistibili.",
    subcategories: [
      { label: "Rossetti", searchTerm: "rossetto" },
      { label: "Matite Labbra", searchTerm: "matita labbra" },
      { label: "Lip Gloss", searchTerm: "gloss" },
      { label: "Lip Oil", searchTerm: "lip oil" },
      { label: "Scrub Labbra", searchTerm: "scrub labbra" },
      { label: "Balsamo Labbra", searchTerm: "balsamo labbra" },
      { label: "Tinta Labbra", searchTerm: "tinta labbra" },
    ],
    featuredProductSlug: "matt-velvet-lipstick-rossetto-opaco",
  },
  {
    key: "Skincare & Dermo",
    label: "Skincare & Dermo",
    description: "Sieri, creme, correttori-trattamento e solari dalla dermocosmesi più avanzata.",
    subcategories: [
      { label: "Correttori", searchTerm: "correttore" },
      { label: "Fondotinta Trattamento", searchTerm: "fondotinta" },
      { label: "Sieri Viso", searchTerm: "siero" },
      { label: "Creme Anti-Età", searchTerm: "crema anti" },
      { label: "Solari", searchTerm: "sun" },
      { label: "Ciglia & Sopracciglia", searchTerm: "ciglia" },
      { label: "Trattamento Labbra", searchTerm: "labbra" },
    ],
    featuredProductSlug: "meso-fill-concealer-fill-correct-correttore-trattamento-levigante",
  },
  {
    key: "Beauty & Accessori",
    label: "Beauty & Accessori",
    description: "Pennelli professionali, spugne, accessori e tutto il necessario per il beauty.",
    subcategories: [
      { label: "Accessori", searchTerm: "accessori" },
      { label: "Temperini", searchTerm: "temperino" },
    ],
    featuredProductSlug: "temperino-doppio",
  },
];
