import "server-only";

import { getOfficialCartById } from "@/features/shop/cart/server/cart.store";
import type { CheckoutOrderSnapshot, OfficialCart } from "@/types/types";

type AttemptWithOrderSnapshot = {
  orderSnapshot?: CheckoutOrderSnapshot | null;
};

function cloneOrderSnapshot(snapshot: CheckoutOrderSnapshot): OfficialCart {
  return {
    ...snapshot,
    items: snapshot.items.map((item) => ({ ...item })),
  };
}

export function createCheckoutOrderSnapshot(cart: OfficialCart): CheckoutOrderSnapshot {
  return cloneOrderSnapshot(cart);
}

export async function resolveOrderCartForPaymentAttempt(
  attempt: AttemptWithOrderSnapshot,
  fallbackCartId: string,
) {
  if (attempt.orderSnapshot?.items.length) {
    return cloneOrderSnapshot(attempt.orderSnapshot);
  }

  return getOfficialCartById(fallbackCartId);
}
