import type { Product, ProductVariant } from "@/types/product";
import { isPlaceholderImage, resolveProductImageUrl } from "@/lib/r2Public";
import { FREE_SHIPPING_THRESHOLD, STANDARD_SHIPPING_COST } from "@/lib/shipping";

export const BASE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || "https://www.sceltamakeup.it"
).replace(/\/$/, "");

export const ORG_ID = `${BASE_URL}/#organization`;
export const WEBSITE_ID = `${BASE_URL}/#website`;

export function toAbsoluteUrl(src?: string | null): string {
  const resolved = resolveProductImageUrl(src);
  if (resolved.startsWith("http://") || resolved.startsWith("https://")) {
    return resolved;
  }
  if (resolved.startsWith("/")) {
    return `${BASE_URL}${resolved}`;
  }
  return `${BASE_URL}/${resolved}`;
}

/**
 * Validates EAN/UPC/GTIN (8, 12, 13, 14 digits) including GS1 check digit.
 */
export function isValidGtin(raw?: string | null): string | null {
  if (!raw) return null;
  const digits = String(raw).replace(/\D/g, "");
  if (![8, 12, 13, 14].includes(digits.length)) return null;
  if (/^0+$/.test(digits)) return null;

  const body = digits.slice(0, -1);
  const check = Number(digits.slice(-1));
  let sum = 0;
  for (let i = body.length - 1, pos = 0; i >= 0; i--, pos++) {
    const n = Number(body[i]);
    sum += pos % 2 === 0 ? n * 3 : n;
  }
  const expected = (10 - (sum % 10)) % 10;
  return expected === check ? digits : null;
}

function buildReturnPolicySchema() {
  return {
    "@type": "MerchantReturnPolicy",
    "@id": `${BASE_URL}/termini-e-condizioni#return-policy`,
    applicableCountry: "IT",
    returnPolicyCategory: "https://schema.org/MerchantReturnFiniteReturnWindow",
    merchantReturnDays: 14,
    returnMethod: "https://schema.org/ReturnByMail",
    returnFees: "https://schema.org/ReturnShippingFees",
    refundType: "https://schema.org/FullRefund",
  };
}

function buildShippingDetailsSchema(offerPrice: number) {
  const shippingCost =
    offerPrice >= FREE_SHIPPING_THRESHOLD ? 0 : STANDARD_SHIPPING_COST;
  return {
    "@type": "OfferShippingDetails",
    shippingRate: {
      "@type": "MonetaryAmount",
      value: shippingCost.toFixed(2),
      currency: "EUR",
    },
    shippingDestination: {
      "@type": "DefinedRegion",
      addressCountry: "IT",
    },
    deliveryTime: {
      "@type": "ShippingDeliveryTime",
      handlingTime: {
        "@type": "QuantitativeValue",
        minValue: 0,
        maxValue: 1,
        unitCode: "DAY",
      },
      transitTime: {
        "@type": "QuantitativeValue",
        minValue: 1,
        maxValue: 2,
        unitCode: "DAY",
      },
    },
  };
}

export function getOrganizationAndWebsiteSchema() {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": ["Organization", "HealthAndBeautyBusiness", "Store"],
        "@id": ORG_ID,
        name: "Scelta Makeup",
        legalName: "Scelta Makeup di Cesiano Federica",
        url: BASE_URL,
        logo: {
          "@type": "ImageObject",
          "@id": `${BASE_URL}/#logo`,
          url: `${BASE_URL}/brand/logo.png`,
          caption: "Scelta Makeup Logo Ufficiale",
        },
        image: `${BASE_URL}/brand/og-image.jpg`,
        description:
          "Salone di bellezza e boutique ufficiale di alta cosmesi a Napoli. Rivenditore autorizzato Diego della Palma Milano, RVB LAB e Cipria Make Up.",
        telephone: "+39 379 337 0322",
        email: "info@sceltamakeup.it",
        vatID: "IT09914431219",
        taxID: "CSNFRC90H58F839M",
        address: {
          "@type": "PostalAddress",
          streetAddress: "Via Pellegrini 28/29",
          addressLocality: "Napoli",
          addressRegion: "NA",
          postalCode: "80134",
          addressCountry: "IT",
        },
        openingHoursSpecification: [
          {
            "@type": "OpeningHoursSpecification",
            dayOfWeek: [
              "Tuesday",
              "Wednesday",
              "Thursday",
              "Friday",
              "Saturday",
            ],
            opens: "09:30",
            closes: "14:00",
          },
          {
            "@type": "OpeningHoursSpecification",
            dayOfWeek: [
              "Tuesday",
              "Wednesday",
              "Thursday",
              "Friday",
              "Saturday",
            ],
            opens: "16:00",
            closes: "19:30",
          },
        ],
        priceRange: "€€",
        currenciesAccepted: "EUR",
        paymentAccepted: "Credit Card, Apple Pay, Google Pay, Klarna, Scalapay",
        hasMerchantReturnPolicy: buildReturnPolicySchema(),
      },
      {
        "@type": "WebSite",
        "@id": WEBSITE_ID,
        url: BASE_URL,
        name: "Scelta Makeup",
        publisher: {
          "@id": ORG_ID,
        },
        inLanguage: "it-IT",
        potentialAction: {
          "@type": "SearchAction",
          target: {
            "@type": "EntryPoint",
            urlTemplate: `${BASE_URL}/prodotti?q={search_term_string}`,
          },
          "query-input": "required name=search_term_string",
        },
      },
    ],
  };
}

