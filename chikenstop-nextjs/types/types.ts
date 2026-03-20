export type Category = {
  documentId: string;
  name: string;
  menu_items: MenuItem[] | null;
  combos: Combo[] | null;
};

export type Combo = {
  documentId: string;
  name: string;
  price: number;
  description: string | null;
  image: string;
  category: Category | null;
  menu_items: MenuItem[] | null;
};

export type MenuItem = {
  // this is the document id from strapi
  documentId: string;
  name: string;
  price: number;
  description: string | null;
  image: string;
  category: Category | null;
  combos: Combo[] | null;
};

export type CartLine = {
  item: MenuItem;
  quantity: number;
};

export type CartSnapshotLine = {
  documentId: string;
  quantity: number;
  name: string;
  unitPrice: number;
  image: string;
};

export type CartSyncStatus = "idle" | "syncing" | "ready" | "error";

export type OfficialCartLine = {
  documentId: string;
  quantity: number;
  name: string;
  unitPrice: number;
  lineTotal: number;
  image: string;
  available: boolean;
  note?: string;
};

export type OfficialCart = {
  id: string;
  currency: string;
  items: OfficialCartLine[];
  subtotal: number;
  discountTotal: number;
  total: number;
  updatedAt?: string;
  expiresAt?: string;
};

// !!!! may be adding more of this later
export type CustomerInfo = {
  name: string;
  email: string;
  phone: string;
};

export type CheckoutFormValues = {
  customer: CustomerInfo;
  notes: string;
  discountCode: string;
};

export type CreateOrderPayload = {
  cartId: string;
  customer: CustomerInfo;
  notes?: string;
  metadata?: OrderRequestMetadata;
};

export type CreatedOrder = {
  id: string;
  status?: string;
};

export type OrderRequestMetadata = {
  checkoutPaymentId: string;
  paymentId: string;
  preferenceId: string;
  orderRequestIdempotencyKey: string;
  approvedAt: string;
  source: "mercadopago-webhook";
};

export type OrderStatus = "approved";

export type CheckoutPaymentStatus =
  | "initiated"
  | "processing"
  | "pending"
  | "approved"
  | "rejected"
  | "failed"
  | "duplicate";

export type CheckoutPaymentPrintStatus =
  | "not_requested"
  | "queued"
  | "processing"
  | "printed"
  | "failed";

export type PrintJobStatus = "pending" | "processing" | "printed" | "failed";

export type PrintJobPayload = {
  orderId: string;
  cartId: string;
  checkoutPaymentId: string;
  paymentId: string;
  preferenceId: string;
  customer: CustomerInfo;
  notes?: string;
  currency: string;
  amount: number;
  approvedAt: string;
  items: OfficialCartLine[];
  summary: {
    subtotal: number;
    discountTotal: number;
    total: number;
  };
};

export type CreatePaymentSessionPayload = {
  cartId: string;
  customer: CustomerInfo;
  notes?: string;
  discountCode?: string;
};

export type PaymentSession = {
  paymentId: string;
  preferenceId: string;
  initPoint: string;
  sandboxInitPoint?: string;
  cartId: string;
  amount: number;
  currency: string;
};