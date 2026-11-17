import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import type { DeliveryMethod, PaymentMethod } from "@/types/order";
import type { Product, ProductVariant, Shade } from "@/types/product";
import { getAllProducts } from "@/lib/catalog";
import { getCentralCatalogState } from "@/lib/serverCatalogStore";
import { validateCouponForCart } from "@/lib/serverCouponStore";

const FREE_SHIPPING_THRESHOLD = 49.0;
const STANDARD_SHIPPING_COST = 4.9;

interface CheckoutItemInput {
  productId?: string;
  shadeId?: string;
  name: string;
  brand?: string;
  category?: string;
  price?: number;
  quantity: number;
  image?: string;
  shade?: string;
}

interface CheckoutCustomerInput {
  nome: string;
  cognome: string;
  email: string;
  telefono?: string;
  indirizzo?: string;
  citta?: string;
  cap?: string;
  note?: string;
}

interface CheckoutRequestBody {
  items: CheckoutItemInput[];
  customer: CheckoutCustomerInput;
  deliveryMethod: DeliveryMethod;
  paymentMethod: PaymentMethod;
  shippingCost?: number;
  total?: number;
  couponCode?: string;
}

interface VerifiedCheckoutItem {
  id: string;
  productId: string;
  name: string;
  brand: string;
  category: string;
  price: number;
  quantity: number;
  image?: string;
  shade?: string;
}

function toCents(euros: number): number {
  return Math.round((Number.isFinite(euros) ? euros : 0) * 100);
}

function roundMoney(euros: number): number {
  return Math.round(euros * 100) / 100;
}

function absoluteUrl(path: string | undefined, origin: string): string | undefined {
  if (!path) return undefined;
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  try {
    return new URL(path, origin).toString();
  } catch {
    return undefined;
  }
}

function norm(value: string | undefined | null): string {
  return (value ?? "").trim().toLowerCase();
}

function findProduct(products: Product[], item: CheckoutItemInput): Product | undefined {
  if (item.productId && typeof item.productId === "string") {
    const byId = products.find((p) => p.id === item.productId!.trim());
    if (byId) return byId;
  }
  const targetName = norm(item.name);
  if (targetName) {
    return products.find((p) => norm(p.name) === targetName);
  }
  return undefined;
}

function findVariant(product: Product, item: CheckoutItemInput): ProductVariant | undefined {
  const variants = Array.isArray(product.variants) ? product.variants : [];
  if (variants.length === 0) return undefined;
  if (item.shadeId && typeof item.shadeId === "string") {
    const byId = variants.find((v) => v.id === item.shadeId!.trim());
    if (byId) return byId;
  }
  const shadeName = norm(item.shade);
  if (shadeName) {
    return variants.find((v) => norm(v.name) === shadeName);
  }
  return undefined;
}

function findShade(product: Product, item: CheckoutItemInput): Shade | undefined {
  const shades = Array.isArray(product.shades) ? product.shades : [];
  if (shades.length === 0) return undefined;
  if (item.shadeId && typeof item.shadeId === "string") {
    const byId = shades.find((s) => s.id === item.shadeId!.trim());
    if (byId) return byId;
  }
  const shadeName = norm(item.shade);
  if (shadeName) {
    return shades.find((s) => norm(s.name) === shadeName);
  }
  return undefined;
}