function buildOfferSchema(
  canonicalProductUrl: string,
  price: number,
  inStock: boolean,
  sku: string,
  gtin: string | null,
  variantId?: string
) {
  const offerUrl = variantId
    ? `${canonicalProductUrl}?variant=${encodeURIComponent(variantId)}`
    : canonicalProductUrl;

  return {
    "@type": "Offer",
    url: offerUrl,
    price: price.toFixed(2),
    priceCurrency: "EUR",
    priceValidUntil: "2027-12-31",
    availability: inStock
      ? "https://schema.org/InStock"
      : "https://schema.org/OutOfStock",
    itemCondition: "https://schema.org/NewCondition",
    sku,
    ...(gtin ? { gtin } : {}),
    seller: {
      "@id": ORG_ID,
    },
    shippingDetails: buildShippingDetailsSchema(price),
    hasMerchantReturnPolicy: buildReturnPolicySchema(),
  };
}

export function getProductPageSchema(
  product: Product,
  selectedVariant?: ProductVariant | null
) {
  const canonicalProductUrl = `${BASE_URL}/prodotti/${product.slug}`;

  const imageCandidates = [
    selectedVariant?.image,
    ...(product.images || []),
    ...(product.variants || []).map((v) => v.image),
  ].filter((img): img is string => Boolean(img) && !isPlaceholderImage(img));

  const productImages =
    imageCandidates.length > 0
      ? Array.from(new Set(imageCandidates.map((u) => toAbsoluteUrl(u))))
      : [`${BASE_URL}/brand/logo.png`];

  const variants = Array.isArray(product.variants) ? product.variants : [];
  const targetVariants = selectedVariant
    ? [selectedVariant]
    : variants.length > 0
      ? variants
      : null;

  let offersSchema: Record<string, unknown> | Array<Record<string, unknown>>;
  let topSku = product.id;
  let topGtin: string | null = null;

  if (targetVariants) {
    const mappedOffers = targetVariants.map((v) => {
      const vPrice = Number(v.price ?? product.price ?? 0);
      const vInStock =
        v.stock !== undefined ? v.stock > 0 : (v.inStock ?? product.inStock ?? true);
      const vGtin = isValidGtin(v.ean);
      return buildOfferSchema(
        canonicalProductUrl,
        vPrice,
        vInStock,
        v.sku || v.id,
        vGtin,
        variants.length > 1 ? v.id : undefined
      );
    });
    offersSchema = mappedOffers.length === 1 ? mappedOffers[0] : mappedOffers;
    topSku = targetVariants[0].sku || targetVariants[0].id || product.id;
    if (targetVariants.length === 1) {
      topGtin = isValidGtin(targetVariants[0].ean);
    }
  } else {
    const pPrice = Number(product.price ?? 0);
    const pInStock =
      product.stock !== undefined ? product.stock > 0 : (product.inStock ?? true);
    offersSchema = buildOfferSchema(
      canonicalProductUrl,
      pPrice,
      pInStock,
      product.id,
      null
    );
  }

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Product",
        "@id": `${canonicalProductUrl}#product`,
        name: selectedVariant && variants.length > 1
          ? `${product.name} - ${selectedVariant.name}`
          : product.name,
        description: product.description || product.shortDescription || product.name,
        url: selectedVariant && variants.length > 1
          ? `${canonicalProductUrl}?variant=${encodeURIComponent(selectedVariant.id)}`
          : canonicalProductUrl,
        image: productImages,
        sku: topSku,
        mpn: topSku,
        ...(topGtin
          ? topGtin.length === 13
            ? { gtin13: topGtin }
            : { gtin: topGtin }
          : {}),
        category: product.category,
        brand: {
          "@type": "Brand",
          name: product.brand || "Scelta Makeup",
        },
        itemCondition: "https://schema.org/NewCondition",
        offers: offersSchema,
      },
      {
        "@type": "BreadcrumbList",
        "@id": `${canonicalProductUrl}#breadcrumb`,
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Home",
            item: BASE_URL,
          },
          {
            "@type": "ListItem",
            position: 2,
            name: "Prodotti",
            item: `${BASE_URL}/prodotti`,
          },
          {
            "@type": "ListItem",
            position: 3,
            name: product.category,
            item: `${BASE_URL}/?categoria=${encodeURIComponent(product.category)}#catalogo`,
          },
          {
            "@type": "ListItem",
            position: 4,
            name: product.name,
            item: canonicalProductUrl,
          },
        ],
      },
    ],
  };
}
