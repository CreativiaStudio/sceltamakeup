/**
 * Calcolo del prezzo di vendita "psicologico" a partire dal prezzo all'ingrosso.
 *
 * Regola di listino Scelta Makeup:
 *   prezzo_base = prezzo_ingrosso × (1 + IVA) × ricarico
 *   prezzo_finale = prezzo_base arrotondato alla desinenza psicologica più vicina
 *                   (0, 0.50, 0.90, 0.99)
 *
 * I default (IVA 22%, ricarico 2,2×) riproducono il moltiplicatore più diffuso
 * nel catalogo reale: la mediana di prezzo_vendita / prezzo_ingrosso è 2,684,
 * cioè appunto 1,22 × 2,2. Il listino contiene anche molti prezzi impostati a
 * mano, quindi i parametri restano configurabili per singola categoria.
 *
 * Esempio: 9,28 € ingrosso → 9,28 × 1,22 × 2,2 = 24,907 € → 24,90 €
 */

/** Parametri di default allineati al listino del negozio. */
export const DEFAULT_PRICING = {
  /** IVA ordinaria italiana (22%). */
  vatRate: 0.22,
  /** Ricarico applicato al costo d'acquisto (2,2×). */
  markup: 2.2,
  /** Desinenze psicologiche ammesse, in centesimi di euro. */
  endings: [0, 0.5, 0.9, 0.99],
};

/**
 * Arrotonda un valore alla desinenza psicologica più vicina.
 * In caso di perfetto pareggio sceglie il prezzo più alto, per non erodere il margine.
 *
 * @param {number} value Prezzo base (es. 24.907).
 * @param {number[]} [endings] Desinenze ammesse.
 * @returns {number} Prezzo arrotondato ai 2 decimali.
 */
export function roundToPsychologicalEnding(value, endings = DEFAULT_PRICING.endings) {
  if (!Number.isFinite(value) || value <= 0) {
    throw new RangeError(`roundToPsychologicalEnding: valore non valido (${value})`);
  }
  if (!Array.isArray(endings) || endings.length === 0) {
    throw new RangeError('roundToPsychologicalEnding: serve almeno una desinenza');
  }

  const floorEuros = Math.floor(value);
  const candidates = [];

  // Provo le desinenze sia sull'euro corrente sia sul successivo,
  // così copro i casi a cavallo dell'unità (es. 24,99 → 25,00).
  for (const euro of [floorEuros, floorEuros + 1]) {
    for (const ending of endings) {
      candidates.push(euro + ending);
    }
  }

  let best = candidates[0];
  let bestDistance = Math.abs(best - value);

  for (const candidate of candidates) {
    const distance = Math.abs(candidate - value);
    // `<` mantiene il primo trovato in caso di pareggio; ordino per preferire il più alto.
    if (distance < bestDistance || (distance === bestDistance && candidate > best)) {
      best = candidate;
      bestDistance = distance;
    }
  }

  return Math.round(best * 100) / 100;
}

/**
 * Calcola il prezzo psicologico di vendita dato il prezzo all'ingrosso.
 *
 * @param {number} wholesalePrice Prezzo all'ingrosso (imponibile d'acquisto) in euro.
 * @param {object} [options]
 * @param {number} [options.vatRate=0.22] Aliquota IVA da applicare.
 * @param {number} [options.markup=2.2] Ricarico moltiplicativo.
 * @param {number[]} [options.endings] Desinenze psicologiche ammesse.
 * @returns {number} Prezzo di vendita finale in euro, arrotondato ai 2 decimali.
 */
export function psychologicalPrice(wholesalePrice, options = {}) {
  if (!Number.isFinite(wholesalePrice) || wholesalePrice <= 0) {
    throw new RangeError(`psychologicalPrice: prezzo all'ingrosso non valido (${wholesalePrice})`);
  }

  const {
    vatRate = DEFAULT_PRICING.vatRate,
    markup = DEFAULT_PRICING.markup,
    endings = DEFAULT_PRICING.endings,
  } = options;

  if (!Number.isFinite(vatRate) || vatRate < 0) {
    throw new RangeError(`psychologicalPrice: aliquota IVA non valida (${vatRate})`);
  }
  if (!Number.isFinite(markup) || markup <= 0) {
    throw new RangeError(`psychologicalPrice: ricarico non valido (${markup})`);
  }

  const basePrice = wholesalePrice * (1 + vatRate) * markup;
  return roundToPsychologicalEnding(basePrice, endings);
}
