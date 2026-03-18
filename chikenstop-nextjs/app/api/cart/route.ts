import type { OfficialCartLine } from "@/types/types";
import { NextResponse } from "next/server";
import { getMenuItem } from "@/features/shop/menu/services/menu.service";

// this post will receiva data from the cart with the following structure:
// "items": [
//   {
//     "documentId": "abc123",
//     "quantity": 2
//   }
// ]
// and will return the cart with the following structure:
// {
//   "cartId": "123",
//   "items": [
//     {
//       "documentId": "abc123",
//       "quantity": 1

type CartRequestItem = {
  documentId: string;
  quantity: number;
};

async function fetchItems(items: CartRequestItem[]): Promise<OfficialCartLine[]> {
  return Promise.all(
    items.map(async (item) => {
      const strapiItem = await getMenuItem(item.documentId);

      return {
        documentId: strapiItem.documentId,
        quantity: item.quantity,
        name: strapiItem.name,
        unitPrice: strapiItem.price,
        lineTotal: strapiItem.price * item.quantity,
        image: strapiItem.image,
        available: true,
        note: strapiItem.description ?? undefined,
      };
    }),
  );
}

export async function POST(request: Request) {
  const { items } = (await request.json()) as { items?: CartRequestItem[] };

  if (!Array.isArray(items)) {
    return NextResponse.json(
      { error: "Items must be an array with format { documentId: string, quantity: number }" },
      { status: 400 },
    );
  }

  const cartItems = await fetchItems(items);
  const subtotal = cartItems.reduce((sum, item) => sum + item.lineTotal, 0);

  return NextResponse.json({
    cartId: crypto.randomUUID(),
    currency: "ARS",
    items: cartItems,
    subtotal,
    discountTotal: 0,
    total: subtotal,
  });
}