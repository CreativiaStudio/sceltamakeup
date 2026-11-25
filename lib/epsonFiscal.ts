/**
 * Scelta Makeup — Centralized Epson FP-81II RT Fiscal Printer Module
 * Module: lib/epsonFiscal.ts
 *
 * Unifies SOAP XML generation, fiscal description sanitization, and fpmate.cgi
 * response parsing across single receipt, multi-receipt, drawer kick, void,
 * and appointment balance clearance.
 */

const DEFAULT_CASSA_RT_ENDPOINT =
  "http://192.168.68.63/cgi-bin/fpmate.cgi?devid=local_printer&timeout=10000";

export const CASSA_RT_ENDPOINT =
  process.env.NEXT_PUBLIC_CASSA_RT_ENDPOINT || DEFAULT_CASSA_RT_ENDPOINT;

export const CASSA_RT_DRAWER_ENDPOINT = CASSA_RT_ENDPOINT.includes("timeout=")
  ? CASSA_RT_ENDPOINT.replace(/timeout=\d+/, "timeout=5000")
  : "http://192.168.68.63/cgi-bin/fpmate.cgi?devid=local_printer&timeout=5000";

export interface FiscalReceiptItem {
  description: string;
  quantity: number;
  unitPrice: number;
  department?: number;
}

export interface BuildFiscalReceiptParams {
  items: FiscalReceiptItem[];
  paymentMethod: "card" | "cash";
  tenderedAmount?: number;
}

export interface FpmateResponse {
  success: boolean;
  code: string;
  status: string;
  raw: string;
}

const NAMED_HTML_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  rsquo: "'",
  lsquo: "'",
  rdquo: '"',
  ldquo: '"',
  hellip: "...",
  ndash: "-",
  mdash: "-",
};

/**
 * Decodes HTML entities, normalizes diacritics to clean ASCII, replaces `&`
 * with ` e `, strips XML-reserved delimiters and non-printable characters,
 * and truncates to `maxLen` (default 22 chars for Epson FP-81II RT).
 */
