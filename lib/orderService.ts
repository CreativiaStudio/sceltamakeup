import { Order, CreateOrderInput, OrderStatus } from "@/types/order";

const STORAGE_ORDERS_KEY = "scelta_makeup_orders_v1";

const INITIAL_DEMO_ORDERS: Order[] = [
  {
    id: "ord-demo-001",
    orderNumber: "SC-ORD-2026-0001",
    customer: {
      nome: "Giulia",
      cognome: "Moretti",
      email: "giulia.moretti@example.com",
      telefono: "+39 349 765 4321",
      indirizzo: "Via Chiaia 142",
      citta: "Napoli",
      cap: "80121",
      note: "Lasciare al portiere se assente.",
    },
    items: [
      {
        id: "ddp-rosso-rossetto",
        productId: "diego-dalla-palma-rossetto-iconico",
        slug: "diego-dalla-palma-rossetto-iconico",
        name: "Rossetto Iconico Diego dalla Palma",
        brand: "Diego dalla Palma",
        price: 24.5,
        quantity: 1,
        shade: {
          id: "shade-01-rosso-rubino",
          name: "01 Rosso Rubino",
          code: "01",
          hex: "#A31621",
          image: "/products/diego-dalla-palma-rossetto-iconico.png",
        },
        image: "/products/diego-dalla-palma-rossetto-iconico.png",
      },
      {
        id: "rvb-fondotinta-glow",
        productId: "rvb-lab-fondotinta-antieta",
        slug: "rvb-lab-fondotinta-antieta",
        name: "Fondotinta Anti-Età Effetto Seta",
        brand: "RVB LAB",
        price: 36.0,
        quantity: 1,
        shade: {
          id: "shade-12-warm-beige",
          name: "12 Warm Beige",
          code: "12",
          hex: "#E0B388",
          image: "/products/rvb-lab-fondotinta-antieta.png",
        },
        image: "/products/rvb-lab-fondotinta-antieta.png",
      },
    ],
    subtotal: 60.5,
    shippingCost: 0.0, // Free shipping over €49
    total: 60.5,
    deliveryMethod: "shipping",
    paymentMethod: "card",
    paymentStatus: "paid",
    status: "processing",
    trackingNumber: "BRT-8099238472",
    sampleIncluded: true,
    createdAt: new Date(Date.now() - 3600000 * 4).toISOString(), // 4 hours ago
  },
  {
    id: "ord-demo-002",
    orderNumber: "SC-ORD-2026-0002",
    customer: {
      nome: "Alessandra",
      cognome: "De Luca",
      email: "alessandra.deluca@example.com",
      telefono: "+39 338 123 9876",
      note: "Passo a ritirare in boutique nel pomeriggio di domani.",
    },
    items: [
      {
        id: "cipria-velvet-blush",
        productId: "cipria-blush-setoso",
        slug: "cipria-blush-setoso",
        name: "Blush Compatto Effetto Velluto",
        brand: "Cipria Make Up",
        price: 18.0,
        quantity: 2,
        shade: {
          id: "shade-03-pesca-dorato",
          name: "03 Pesca Dorato",
          code: "03",
          hex: "#E8927C",
          image: "/products/cipria-blush-setoso.png",
        },
        image: "/products/cipria-blush-setoso.png",
      },
    ],
    subtotal: 36.0,
    shippingCost: 0.0, // Free boutique pickup
    total: 36.0,
    deliveryMethod: "boutique",
    paymentMethod: "boutique",
    paymentStatus: "pending",
    status: "ready_for_pickup",
    sampleIncluded: true,
    createdAt: new Date(Date.now() - 3600000 * 20).toISOString(), // 20 hours ago
  },
];

let memoryOrders: Order[] = [...INITIAL_DEMO_ORDERS];

