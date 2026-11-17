/**
 * Helper puri e client-safe per gli asset pubblici serviti da Cloudflare R2.
 *
 * Questo modulo NON importa `@aws-sdk/*` e non legge alcun segreto: può essere
 * importato tranquillamente anche da componenti `'use client'`.
 */

/** Dominio pubblico (CDN) del bucket R2 `scelta-makeup`. */
const DEFAULT_R2_PUBLIC_BASE_URL = "https://pub-4fbc134b2050432b8f5963ac1c49741a.r2.dev";

/** URL pubblico del CDN, sovrascrivibile da ambiente (variabile `NEXT_PUBLIC_*`). */
export const NEXT_PUBLIC_R2_PUBLIC_URL = (
  process.env.NEXT_PUBLIC_R2_PUBLIC_URL || DEFAULT_R2_PUBLIC_BASE_URL
).replace(/\/+$/, "");

/** Alias storico dello stesso URL pubblico. */
export const R2_PUBLIC_BASE_URL = NEXT_PUBLIC_R2_PUBLIC_URL;

/**
 * Risolve il path immagine di un prodotto verso il CDN R2.
 *
 * - `null`/`undefined`/stringa vuota -> logo brand locale.
 * - path locale `/products/<file>`   -> URL assoluto su R2.
 * - qualsiasi altro valore (URL assoluto, path locale) viene restituito invariato.
 */
export function resolveProductImageUrl(src?: string | null): string {
  if (!src) return "/brand/logo.png";
  if (src.startsWith("/products/")) {
    return `${R2_PUBLIC_BASE_URL}${src}`;
  }
  return src;
}

/**
 * Segnaposto noti: packshot generici di brand e logo del negozio. Un percorso
 * che contiene uno di questi marcatori NON è una foto reale caricata da Federica.
 */
const PLACEHOLDER_IMAGE_MARKERS = [
  "eveline-cosmetics-packshot",
  "/brand/logo.png",
  "brand/logo.png",
  "placeholder",
];

/** True quando l'URL è vuoto oppure corrisponde a un segnaposto noto. */
export function isPlaceholderImage(src?: string | null): boolean {
  if (typeof src !== "string") return true;
  const value = src.trim().toLowerCase();
  if (!value) return true;
  return PLACEHOLDER_IMAGE_MARKERS.some((marker) => value.includes(marker));
}

/**
 * Sceglie la migliore immagine tra i candidati: qualsiasi URL reale (la foto
 * scattata/caricata da Federica) vince SEMPRE sui segnaposto noti
 * (`eveline-cosmetics-packshot.jpg`, `/brand/logo.png`). Solo se nessun
 * candidato è una foto reale si ripiega sul primo valore valido e, in ultima
 * istanza, sul logo del brand.
 */
export function safeImageSrc(...candidates: Array<string | null | undefined>): string {
  const valid = candidates
    .filter((candidate): candidate is string => typeof candidate === "string" && candidate.trim().length > 0)
    .map((candidate) => candidate.trim());
  const realImage = valid.find((candidate) => !isPlaceholderImage(candidate));
  return resolveProductImageUrl(realImage ?? valid[0] ?? null);
}
