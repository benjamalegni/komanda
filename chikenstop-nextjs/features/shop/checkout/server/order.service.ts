import "server-only";

import { randomInt } from "node:crypto";
import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { checkoutPayments, orders, printJobs, temporaryCarts } from "@/db/schema";
import type {
  AdminDashboardOrder,
  CheckoutOrderSnapshot,
  CreateOrderPayload,
  CreatedOrder,
  CustomerInfo,
  OfficialCartLine,
  OrderSource,
  OrderRequestMetadata,
  OrderSummary,
  PrintJobPayload,
} from "@/types/types";

type OrderRecord = typeof orders.$inferSelect;
type CheckoutPaymentRecord = typeof checkoutPayments.$inferSelect;
type PrintJobRecord = typeof printJobs.$inferSelect;
type TemporaryCartRecord = typeof temporaryCarts.$inferSelect;

type OrderContents = {
  items: OfficialCartLine[];
  currency: string | null;
  summary: OrderSummary | null;
};

function pad(value: number) {
  return value.toString().padStart(2, "0");
}

function buildPurchaseNumber(date = new Date()) {
  const prefix = [
    date.getFullYear().toString().slice(-2),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
    pad(date.getHours()),
    pad(date.getMinutes()),
    pad(date.getSeconds()),
  ].join("");

  return `${prefix}${randomInt(100, 1000)}`;
}

function parseOrderMetadata(
  metadata: OrderRecord["metadata"],
): OrderRequestMetadata | null {
  if (!metadata || typeof metadata !== "object") {
    return null;
  }

  return metadata as OrderRequestMetadata;
}

function fallbackPurchaseNumber(orderId: string) {
  const digits = orderId.replace(/\D/g, "");
  return digits.slice(-6).padStart(6, "0");
}

function toNumber(value: string | number | null | undefined) {
  return typeof value === "number" ? value : Number(value ?? 0);
}

function emptyOrderContents(): OrderContents {
  return {
    items: [],
    currency: null,
    summary: null,
  };
}

function serializeOrderSummary(summary: PrintJobPayload["summary"] | null | undefined) {
  if (!summary) {
    return null;
  }

  return {
    subtotal: toNumber(summary.subtotal),
    discountTotal: toNumber(summary.discountTotal),
    total: toNumber(summary.total),
  } satisfies OrderSummary;
}

function getOrderContentsFromPrintJob(record: PrintJobRecord | null | undefined) {
  if (!record) {
    return null;
  }

  const payload = record.payload as PrintJobPayload;

  return {
    items: Array.isArray(payload.items) ? payload.items : [],
    currency: payload.currency ?? null,
    summary: serializeOrderSummary(payload.summary),
  } satisfies OrderContents;
}

function getOrderContentsFromTemporaryCart(record: TemporaryCartRecord | null | undefined) {
  if (!record) {
    return null;
  }

  return {
    items: Array.isArray(record.items) ? record.items : [],
    currency: record.currency,
    summary: {
      subtotal: toNumber(record.subtotal),
      discountTotal: toNumber(record.discountTotal),
      total: toNumber(record.total),
    },
  } satisfies OrderContents;
}

function getOrderContentsFromCheckoutPayment(record: CheckoutPaymentRecord | null | undefined) {
  if (!record?.orderSnapshot) {
    return null;
  }

  const snapshot = record.orderSnapshot as CheckoutOrderSnapshot;

  return {
    items: Array.isArray(snapshot.items) ? snapshot.items : [],
    currency: snapshot.currency ?? null,
    summary: {
      subtotal: toNumber(snapshot.subtotal),
      discountTotal: toNumber(snapshot.discountTotal),
      total: toNumber(snapshot.total),
    },
  } satisfies OrderContents;
}

async function getOrderContentsByOrderId(records: OrderRecord[]) {
  const orderContentsByOrderId = new Map<string, OrderContents>();

  if (records.length === 0) {
    return orderContentsByOrderId;
  }

  const orderIds = Array.from(new Set(records.map((record) => record.id)));
  const cartIds = Array.from(new Set(records.map((record) => record.cartId)));
  const checkoutPaymentIds = Array.from(
    new Set(
      records
        .map((record) => record.checkoutPaymentId)
        .filter((checkoutPaymentId): checkoutPaymentId is string => Boolean(checkoutPaymentId)),
    ),
  );

  const [printJobRecords, checkoutPaymentRecords, temporaryCartRecords] = await Promise.all([
    orderIds.length > 0
      ? db
          .select()
          .from(printJobs)
          .where(inArray(printJobs.orderId, orderIds))
          .orderBy(desc(printJobs.updatedAt), desc(printJobs.createdAt))
      : Promise.resolve([]),
    checkoutPaymentIds.length > 0
      ? db
          .select()
          .from(checkoutPayments)
          .where(inArray(checkoutPayments.id, checkoutPaymentIds))
      : Promise.resolve([]),
    cartIds.length > 0
      ? db.select().from(temporaryCarts).where(inArray(temporaryCarts.id, cartIds))
      : Promise.resolve([]),
  ]);

  const printJobByOrderId = new Map<string, PrintJobRecord>();

  for (const record of printJobRecords) {
    if (!printJobByOrderId.has(record.orderId)) {
      printJobByOrderId.set(record.orderId, record);
    }
  }

  const temporaryCartById = new Map(
    temporaryCartRecords.map((record) => [record.id, record] as const),
  );
  const checkoutPaymentById = new Map(
    checkoutPaymentRecords.map((record) => [record.id, record] as const),
  );

  for (const record of records) {
    orderContentsByOrderId.set(
      record.id,
      getOrderContentsFromPrintJob(printJobByOrderId.get(record.id)) ??
        getOrderContentsFromCheckoutPayment(
          record.checkoutPaymentId ? checkoutPaymentById.get(record.checkoutPaymentId) : null,
        ) ??
        getOrderContentsFromTemporaryCart(temporaryCartById.get(record.cartId)) ??
        emptyOrderContents(),
    );
  }

  return orderContentsByOrderId;
}