function getStoredOrders(): Order[] {
  if (typeof window === "undefined") {
    return memoryOrders;
  }
  try {
    const raw = localStorage.getItem(STORAGE_ORDERS_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_ORDERS_KEY, JSON.stringify(INITIAL_DEMO_ORDERS));
      return INITIAL_DEMO_ORDERS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : INITIAL_DEMO_ORDERS;
  } catch (error) {
    console.error("Failed to load orders from localStorage:", error);
    return memoryOrders;
  }
}

function saveStoredOrders(orders: Order[]): void {
  memoryOrders = orders;
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_ORDERS_KEY, JSON.stringify(orders));
  } catch (error) {
    console.error("Failed to save orders to localStorage:", error);
  }
}

export function getAllOrders(): Order[] {
  return getStoredOrders();
}

export function getOrderById(id: string): Order | undefined {
  const orders = getStoredOrders();
  return orders.find((o) => o.id === id);
}

export function getOrderByNumber(orderNumber: string): Order | undefined {
  const orders = getStoredOrders();
  return orders.find((o) => o.orderNumber.toUpperCase() === orderNumber.toUpperCase());
}

export function createOrder(data: CreateOrderInput): Order {
  const orders = getStoredOrders();
  const nextSeq = orders.length + 1;
  const seqPadded = nextSeq.toString().padStart(4, "0");
  const year = new Date().getFullYear();
  const orderNumber = `SC-ORD-${year}-${seqPadded}`;
  const now = new Date().toISOString();

  const subtotal =
    data.subtotal !== undefined
      ? data.subtotal
      : data.items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  let shippingCost = data.shippingCost;
  if (shippingCost === undefined) {
    if (data.deliveryMethod === "boutique") {
      shippingCost = 0;
    } else {
      // Free shipping threshold is €49.00
      shippingCost = subtotal >= 49.0 ? 0 : 4.9;
    }
  }

  const total = data.total !== undefined ? data.total : subtotal + shippingCost;
  const paymentStatus = data.paymentMethod === "boutique" ? "pending" : "paid";

  const newOrder: Order = {
    id: `ord-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    orderNumber,
    customer: data.customer,
    items: data.items,
    subtotal: Math.round(subtotal * 100) / 100,
    shippingCost: Math.round(shippingCost * 100) / 100,
    total: Math.round(total * 100) / 100,
    deliveryMethod: data.deliveryMethod,
    paymentMethod: data.paymentMethod,
    paymentStatus,
    status: "confirmed",
    sampleIncluded: data.sampleIncluded !== undefined ? data.sampleIncluded : true,
    createdAt: now,
    updatedAt: now,
  };

  const updatedOrders = [newOrder, ...orders];
  saveStoredOrders(updatedOrders);
  return newOrder;
}

const STORAGE_PENDING_ORDER_KEY = "scelta_makeup_pending_order_v1";

export function savePendingOrder(data: CreateOrderInput): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_PENDING_ORDER_KEY, JSON.stringify(data));
  } catch (error) {
    console.error("Failed to save pending order draft:", error);
  }
}

export function getPendingOrder(): CreateOrderInput | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_PENDING_ORDER_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && Array.isArray(parsed.items) ? (parsed as CreateOrderInput) : null;
  } catch (error) {
    console.error("Failed to load pending order draft:", error);
    return null;
  }
}

export function clearPendingOrder(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_PENDING_ORDER_KEY);
  } catch (error) {
    console.error("Failed to clear pending order draft:", error);
  }
}

export function updateOrderStatus(
  orderId: string,
  status: OrderStatus,
  trackingNumber?: string
): Order {
  const orders = getStoredOrders();
  const index = orders.findIndex((o) => o.id === orderId);
  if (index === -1) {
    throw new Error(`Ordine con ID ${orderId} non trovato`);
  }

  const existing = orders[index];
  const updated: Order = {
    ...existing,
    status,
    trackingNumber: trackingNumber !== undefined ? trackingNumber : existing.trackingNumber,
    paymentStatus: status === "completed" ? "paid" : existing.paymentStatus,
    updatedAt: new Date().toISOString(),
  };

  orders[index] = updated;
  saveStoredOrders(orders);
  return updated;
}
