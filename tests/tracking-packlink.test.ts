import { describe, it } from "node:test";
import assert from "node:assert";
import {
  getCourierTrackingUrl,
  isPacklinkReference,
  resolveCarrierTrackingCode,
} from "../lib/trackingUtils";
import { normalizeTrackingStatus } from "../lib/packlink";

describe("Tracking URLs & Packlink PRO normalization", () => {
  it("builds Poste Italiane / SDA / Crono tracking URLs keeping hyphens and stripping whitespace", () => {
    const posteClean = getCourierTrackingUrl("Poste Italiane", "1UW1 YZL 152529");
    assert.strictEqual(
      posteClean,
      "https://www.poste.it/cerca/index.html#/risultati-spedizioni/1UW1YZL152529"
    );

    const sdaUrl = getCourierTrackingUrl("SDA Express", "1UW1YZL126029");
    assert.strictEqual(
      sdaUrl,
      "https://www.poste.it/cerca/index.html#/risultati-spedizioni/1UW1YZL126029"
    );

    const cronoUrl = getCourierTrackingUrl("Poste Crono", "POSTE-5544332211");
    assert.strictEqual(
      cronoUrl,
      "https://www.poste.it/cerca/index.html#/risultati-spedizioni/POSTE-5544332211"
    );

    const fallbackUrl = getCourierTrackingUrl("", "1UW1YZL152529");
    assert.strictEqual(
      fallbackUrl,
      "https://www.poste.it/cerca/index.html#/risultati-spedizioni/1UW1YZL152529"
    );
  });

  it("builds tracking URLs for BRT, GLS, DHL, UPS, InPost, FedEx, TNT", () => {
    assert.strictEqual(
      getCourierTrackingUrl("BRT Express", "BRT-9921448102"),
      "https://www.brt.it/it/tracking?codiceSpedizione=BRT-9921448102"
    );
    assert.strictEqual(
      getCourierTrackingUrl("GLS Italy", "GLS12345"),
      "https://gls-group.com/IT/it/servizi-online/ricerca-spedizioni.html?match=GLS12345"
    );
    assert.strictEqual(
      getCourierTrackingUrl("DHL Express", "DHL987"),
      "https://www.dhl.com/it-it/home/tracciamento.html?tracking-id=DHL987"
    );
    assert.strictEqual(
      getCourierTrackingUrl("UPS", "1Z999AA101"),
      "https://www.ups.com/track?loc=it_IT&tracknum=1Z999AA101"
    );
    assert.strictEqual(
      getCourierTrackingUrl("InPost", "INP123"),
      "https://inpost.it/trova-il-tuo-pacco?number=INP123"
    );
  });

  it("detects Packlink references and resolves only native carrier tracking codes", () => {
    assert.strictEqual(isPacklinkReference("IT2026PRO0008029618"), true);
    assert.strictEqual(isPacklinkReference("1UW1YZL152529"), false);

    // Ignores trackingCode when it equals packlinkReference
    assert.strictEqual(
      resolveCarrierTrackingCode({
        trackingCode: "IT2026PRO0008029618",
        packlinkReference: "IT2026PRO0008029618",
      }),
      ""
    );

    // Prefers live carrier tracking number over stale Packlink reference
    assert.strictEqual(
      resolveCarrierTrackingCode(
        {
          trackingCode: "IT2026PRO0008029618",
          packlinkReference: "IT2026PRO0008029618",
        },
        "1UW1YZL152529"
      ),
      "1UW1YZL152529"
    );

    // Uses stored carrier tracking code when valid
    assert.strictEqual(
      resolveCarrierTrackingCode({
        trackingCode: "1UW1YZL126029",
        packlinkReference: "IT2026PRO0007622750",
      }),
      "1UW1YZL126029"
    );
  });

  it("normalizes Packlink status_code and Poste Italiane Italian event descriptions", () => {
    assert.strictEqual(normalizeTrackingStatus([]), "created");

    assert.strictEqual(
      normalizeTrackingStatus([
        {
          date: "2026-11-23T09:24:27.000Z",
          description: "ACCETTAZIONE UFFICIO POSTALE",
          statusCode: "READY_FOR_COLLECTION",
        },
      ]),
      "in_transit"
    );

    assert.strictEqual(
      normalizeTrackingStatus([
        {
          date: "2026-11-12T10:00:00.000Z",
          description: "IN TRANSITO",
          statusCode: "IN_TRANSIT",
        },
      ]),
      "in_transit"
    );

    assert.strictEqual(
      normalizeTrackingStatus([
        {
          date: "2026-11-15T08:00:00.000Z",
          description: "IN CONSEGNA",
          statusCode: "OUT_FOR_DELIVERY",
        },
      ]),
      "out_for_delivery"
    );

    assert.strictEqual(
      normalizeTrackingStatus(
        [
          {
            date: "2026-11-16T12:00:00.000Z",
            description: "CONSEGNATO",
            statusCode: "DELIVERED",
          },
        ],
        "DELIVERED"
      ),
      "delivered"
    );
  });
});
