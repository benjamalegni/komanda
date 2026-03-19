import "server-only";

import { eq } from "drizzle-orm";
import { db } from "@/db";
import { orders } from "@/db/schema";
import type { CreateOrderPayload, CreatedOrder } from "@/types/types";

export function buildOrderRequestIdempotencyKey(checkoutPaymentId: string) {
  return `checkout-payment:${checkoutPaymentId}`;
}

function serializeOrder(record: typeof orders.$inferSelect): CreatedOrder {
  return {
    id: record.id,
    status: record.status,
  };
}

export async function createOrder(
  payload: CreateOrderPayload,
): Promise<CreatedOrder> {
  const now = new Date();
  const idempotencyKey = payload.metadata?.orderRequestIdempotencyKey ?? null;
  const approvedAt = payload.metadata?.approvedAt
    ? new Date(payload.metadata.approvedAt)
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
      metadata: payload.metadata ?? null,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoNothing({
      target: orders.idempotencyKey,
    })
    .returning();

  if (inserted) {
    return serializeOrder(inserted);
  }

  if (!idempotencyKey) {
    throw new Error("Order insert did not return a record and no idempotency key was provided.");
  }

  const [existing] = await db
    .select()
    .from(orders)
    .where(eq(orders.idempotencyKey, idempotencyKey))
    .limit(1);

  if (!existing) {
    throw new Error(`Order with idempotency key "${idempotencyKey}" was not found.`);
  }

  return serializeOrder(existing);
}
