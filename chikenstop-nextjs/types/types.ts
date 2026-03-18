export type MenuItem = {
  name: string;
  price: number;
  description: string | null;
  image: string;
  // this is the document id from strapi
  documentId: string;
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
};

export type CreateOrderPayload = {
  cartId: string;
  customer: CustomerInfo;
  notes?: string;
};

export type CreatedOrder = {
  id: string;
  status?: string;
};