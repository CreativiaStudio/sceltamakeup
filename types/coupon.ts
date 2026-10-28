/**
 * Scelta Makeup — Codici Sconto, Coupon, Smart Link & Landing Page Prodotti Curati
 * Module: types/coupon.ts
 *
 * Modello unificato ispirato alle best practice dei top beauty brand (Shopify Plus, Charlotte Tilbury, Sephora).
 * Supporta:
 * 1. Coupon manuali e Smart Link auto-applicanti con filtri mirati per Brand e Categoria.
 * 2. Landing Page dedicate con prodotti selezionati fisicamente con la Pistola Barcode da Federica.
 * 3. QR Code ad alta risoluzione per locandine cartacee, volantini e display in Salone.
 */

export type DiscountType = "percentage" | "fixed";
export type DiscountScope = "all" | "brand" | "category" | "products";

export interface PromoCoupon {
  /** Identificativo univoco, es. "cpn-diego10" */
  id: string;
  /** Codice coupon alfanumerico in maiuscolo (es. "DIEGO10", "HALLOWEEN35") */
  code: string;
  /** Titolo descrittivo promo per il gestionale (es. "10% Speciale Diego dalla Palma") */
  name: string;
  /** Tipo sconto: percentuale o importo fisso in euro */
  discountType: DiscountType;
  /** Valore sconto: es. 10 per 10% o 5 per 5€ (può essere 0 se è solo una vetrina/locandina a prezzo pieno) */
  discountValue: number;
  /** Ambito applicazione: 'all' (tutto), 'brand' (marchio mirato), 'category' (categoria), 'products' (prodotti specifici) */
  scope: DiscountScope;
  /** Marchio target se scope === 'brand' (es. "Diego dalla Palma", "RVB LAB", "Cipria Make Up") */
  targetBrand?: string;
  /** Categoria target se scope === 'category' (es. "Viso", "Labbra", "Occhi") */
  targetCategory?: string;
  /** ID dei prodotti inclusi se scope === 'products' (sparati con la pistola barcode o scelti a mano) */
  targetProductIds?: string[];

  /** Slug per la landing page dedicata /promo/[slug] (es. "halloween-glow", "diego-speciale") */
  slug?: string;
  /** Titolo grande hero per la landing page (es. "Speciale Halloween Glow di Federica") */
  headline?: string;
  /** Descrizione per la landing page (es. "I prodotti selezionati da Federica per un makeup perfetto a lunga tenuta.") */
  description?: string;
  /** Badge per la landing page (es. "Offerta Esclusiva Salone • Solo 20 Pezzi") */
  badgeText?: string;

  /** Spesa minima carrello (subtotale) per attivare lo sconto */
  minSpend?: number;

  /** Validità temporale: data inizio (YYYY-MM-DD) */
  startDate: string;
  /** Validità temporale: data fine opzionale (YYYY-MM-DD). Se assente, sempre valido. */
  endDate?: string;

  /** Limite massimo utilizzi globali (es. primi 20 utilizzi). Se assente, illimitato. */
  maxUses?: number;
  /** Numero di utilizzi già registrati */
  currentUses: number;

  /** Interruttore ON/OFF immediato dal gestionale */
  active: boolean;
  /** Se true, all'apertura del link promozionale viene applicato subito al carrello */
  autoApplyOnLink: boolean;
  /** Testo banner personalizzato (opzionale), es. "🎉 10% di sconto Diego dalla Palma applicato!" */
  bannerText?: string;

  createdAt: string;
  updatedAt: string;
}

export interface CouponValidationResult {
  valid: boolean;
  coupon?: PromoCoupon;
  discountAmount: number;
  eligibleSubtotal: number;
  error?: string;
}
