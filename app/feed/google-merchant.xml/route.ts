import { NextResponse } from "next/server";
import { getAllProducts } from "@/lib/catalog";
import { isPlaceholderImage, resolveProductImageUrl } from "@/lib/r2Public";
import { BASE_URL, isValidGtin } from "@/lib/schema";
import { FREE_SHIPPING_THRESHOLD, STANDARD_SHIPPING_COST } from "@/lib/shipping";
import type { Product, ProductVariant } from "@/types/product";

export const dynamic = "force-dynamic";

const GENERIC_VARIANT_NAMES = new Set([
  "formato originale",
  "standard",
  "unica",
  "default",
  "unico",
]);

function escapeXml(str: string): string {
  const cleaned = str.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");
  return cleaned
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function truncateClean(str: string, maxLen: number): string {
  const normalized = str.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLen) return normalized;
  return normalized.slice(0, maxLen - 1).trimEnd() + "…";
}

function toAbsoluteHttpsUrl(src?: string | null): string | null {
  if (!src || isPlaceholderImage(src)) return null;
  const resolved = resolveProductImageUrl(src);
  if (isPlaceholderImage(resolved)) return null;
  if (resolved.startsWith("https://")) return resolved;
  if (resolved.startsWith("http://")) return resolved.replace(/^http:\/\//, "https://");
  if (resolved.startsWith("/")) return `${BASE_URL}${resolved}`;
  return `${BASE_URL}/${resolved}`;
}

function mapGoogleProductCategory(category: string): string {
  switch (category) {
    case "Viso":
      return "Health & Beauty > Personal Care > Cosmetics > Makeup > Face Makeup";
    case "Occhi":
      return "Health & Beauty > Personal Care > Cosmetics > Makeup > Eye Makeup";
    case "Labbra":
      return "Health & Beauty > Personal Care > Cosmetics > Makeup > Lip Makeup";
    case "Skincare & Dermo":
      return "Health & Beauty > Personal Care > Cosmetics > Skin Care";
    case "Beauty & Accessori":
      return "Health & Beauty > Personal Care > Cosmetics > Cosmetic Tools";
    default:
      return "Health & Beauty > Personal Care > Cosmetics";
  }
}

function isExcludedProduct(p: Product): boolean {
  if (p.isLocalOnly) return true;
  if (p.id === "TEST01" || p.slug === "test-cassa-1-euro") return true;
  if (/test cassa/i.test(p.name)) return true;
  return false;
}

function buildItemTitle(product: Product, variant: ProductVariant, isMultiVariant: boolean): string {
  const brand = (product.brand || "").trim();
  const baseName = (product.name || "").trim();
  let title =
    brand && !baseName.toLowerCase().includes(brand.toLowerCase())
      ? `${brand} ${baseName}`
      : baseName;

  const variantName = (variant.name || "").trim();
  if (
    isMultiVariant &&
    variantName &&
    !GENERIC_VARIANT_NAMES.has(variantName.toLowerCase())
  ) {
    title = `${title} - ${variantName}`;
  }

  return truncateClean(title, 150);
}

function buildItemDescription(product: Product): string {
  const base = (product.description || product.shortDescription || product.name || "").trim();
  const benefits = (product.formulaBenefits || "").trim();
  const full =
    base.length < 120 && benefits && !base.includes(benefits)
      ? `${base} ${benefits}`
      : base;
  return truncateClean(full || product.name, 5000);
}

export async function GET() {
  const products = await getAllProducts({ fresh: true });

  const lines: string[] = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">',
    "<channel>",
    `  <title>${escapeXml("Scelta Makeup — Catalogo Ufficiale")}</title>`,
    `  <link>${escapeXml(BASE_URL)}</link>`,
    `  <description>${escapeXml("Boutique make-up & dermo-cosmesi a Napoli — Rivenditore autorizzato Diego della Palma, RVB LAB, Cipria Make Up, Eveline Cosmetics, Pierre René e Miyo")}</description>`,
  ];

  for (const product of products) {
    if (isExcludedProduct(product)) continue;

    const variants: ProductVariant[] =
      Array.isArray(product.variants) && product.variants.length > 0
        ? product.variants
        : [
            {
              id: product.id,
              name: "Formato Originale",
              sku: product.id,
              ean: "",
              colorHex: null,
              image: product.images?.[0] || "",
              inStock: product.stock !== undefined ? product.stock > 0 : (product.inStock ?? true),
              stock: product.stock,
              price: product.price,
            },
          ];

    const isMultiVariant = variants.length > 1;
    const googleCat = mapGoogleProductCategory(product.category);
    const description = buildItemDescription(product);
    const brand = (product.brand || "Scelta Makeup").trim();
    const customLabel2 =
      product.badges?.includes("bestseller") || product.badge === "Bestseller"
        ? "bestseller"
        : "catalogo";

    for (const variant of variants) {
      const effectivePrice = Number(variant.price ?? product.price ?? 0);
      if (!Number.isFinite(effectivePrice) || effectivePrice <= 0) continue;

      const primaryImage =
        [variant.image, ...(product.images || [])]
          .map((u) => toAbsoluteHttpsUrl(u))
          .find((u): u is string => Boolean(u)) || null;

      // Skip items that only have placeholder images to prevent Merchant Center disapprovals
      if (!primaryImage) continue;

      const additionalImages = Array.from(
        new Set(
          [...(product.images || []), variant.textureImage]
            .map((u) => toAbsoluteHttpsUrl(u))
            .filter((u): u is string => Boolean(u) && u !== primaryImage)
        )
      ).slice(0, 5);

      const inStock =
        variant.stock !== undefined
          ? Number(variant.stock) > 0
          : (variant.inStock ?? true);
      const availability = inStock ? "in_stock" : "out_of_stock";

      const hasDiscount =
        typeof product.originalPrice === "number" &&
        Number.isFinite(product.originalPrice) &&
        product.originalPrice > effectivePrice;

      const regularPriceStr = `${(hasDiscount ? product.originalPrice! : effectivePrice).toFixed(2)} EUR`;
      const salePriceStr = hasDiscount ? `${effectivePrice.toFixed(2)} EUR` : null;

      const shippingCost =
        effectivePrice >= FREE_SHIPPING_THRESHOLD ? 0 : STANDARD_SHIPPING_COST;

      const itemId = truncateClean(variant.id || product.id, 50);
      const itemLink = isMultiVariant
        ? `${BASE_URL}/prodotti/${product.slug}?variant=${encodeURIComponent(variant.id)}`
        : `${BASE_URL}/prodotti/${product.slug}`;

      const gtin = isValidGtin(variant.ean);
      const mpn = truncateClean(variant.sku || variant.id || product.id, 70);
      const variantName = (variant.name || "").trim();
      const hasColor =
        isMultiVariant &&
        variantName.length > 0 &&
        !GENERIC_VARIANT_NAMES.has(variantName.toLowerCase());

      lines.push("  <item>");
      lines.push(`    <g:id>${escapeXml(itemId)}</g:id>`);
      if (isMultiVariant) {
        lines.push(`    <g:item_group_id>${escapeXml(truncateClean(product.id, 50))}</g:item_group_id>`);
      }
      lines.push(`    <g:title>${escapeXml(buildItemTitle(product, variant, isMultiVariant))}</g:title>`);
      lines.push(`    <g:description>${escapeXml(description)}</g:description>`);
      lines.push(`    <g:link>${escapeXml(itemLink)}</g:link>`);
      lines.push(`    <g:image_link>${escapeXml(primaryImage)}</g:image_link>`);
      for (const addImg of additionalImages) {
        lines.push(`    <g:additional_image_link>${escapeXml(addImg)}</g:additional_image_link>`);
      }
      lines.push(`    <g:availability>${availability}</g:availability>`);
      lines.push(`    <g:price>${regularPriceStr}</g:price>`);
      if (salePriceStr) {
        lines.push(`    <g:sale_price>${salePriceStr}</g:sale_price>`);
      }
      lines.push(`    <g:brand>${escapeXml(truncateClean(brand, 70))}</g:brand>`);
      lines.push("    <g:condition>new</g:condition>");
      if (gtin) {
        lines.push(`    <g:gtin>${gtin}</g:gtin>`);
        if (mpn) {
          lines.push(`    <g:mpn>${escapeXml(mpn)}</g:mpn>`);
        }
      } else {
        if (mpn) {
          lines.push(`    <g:mpn>${escapeXml(mpn)}</g:mpn>`);
        }
        lines.push("    <g:identifier_exists>no</g:identifier_exists>");
      }
      if (hasColor) {
        lines.push(`    <g:color>${escapeXml(truncateClean(variantName, 100))}</g:color>`);
      }
      lines.push(`    <g:google_product_category>${escapeXml(googleCat)}</g:google_product_category>`);
      lines.push(`    <g:product_type>${escapeXml(truncateClean(`${product.category} > ${brand}`, 750))}</g:product_type>`);
      lines.push(`    <g:custom_label_0>${escapeXml(truncateClean(brand, 100))}</g:custom_label_0>`);
      lines.push(`    <g:custom_label_1>${escapeXml(truncateClean(product.category, 100))}</g:custom_label_1>`);
      lines.push(`    <g:custom_label_2>${customLabel2}</g:custom_label_2>`);
      lines.push("    <g:shipping>");
      lines.push("      <g:country>IT</g:country>");
      lines.push("      <g:service>Corriere Espresso 24/48h</g:service>");
      lines.push(`      <g:price>${shippingCost.toFixed(2)} EUR</g:price>`);
      lines.push("    </g:shipping>");
      lines.push("  </item>");
    }
  }

  lines.push("</channel>");
  lines.push("</rss>");

  return new NextResponse(lines.join("\n"), {
    status: 200,
    headers: {
      "Content-Type": "application/xml; charset=UTF-8",
      "Cache-Control": "public, s-maxage=900, stale-while-revalidate=1800",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}
