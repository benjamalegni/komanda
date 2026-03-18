import "server-only";

import { and, eq, gt } from "drizzle-orm";
import { db } from "@/db";
import { temporaryCarts } from "@/db/schema";
import type { OfficialCart } from "@/types/types";

const DEFAULT_CART_TTL_MINUTES = 60;

function getCartTtlMinutes() {
  const parsedValue = Number(process.env.CART_TTL_MINUTES ?? DEFAULT_CART_TTL_MINUTES);
  return Number.isFinite(parsedValue) && parsedValue > 0
    ? parsedValue
    : DEFAULT_CART_TTL_MINUTES;
}

function toNumber(value: string | number) {
  return typeof value === "number" ? value : Number(value);
}

function serializeCart(record: typeof temporaryCarts.$inferSelect): OfficialCart {
  return {
    id: record.id,
    currency: record.currency,
    items: record.items,
    subtotal: toNumber(record.subtotal),
    discountTotal: toNumber(record.discountTotal),
    total: toNumber(record.total),
    updatedAt: record.updatedAt.toISOString(),
    expiresAt: record.expiresAt.toISOString(),
  };
}

export async function saveOfficialCart(cart: OfficialCart) {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + getCartTtlMinutes() * 60 * 1000);

  await db
    .insert(temporaryCarts)
    .values({
      id: cart.id,
      currency: cart.currency,
      items: cart.items,
      subtotal: cart.subtotal.toFixed(2),
      discountTotal: cart.discountTotal.toFixed(2),
      total: cart.total.toFixed(2),
      verifiedAt: now,
      expiresAt,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: temporaryCarts.id,
      set: {
        currency: cart.currency,
        items: cart.items,
        subtotal: cart.subtotal.toFixed(2),
        discountTotal: cart.discountTotal.toFixed(2),
        total: cart.total.toFixed(2),
        verifiedAt: now,
        expiresAt,
        updatedAt: now,
      },
    });

  return {
    ...cart,
    updatedAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
  };
}

export async function getOfficialCartById(cartId: string) {
  const [cart] = await db
    .select()
    .from(temporaryCarts)
    .where(and(eq(temporaryCarts.id, cartId), gt(temporaryCarts.expiresAt, new Date())))
    .limit(1);

  return cart ? serializeCart(cart) : null;
}
