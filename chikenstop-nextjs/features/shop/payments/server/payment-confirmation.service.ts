import "server-only";

import { getOrderById } from "@/features/shop/checkout/server/order.service";
import { getMercadoPagoPayment } from "@/features/shop/payments/server/mercadopago.service";
import {
  getCheckoutPaymentAttemptById,
  getCheckoutPaymentAttemptByPaymentId,
  getLatestPendingCheckoutPaymentForCart,
  updateCheckoutPaymentAttempt,
} from "@/features/shop/payments/server/payment.store";
import type {
  CheckoutPaymentPrintStatus,
  CheckoutPaymentStatus,
} from "@/types/types";

type CheckoutPaymentAttempt = NonNullable<
  Awaited<ReturnType<typeof getCheckoutPaymentAttemptById>>
>;

export type PaymentConfirmationResult =
  | {
      kind: "confirmed";
      paymentId: string;
      orderId: string;
      purchaseNumber: string;
      customerName: string;
      cartId: string;
      printJobId: string | null;
      printStatus: CheckoutPaymentPrintStatus;
    }
  | {
      kind: "awaiting_confirmation";
      paymentId: string;
      customerName: string;
      cartId: string | null;
    }
  | {
      kind: "status_updated";
      paymentId: string;
      status: CheckoutPaymentStatus;
      customerName: string;
    }
  | {
      kind: "missing_attempt";
      paymentId: string;
      cartId: string | null;
      error: string;
      customerName?: string;
    }
  | {
      kind: "error";
      paymentId: string;
      error: string;
      customerName?: string;
    };

function mapMercadoPagoStatus(status: string | undefined): CheckoutPaymentStatus {
  switch (status) {
    case "approved":
      return "approved";
    case "rejected":
      return "rejected";
    case "pending":
    case "in_process":
      return "pending";
    default:
      return "failed";
  }
}

async function buildConfirmedResult(
  attempt: CheckoutPaymentAttempt,
  paymentId: string,
): Promise<PaymentConfirmationResult> {
  const existingOrder = attempt.orderId ? await getOrderById(attempt.orderId) : null;

  return {
    kind: "confirmed",
    paymentId,
    orderId: attempt.orderId!,
    purchaseNumber: existingOrder?.purchaseNumber ?? attempt.orderId!,
    customerName: attempt.customer.name,
    cartId: attempt.cartId,
    printJobId: attempt.printJobId ?? null,
    printStatus: attempt.printStatus,
  };
}

async function buildResultFromAttempt(
  attempt: CheckoutPaymentAttempt,
  paymentId: string,
): Promise<PaymentConfirmationResult> {
  if (attempt.orderId) {
    return buildConfirmedResult(attempt, paymentId);
  }

  if (attempt.status === "initiated" || attempt.status === "processing" || attempt.status === "approved") {
    return {
      kind: "awaiting_confirmation",
      paymentId,
      customerName: attempt.customer.name,
      cartId: attempt.cartId,
    };
  }

  return {
    kind: "status_updated",
    paymentId,
    status: attempt.status,
    customerName: attempt.customer.name,
  };
}

async function attachPaymentIdToAttempt(
  attempt: CheckoutPaymentAttempt,
  paymentId: string,
  rawPayload: Record<string, unknown>,
) {
  if (attempt.paymentId === paymentId) {
    return attempt;
  }

  return (await updateCheckoutPaymentAttempt(attempt.id, {
    paymentId,
    rawPayload,
  })) ?? attempt;
}

export async function confirmMercadoPagoPaymentById(
  paymentId: string,
): Promise<PaymentConfirmationResult> {
  const normalizedPaymentId = paymentId.trim();

  if (!normalizedPaymentId) {
    return {
      kind: "error",
      paymentId: "",
      error: "Missing Mercado Pago payment id.",
    };
  }

  const existingAttemptByPaymentId = await getCheckoutPaymentAttemptByPaymentId(normalizedPaymentId);

  if (existingAttemptByPaymentId) {
    return buildResultFromAttempt(existingAttemptByPaymentId, normalizedPaymentId);
  }

  const payment = await getMercadoPagoPayment(normalizedPaymentId);
  const paymentRecordId = String(payment.id);
  const paymentMetadata = payment.metadata as Record<string, unknown> | undefined;
  const cartId = String(payment.external_reference ?? paymentMetadata?.cartId ?? "");
  const checkoutPaymentId = String(paymentMetadata?.checkoutPaymentId ?? "");
  const normalizedStatus = mapMercadoPagoStatus(payment.status);
  const rawPayload = {
    source: "checkout-pay-success-page",
    payment,
  } as Record<string, unknown>;
  const attemptFromMetadata = checkoutPaymentId
    ? await getCheckoutPaymentAttemptById(checkoutPaymentId)
    : null;
  const attempt = attemptFromMetadata ?? (cartId ? await getLatestPendingCheckoutPaymentForCart(cartId) : null);

  if (!attempt) {
    return {
      kind: "missing_attempt",
      paymentId: paymentRecordId,
      cartId: cartId || null,
      error: "No checkout payment attempt matches this Mercado Pago payment.",
    };
  }

  const linkedAttempt = await attachPaymentIdToAttempt(attempt, paymentRecordId, rawPayload);

  if (linkedAttempt.orderId) {
    return buildConfirmedResult(linkedAttempt, paymentRecordId);
  }

  if (normalizedStatus !== "approved") {
    const updatedAttempt =
      (await updateCheckoutPaymentAttempt(linkedAttempt.id, {
        paymentId: paymentRecordId,
        status: normalizedStatus,
        processedAt: null,
        rawPayload,
      })) ?? linkedAttempt;

    return {
      kind: "status_updated",
      paymentId: paymentRecordId,
      status: updatedAttempt.status,
      customerName: updatedAttempt.customer.name,
    };
  }

  return {
    kind: "awaiting_confirmation",
    paymentId: paymentRecordId,
    customerName: linkedAttempt.customer.name,
    cartId: linkedAttempt.cartId,
  };
}
