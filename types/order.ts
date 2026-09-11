export type DeliveryMethod = "shipping" | "boutique";
export type PaymentMethod = "card" | "klarna" | "boutique";
export type OrderStatus =
  | "confirmed"
  | "processing"
  | "shipped"
  | "ready_for_pickup"
  | "completed"
  | "cancelled";

export interface OrderCustomer {
  nome: string;
  cognome: string;
  email: string;
  telefono: string;
  indirizzo?: string;
  citta?: string;
  cap?: string;
  note?: string;
}

export interface OrderItem {
  id: string;
  productId: string;
  slug: string;
  name: string;
  brand: string;
  price: number;
  quantity: number;
  shade?: {
    id: string;
    name: string;
    code?: string;
    hex?: string;
    image?: string;
  };
  image: string;
}

export interface Order {
  id: string;
  orderNumber: string; // e.g. "SC-ORD-2026-0001"
  customer: OrderCustomer;
  items: OrderItem[];
  subtotal: number;
  shippingCost: number;
  total: number;
  deliveryMethod: DeliveryMethod;
  paymentMethod: PaymentMethod;
  paymentStatus: "paid" | "pending";
  status: OrderStatus;
  trackingNumber?: string;
  sampleIncluded: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface CreateOrderInput {
  customer: OrderCustomer;
  items: OrderItem[];
  deliveryMethod: DeliveryMethod;
  paymentMethod: PaymentMethod;
  subtotal?: number;
  shippingCost?: number;
  total?: number;
  sampleIncluded?: boolean;
}
