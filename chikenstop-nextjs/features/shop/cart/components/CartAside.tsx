"use client";

import CartPanel from "@/features/shop/cart/components/CartPanel";

export default function CartAside() {
  return (
    <aside className="sticky top-4 h-[calc(100vh-2rem)]">
      <CartPanel />
    </aside>
  );
}
