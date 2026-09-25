/**
 * Utilità di prezzatura per il catalogo Scelta Makeup.
 *
 * Regola ufficiale di vendita al pubblico:
 *   prezzo al pubblico = prezzo d'ingrosso × ricarico (2.75)
 *   arrotondato alla prima terminazione utile in ".90" (mai sotto il ricavato).
 *
 * Esempi:
 *   8.50 × 2.75 = 23.375  → 23.90
 *   30.00 × 2.75 = 82.50  → 82.90
 *   3.60 × 2.75 = 9.90    →  9.90
 */

/** Ricarico predefinito applicato al prezzo d'ingrosso (Pierre René: ×2.75). */
export const DEFAULT_MARKUP = 2.75;

/**
 * Arrotonda un importo alla prima terminazione ".90" maggiore o uguale al valore.
 *
 * @param value Importo di partenza (prezzo d'ingrosso × ricarico).
 * @returns Prezzo arrotondato a 2 decimali, terminante in ".90".
 */
export function roundTo90(value: number): number {
  const base = Math.floor(value);
  let price = base + 0.9;
  // Tolleranza 1e-9 per assorbire gli errori di rappresentazione in virgola mobile.
  if (price + 1e-9 < value) price += 1;
  return Math.round(price * 100) / 100;
}

/**
 * Calcola il prezzo al pubblico da un prezzo d'ingrosso.
 *
 * @param wholesalePrice Prezzo d'ingresso (ingrosso/acquisto) in euro.
 * @param markup Moltiplicatore di ricarico (default 2.75).
 * @returns Prezzo di vendita al pubblico terminante in ".90", oppure 0 se l'ingresso non è valido.
 */
export function calculateRetailPrice(wholesalePrice: number, markup: number = DEFAULT_MARKUP): number {
  if (!Number.isFinite(wholesalePrice) || wholesalePrice <= 0) return 0;
  if (!Number.isFinite(markup) || markup <= 0) return 0;
  return roundTo90(wholesalePrice * markup);
}
