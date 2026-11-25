import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  sanitizeFiscalDescription,
  parseFpmateResponse,
  buildFiscalReceiptXml,
  buildVoidReceiptXml,
  buildOpenDrawerXml,
  buildNonFiscalTestXml,
  buildResetPrinterXml,
  buildCloseEmptyReceiptXml,
  unlockEpsonPrinter,
  sendFiscalReceiptWithAutoRecovery,
} from "../lib/epsonFiscal.ts";

interface CatalogVariant {
  name?: string;
  price?: number;
}

interface CatalogProduct {
  id: string;
  name: string;
  price: number;
  variants?: CatalogVariant[];
}

function assertXmlAttributesClean(xml: string, contextLabel: string) {
  const attrRegex = /description="([^"]*)"/g;
  let match: RegExpExecArray | null;
  let count = 0;
  while ((match = attrRegex.exec(xml)) !== null) {
    count++;
    const val = match[1];
    assert.ok(val.length > 0, `${contextLabel}: description must not be empty`);
    assert.ok(val.length <= 22, `${contextLabel}: description "${val}" exceeds 22 chars (${val.length})`);
    assert.equal(/[&<>'"\\]/.test(val), false, `${contextLabel}: unsafe XML char in "${val}"`);
    assert.equal(/[^\x20-\x7E]/.test(val), false, `${contextLabel}: non-ASCII char in "${val}"`);
  }
  assert.ok(count > 0, `${contextLabel}: expected at least one description attribute`);
}

describe("Epson FP-81II RT Fiscal Module", () => {
  it("sanitizes the exact offending product '4D Pro Lash&brow - Siero Ciglia & Sopracciglia'", () => {
    const clean = sanitizeFiscalDescription("4D Pro Lash&brow - Siero Ciglia & Sopracciglia");
    assert.strictEqual(clean, "4D Pro Lash e brow - S");
    assert.ok(clean.length <= 22);
    assert.equal(clean.includes("&"), false);
  });

  it("decodes HTML entities, normalizes accents, and strips XML delimiters", () => {
    assert.strictEqual(
      sanitizeFiscalDescription("Palette Look Up Let&#8217;s Try!"),
      "Palette Look Up Let s"
    );
    assert.strictEqual(
      sanitizeFiscalDescription("Take Me On&#8230; &amp; More"),
      "Take Me On... e More"
    );
    assert.strictEqual(
      sanitizeFiscalDescription("Crema Antietà <Top> \"Pro\""),
      "Crema Antieta Top Pro"
    );
    assert.strictEqual(sanitizeFiscalDescription("   "), "ARTICOLO");
  });

  it("produces clean, valid XML descriptions for EVERY product and variant in catalog.json", () => {
    const catalogPath = path.resolve(process.cwd(), "data", "catalog.json");
    const products = JSON.parse(fs.readFileSync(catalogPath, "utf8")) as CatalogProduct[];
    assert.ok(products.length > 300, "Expected full catalog");

    for (const p of products) {
      const variants = p.variants && p.variants.length > 0 ? p.variants : [{ name: "Standard", price: p.price }];
      for (const v of variants) {
        const rawDesc = p.name + (v?.name && v.name !== "Standard" ? ` ${v.name}` : "");
        const xml = buildFiscalReceiptXml({
          items: [{ description: rawDesc, quantity: 1, unitPrice: v?.price ?? p.price ?? 10 }],
          paymentMethod: "cash",
        });
        assertXmlAttributesClean(xml, `${p.id} (${v?.name ?? "Standard"})`);
      }
    }
  });

  it("enforces exact cent matching on card payments and computes cash tendered properly", () => {
    const cardXml = buildFiscalReceiptXml({
      items: [
        { description: "Prodotto A&B", quantity: 2, unitPrice: 12.35 },
        { description: "Prodotto C", quantity: 1, unitPrice: 5.3 },
      ],
      paymentMethod: "card",
      tenderedAmount: 50, // must be ignored for card
    });
    assert.ok(cardXml.includes('description="PAGAMENTO ELETTRONICO"'));
    assert.ok(cardXml.includes('payment="30.00"'));
    assert.ok(cardXml.includes('paymentType="2"'));
    assert.ok(cardXml.includes('index="2"'));
    assertXmlAttributesClean(cardXml, "card-multi");

    const cashXml = buildFiscalReceiptXml({
      items: [{ description: "4D Pro Lash&brow - Siero Ciglia & Sopracciglia", quantity: 1, unitPrice: 28.05 }],
      paymentMethod: "cash",
      tenderedAmount: 50,
    });
    assert.ok(cashXml.includes('description="4D Pro Lash e brow - S"'));
    assert.ok(cashXml.includes('description="CONTANTI"'));
    assert.ok(cashXml.includes('payment="50.00"'));
    assert.ok(cashXml.includes('paymentType="0"'));
    assert.ok(cashXml.includes('index="0"'));
  });

  it("parses fpmate.cgi responses accurately", () => {
    const okRes = parseFpmateResponse('<response success="true" code="" status="2" />');
    assert.deepStrictEqual(okRes, {
      success: true,
      code: "",
      status: "2",
      raw: '<response success="true" code="" status="2" />',
    });

    const errRes = parseFpmateResponse('<response success="false" code="EPTR_REC_EMPTY" status="1" />');
    assert.strictEqual(errRes.success, false);
    assert.strictEqual(errRes.code, "EPTR_REC_EMPTY");
    assert.strictEqual(errRes.status, "1");

    const xmlSyntaxErr = parseFpmateResponse("<html>400 Bad XML</html>");
    assert.strictEqual(xmlSyntaxErr.success, false);
    assert.strictEqual(xmlSyntaxErr.code, "");
  });

  it("builds valid void, drawer, and non-fiscal test XML payloads", () => {
    const voidXml = buildVoidReceiptXml();
    assert.ok(voidXml.includes("<printRecVoid operator=\"1\" />"));
    assert.ok(voidXml.includes("<endFiscalReceipt operator=\"1\" />"));

    const drawerXml = buildOpenDrawerXml();
    assert.ok(drawerXml.includes("<openDrawer />"));

    const testXml = buildNonFiscalTestXml("25/11/2026", "12:00:00");
    assert.ok(testXml.includes("<beginNonFiscal operator=\"1\" />"));
    assert.ok(testXml.includes("DATA: 25/11/2026 ORA: 12:00:00"));

    const resetXml = buildResetPrinterXml();
    assert.ok(resetXml.includes("<printerCommand>"));
    assert.ok(resetXml.includes("<resetPrinter operator=\"1\" />"));

    const closeXml = buildCloseEmptyReceiptXml();
    assert.ok(closeXml.includes("<printerFiscalReceipt>"));
    assert.ok(closeXml.includes("<endFiscalReceipt operator=\"1\" />"));
  });

  it("unlockEpsonPrinter cascades from printRecVoid to resetPrinter when void fails", async () => {
    const originalFetch = globalThis.fetch;
    const calls: string[] = [];
    globalThis.fetch = (async (_url: unknown, init?: RequestInit) => {
      const body = String(init?.body || "");
      calls.push(body);
      if (body.includes("<printRecVoid")) {
        return new Response('<response success="false" code="EPTR_VOID_ERR" status="1" />', { status: 200 });
      }
      if (body.includes("<resetPrinter")) {
        return new Response('<response success="true" code="" status="2" />', { status: 200 });
      }
      return new Response('<response success="false" code="UNEXPECTED" status="0" />', { status: 200 });
    }) as typeof fetch;

    try {
      const result = await unlockEpsonPrinter("http://mock-rt/fpmate.cgi");
      assert.strictEqual(result.unlocked, true);
      assert.strictEqual(result.method, "resetPrinter");
      assert.strictEqual(calls.length, 2);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("sendFiscalReceiptWithAutoRecovery unlocks and retries once when first print is rejected", async () => {
    const originalFetch = globalThis.fetch;
    let receiptAttempts = 0;
    globalThis.fetch = (async (_url: unknown, init?: RequestInit) => {
      const body = String(init?.body || "");
      if (body.includes("<printRecItem")) {
        receiptAttempts++;
        if (receiptAttempts === 1) {
          return new Response('<response success="false" code="FP_OPEN_REC" status="1" />', { status: 200 });
        }
        return new Response('<response success="true" code="" status="2" />', { status: 200 });
      }
      if (body.includes("<printRecVoid")) {
        return new Response('<response success="true" code="" status="2" />', { status: 200 });
      }
      return new Response('<response success="false" code="ERR" status="0" />', { status: 200 });
    }) as typeof fetch;

    try {
      const xml = buildFiscalReceiptXml({
        items: [{ description: "4D Pro Lash&brow", quantity: 1, unitPrice: 27.39 }],
        paymentMethod: "cash",
      });
      const outcome = await sendFiscalReceiptWithAutoRecovery(xml, "http://mock-rt/fpmate.cgi");
      assert.strictEqual(outcome.ok, true);
      assert.strictEqual(outcome.recovered, true);
      assert.strictEqual(outcome.recoveryMethod, "printRecVoid");
      assert.strictEqual(outcome.firstError?.code, "FP_OPEN_REC");
      assert.strictEqual(receiptAttempts, 2);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