function getPurchaseNumber(record: OrderRecord) {
  const purchaseNumber = parseOrderMetadata(record.metadata)?.purchaseNumber?.trim();
  return purchaseNumber || fallbackPurchaseNumber(record.id);
}

function serializeCreatedOrder(record: OrderRecord): CreatedOrder {
  return {
    id: record.id,
    purchaseNumber: getPurchaseNumber(record),
    status: record.status,
  };
}

function serializeAdminDashboardOrder(
  record: OrderRecord,
  orderContents: OrderContents,
): AdminDashboardOrder {
  return {
    id: record.id,
    purchaseNumber: getPurchaseNumber(record),
    status: record.status,
    customer: record.customer as CustomerInfo,
    notes: record.notes ?? null,
    source:
      parseOrderMetadata(record.metadata)?.source ??
      ((record.source as OrderSource | null | undefined) ?? null),
    approvedAt: record.approvedAt?.toISOString() ?? null,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
    items: orderContents.items,
    currency: orderContents.currency,
    summary: orderContents.summary,
  };
}

async function serializeAdminDashboardOrders(records: OrderRecord[]) {
  const orderContentsByOrderId = await getOrderContentsByOrderId(records);

  return records.map((record) =>
    serializeAdminDashboardOrder(
      record,
      orderContentsByOrderId.get(record.id) ?? emptyOrderContents(),
    ),
  );
}

async function serializeSingleAdminDashboardOrder(record: OrderRecord) {
  const [serializedRecord] = await serializeAdminDashboardOrders([record]);
  return serializedRecord;
}

async function getExistingOrderByIdempotencyKey(idempotencyKey: string) {
  const [existing] = await db
    .select()
    .from(orders)
    .where(eq(orders.idempotencyKey, idempotencyKey))
    .limit(1);

  return existing ?? null;
}

export function buildOrderRequestIdempotencyKey(checkoutPaymentId: string) {
  return `checkout-payment:${checkoutPaymentId}`;
}

export async function getOrderById(id: string) {
  const [record] = await db.select().from(orders).where(eq(orders.id, id)).limit(1);
  return record ? serializeSingleAdminDashboardOrder(record) : null;
}

export async function listOrdersInProgress() {
  const records = await db
    .select()
    .from(orders)
    .where(eq(orders.status, "approved"))
    .orderBy(desc(orders.approvedAt), desc(orders.createdAt));

  return serializeAdminDashboardOrders(records);
}

export async function markOrderAsDelivered(orderId: string) {
  const now = new Date();
  const [record] = await db
    .update(orders)
    .set({
      status: "delivered",
      updatedAt: now,
    })
    .where(and(eq(orders.id, orderId), eq(orders.status, "approved")))
    .returning();

  return record ? serializeSingleAdminDashboardOrder(record) : null;
}

export async function createOrder(
  payload: CreateOrderPayload,
): Promise<CreatedOrder> {
  const now = new Date();
  const idempotencyKey = payload.metadata?.orderRequestIdempotencyKey ?? null;
  const approvedAt = payload.metadata?.approvedAt
    ? new Date(payload.metadata.approvedAt)
    : null;

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const purchaseNumber = payload.metadata?.purchaseNumber ?? buildPurchaseNumber();
    const metadata: OrderRequestMetadata | null = payload.metadata
      ? {
          ...payload.metadata,
          purchaseNumber,
        }
      : null;

    const [inserted] = await db
      .insert(orders)
      .values({
        id: crypto.randomUUID(),
        cartId: payload.cartId,
        customer: payload.customer,
        notes: payload.notes,
        status: "approved",
        idempotencyKey,
        checkoutPaymentId: payload.metadata?.checkoutPaymentId ?? null,
        paymentId: payload.metadata?.paymentId ?? null,
        preferenceId: payload.metadata?.preferenceId ?? null,
        source: payload.metadata?.source ?? null,
        approvedAt,
        metadata,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoNothing({
        target: orders.idempotencyKey,
      })
      .returning();

    if (inserted) {
      return serializeCreatedOrder(inserted);
    }

    if (!idempotencyKey) {
      break;
    }

    const existing = await getExistingOrderByIdempotencyKey(idempotencyKey);

    if (existing) {
      return serializeCreatedOrder(existing);
    }
  }

  if (!idempotencyKey) {
    throw new Error("Order insert did not return a record and no idempotency key was provided.");
  }

  const existing = await getExistingOrderByIdempotencyKey(idempotencyKey);

  if (!existing) {
    throw new Error(`Order with idempotency key "${idempotencyKey}" was not found.`);
  }

  return serializeCreatedOrder(existing);
}