export function sanitizeFiscalDescription(raw: string, maxLen = 22): string {
  if (!raw || typeof raw !== "string") return "ARTICOLO";

  // 1. Decode numeric and common named HTML entities (supports double-encoded entities)
  let text = raw;
  for (let pass = 0; pass < 2; pass++) {
    const decoded = text
      .replace(/&#(\d+);/g, (_, dec) => {
        const code = parseInt(dec, 10);
        return Number.isFinite(code) && code > 0 ? String.fromCodePoint(code) : " ";
      })
      .replace(/&#x([0-9a-f]+);/gi, (_, hex) => {
        const code = parseInt(hex, 16);
        return Number.isFinite(code) && code > 0 ? String.fromCodePoint(code) : " ";
      })
      .replace(/&([a-z]+);/gi, (match, name: string) => {
        const mapped = NAMED_HTML_ENTITIES[name.toLowerCase()];
        return mapped !== undefined ? mapped : match;
      });
    if (decoded === text) break;
    text = decoded;
  }

  // 2. Normalize Unicode punctuation & strip accents/diacritics
  text = text
    .replace(/[\u2018\u2019\u201A\u2032]/g, "'")
    .replace(/[\u201C\u201D\u201E\u2033]/g, '"')
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/\u2026/g, "...")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  // 3. Replace '&' with readable ' e ' before stripping XML delimiters
  text = text.replace(/&/g, " e ");

  // 4. Remove XML attribute/tag delimiters and non-ASCII / control characters
  text = text
    .replace(/[<>"'\\]/g, " ")
    .replace(/[^\x20-\x7E]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  // 5. Truncate at the end to RT line width and trim trailing spaces
  if (maxLen > 0 && text.length > maxLen) {
    text = text.slice(0, maxLen).trim();
  }

  return text || "ARTICOLO";
}

/**
 * Parses the XML response returned by Epson `fpmate.cgi`.
 */
export function parseFpmateResponse(resText: string): FpmateResponse {
  const raw = typeof resText === "string" ? resText : "";
  const success = /success\s*=\s*["']true["']/i.test(raw);
  const codeMatch = raw.match(/\bcode\s*=\s*["']([^"']*)["']/i);
  const statusMatch = raw.match(/\bstatus\s*=\s*["']([^"']*)["']/i);

  return {
    success,
    code: codeMatch?.[1]?.trim() ?? "",
    status: statusMatch?.[1]?.trim() ?? "",
    raw,
  };
}

/**
 * Builds a complete SOAP XML fiscal receipt for Epson FP-81II RT.
 * Guarantees valid XML descriptions and exact cent matching for electronic payments.
 */
export function buildFiscalReceiptXml(params: BuildFiscalReceiptParams): string {
  const { items, paymentMethod, tenderedAmount } = params;

  const normalizedItems = items.map((item) => {
    const qty = Number.isFinite(item.quantity) && item.quantity > 0 ? Math.round(item.quantity) : 1;
    const unitPrice = Number.isFinite(item.unitPrice) && item.unitPrice >= 0 ? item.unitPrice : 0;
    const cents = Math.round(unitPrice * 100);
    const dept = Number.isInteger(item.department) && (item.department as number) > 0 ? item.department : 1;
    return {
      description: sanitizeFiscalDescription(item.description, 22),
      quantity: qty,
      unitPriceStr: (cents / 100).toFixed(2),
      lineCents: cents * qty,
      department: dept,
    };
  });

  const itemsSumCents = normalizedItems.reduce((sum, it) => sum + it.lineCents, 0);
  const itemsSum = itemsSumCents / 100;

  let paymentCents = itemsSumCents;
  if (paymentMethod === "cash" && typeof tenderedAmount === "number" && Number.isFinite(tenderedAmount)) {
    const tenderedCents = Math.round(tenderedAmount * 100);
    if (tenderedCents >= itemsSumCents) {
      paymentCents = tenderedCents;
    }
  }
  const paymentFormatted = (paymentMethod === "card" ? itemsSum : paymentCents / 100).toFixed(2);

  const itemsXml = normalizedItems
    .map(
      (it) =>
        `<printRecItem operator="1" description="${it.description}" quantity="${it.quantity}" unitPrice="${it.unitPriceStr}" department="${it.department}" />`
    )
    .join("\n      ");

  const isCard = paymentMethod === "card";
  const tenderDesc = isCard ? "PAGAMENTO ELETTRONICO" : "CONTANTI";
  const paymentType = isCard ? "2" : "0";
  const index = isCard ? "2" : "0";

  return `<?xml version="1.0" encoding="utf-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/">
  <soapenv:Body>
    <printerFiscalReceipt>
      <beginFiscalReceipt operator="1" />
      ${itemsXml}
      <printRecTotal operator="1" description="${tenderDesc}" payment="${paymentFormatted}" paymentType="${paymentType}" index="${index}" />
      <endFiscalReceipt operator="1" />
    </printerFiscalReceipt>
  </soapenv:Body>
</soapenv:Envelope>`;
}

/**
 * Builds the SOAP XML command to void/cancel an open stuck fiscal receipt.
 */
export function buildVoidReceiptXml(): string {
  return `<?xml version="1.0" encoding="utf-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/">
  <soapenv:Body>
    <printerFiscalReceipt>
      <printRecVoid operator="1" />
      <endFiscalReceipt operator="1" />
    </printerFiscalReceipt>
  </soapenv:Body>
</soapenv:Envelope>`;
}

/**
 * Builds the SOAP XML command to kick open the physical cash drawer.
 */
export function buildOpenDrawerXml(): string {
  return `<?xml version="1.0" encoding="utf-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/">
  <soapenv:Body>
    <openDrawer />
  </soapenv:Body>
</soapenv:Envelope>`;
}

/**
 * Builds a non-fiscal diagnostic receipt XML for printer connectivity checks.
 */
export function buildNonFiscalTestXml(dateStr: string, timeStr: string): string {
  const safeDate = sanitizeFiscalDescription(dateStr, 12);
  const safeTime = sanitizeFiscalDescription(timeStr, 10);
  return `<?xml version="1.0" encoding="utf-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/">
  <soapenv:Body>
    <printerNonFiscal>
      <beginNonFiscal operator="1" />
      <printNormal text="       SCELTA MAKEUP NAPOLI       " />
      <printNormal text="   Via dei Pellegrini 28/29 Napoli" />
      <printNormal text="--------------------------------" />
      <printNormal text="TEST CONNESSIONE CASSA RT       " />
      <printNormal text="DATA: ${safeDate} ORA: ${safeTime} " />
      <printNormal text="IP: 192.168.68.63 (PORTA 80)    " />
      <printNormal text="STATO: OPERATIVO 100%           " />
      <printNormal text="--------------------------------" />
      <endNonFiscal operator="1" />
    </printerNonFiscal>
  </soapenv:Body>
</soapenv:Envelope>`;
}
