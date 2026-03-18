import { NextResponse } from "next/server";
import type { CustomerInfo, OfficialCart } from "@/types/types";
import { getOfficialCartById } from "@/features/shop/cart/server/cart.store";

type CreatePaymentSessionPayload = {
  cartId?: string;
  customer?: Partial<CustomerInfo>;
  notes?: string;
};

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

async function getOfficialCart(cartId: string): Promise<OfficialCart> {
  const cart = await getOfficialCartById(cartId);

  if (!cart) {
    throw new Error(`Cart "${cartId}" was not found or has expired.`);
  }

  return cart;
}

function validatePayload(payload: CreatePaymentSessionPayload) {
  if (!isNonEmptyString(payload.cartId)) {
    return "cartId is required.";
  }

  if (!isNonEmptyString(payload.customer?.name)) {
    return "customer.name is required.";
  }

  if (!isNonEmptyString(payload.customer?.email)) {
    return "customer.email is required.";
  }

  if (!isNonEmptyString(payload.customer?.phone)) {
    return "customer.phone is required.";
  }

  return null;
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as CreatePaymentSessionPayload;
    const validationError = validatePayload(payload);

    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const cart = await getOfficialCart(payload.cartId!.trim());

    if (cart.items.length === 0) {
      return NextResponse.json(
        { error: "The official cart is empty. Cannot create a payment session." },
        { status: 409 },
      );
    }

    const unavailableItems = cart.items.filter((item) => !item.available);

    if (unavailableItems.length > 0) {
      return NextResponse.json(
        {
          error: "The official cart contains unavailable items.",
          unavailableItems: unavailableItems.map((item) => ({
            documentId: item.documentId,
            name: item.name,
          })),
        },
        { status: 409 },
      );
    }

    if (cart.total <= 0) {
      return NextResponse.json(
        { error: "The official cart total must be greater than zero." },
        { status: 409 },
      );
    }

    return NextResponse.json({
      error: "Mercado Pago integration is not implemented yet.",
      cartId: cart.id,
      amount: cart.total,
      currency: cart.currency,
      items: cart.items,
      summary: {
        subtotal: cart.subtotal,
        discountTotal: cart.discountTotal,
        total: cart.total,
      },
    }, { status: 501 });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unexpected error while creating the payment session.",
      },
      { status: 500 },
    );
  }
}