export async function POST(req: NextRequest) {
  let body: CheckoutRequestBody;
  try {
    body = (await req.json()) as CheckoutRequestBody;
  } catch {
    return NextResponse.json({ error: "Corpo richiesta non valido" }, { status: 400 });
  }

  const { items, customer, deliveryMethod, paymentMethod, couponCode } = body;

  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: "Carrello vuoto" }, { status: 400 });
  }
  if (!customer?.email) {
    return NextResponse.json({ error: "Email cliente mancante" }, { status: 400 });
  }

  const [products, centralState] = await Promise.all([
    getAllProducts(),
    getCentralCatalogState().catch(() => null),
  ]);

  const variantStocks = centralState?.variantStocks ?? {};
  const verifiedItems: VerifiedCheckoutItem[] = [];

  for (const item of items) {
    const qty = Number(item?.quantity);
    if (!Number.isInteger(qty) || qty < 1) {
      return NextResponse.json(
        { error: `Quantità non valida per il prodotto: ${item?.name || "sconosciuto"}` },
        { status: 400 }
      );
    }

    const product = findProduct(products, item);
    if (!product) {
      return NextResponse.json(
        { error: `Prodotto non trovato nel catalogo: ${item?.name || item?.productId || "sconosciuto"}` },
        { status: 400 }
      );
    }

    const variant = findVariant(product, item);
    const shade = findShade(product, item);
    const requestedVariant = Boolean((item.shadeId && item.shadeId.trim()) || (item.shade && item.shade.trim()));

    if (
      requestedVariant &&
      !variant &&
      !shade &&
      ((product.variants?.length ?? 0) > 0 || (product.shades?.length ?? 0) > 0)
    ) {
      return NextResponse.json(
        { error: `Variante non trovata per ${product.name}: ${item.shade || item.shadeId}` },
        { status: 400 }
      );
    }

    const stockOverridePrice = variant ? variantStocks[variant.id]?.price : undefined;
    const rawPrice =
      stockOverridePrice !== undefined
        ? stockOverridePrice
        : variant?.price !== undefined
        ? variant.price
        : shade?.price !== undefined
        ? shade.price
        : product.price;

    const unitPrice = roundMoney(Number(rawPrice));
    if (!Number.isFinite(unitPrice) || unitPrice <= 0) {
      return NextResponse.json(
        { error: `Prezzo non valido per il prodotto: ${product.name}` },
        { status: 400 }
      );
    }

    verifiedItems.push({
      id: product.id,
      productId: product.id,
      name: product.name,
      brand: product.brand,
      category: product.category,
      price: unitPrice,
      quantity: qty,
      image: variant?.image || shade?.image || product.images?.[0] || item.image,
      shade: variant?.name || shade?.name || (item.shade ? item.shade.trim() : undefined),
    });
  }

  const origin = req.nextUrl.origin;

  // Validazione coupon server-side sui prezzi reali dal catalogo (senza incrementare utilizzi prima del pagamento)
  let validatedDiscount = 0;
  let validCouponCode: string | undefined = undefined;

  if (couponCode && typeof couponCode === "string" && couponCode.trim()) {
    const val = await validateCouponForCart(couponCode.trim(), verifiedItems);
    if (val.valid && val.discountAmount > 0) {
      validatedDiscount = val.discountAmount;
      validCouponCode = val.coupon?.code;
    }
  }

  const subtotalBeforeDiscount = roundMoney(
    verifiedItems.reduce((s, i) => s + i.price * i.quantity, 0)
  );
  const netSubtotal = Math.max(0, roundMoney(subtotalBeforeDiscount - validatedDiscount));
  const serverShippingCost =
    deliveryMethod === "boutique" || netSubtotal >= FREE_SHIPPING_THRESHOLD
      ? 0
      : STANDARD_SHIPPING_COST;

  const discountRatio =
    subtotalBeforeDiscount > 0
      ? Math.max(0, 1 - validatedDiscount / subtotalBeforeDiscount)
      : 1;

  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = verifiedItems.map((item) => {
    const netPrice = validatedDiscount > 0 ? item.price * discountRatio : item.price;

    return {
      price_data: {
        currency: "eur",
        unit_amount: toCents(netPrice),
        product_data: {
          name: validCouponCode
            ? `${item.shade ? `${item.name} — ${item.shade}` : item.name} [Promo ${validCouponCode}]`
            : item.shade
            ? `${item.name} — ${item.shade}`
            : item.name,
          images: absoluteUrl(item.image, origin) ? [absoluteUrl(item.image, origin)!] : undefined,
        },
      },
      quantity: item.quantity,
    };
  });

  if (serverShippingCost > 0) {
    lineItems.push({
      price_data: {
        currency: "eur",
        unit_amount: toCents(serverShippingCost),
        product_data: {
          name: "Spedizione Corriere Espresso 24/48h",
        },
      },
      quantity: 1,
    });
  }

  const itemsSummary = verifiedItems
    .map((i) => `${i.name}${i.shade ? ` (${i.shade})` : ""} x${i.quantity}`)
    .join(", ")
    .slice(0, 480);

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      currency: "eur",
      line_items: lineItems,
      customer_email: customer.email,
      metadata: {
        orderCustomer: `${customer.nome} ${customer.cognome}`.trim(),
        customerPhone: customer.telefono || "",
        deliveryMethod,
        paymentMethod,
        itemsSummary,
        couponCode: validCouponCode || "",
        discountAmount: String(validatedDiscount),
        shippingCost: String(serverShippingCost),
      },
      shipping_address_collection:
        deliveryMethod === "shipping" ? { allowed_countries: ["IT"] } : undefined,
      success_url: `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/checkout`,
    });

    return NextResponse.json({ url: session.url, sessionId: session.id });
  } catch (error) {
    console.error("Stripe Checkout Session error:", error);
    const message = error instanceof Error ? error.message : "Errore di connessione con Stripe";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
