"use client";

import type { CreateOrderPayload, CreatedOrder } from "@/types/types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "");

type OrderApiResponse = {
  id?: string;
  orderId?: string;
  status?: string;
  purchaseNumber?: string;
};

function ensureApiBaseUrl() {
  if (!API_BASE_URL) {
    throw new Error(
      "Missing NEXT_PUBLIC_API_URL. Configure the checkout backend before creating orders.",
    );
  }

  return API_BASE_URL;
}

export async function createOrder(
  payload: CreateOrderPayload,
): Promise<CreatedOrder> {
  const response = await fetch(`${ensureApiBaseUrl()}/orders`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Order request failed with status ${response.status}`);
  }

  const data = (await response.json()) as OrderApiResponse;
  const id = String(data.id ?? data.orderId ?? "");

  if (!id) {
    throw new Error("Order response is missing a valid order id.");
  }

  return {
    id,
    purchaseNumber: String(data.purchaseNumber ?? id),
    status: data.status === "delivered" ? "delivered" : "approved",
  };
}
