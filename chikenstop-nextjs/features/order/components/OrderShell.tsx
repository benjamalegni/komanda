"use client";

import type { ReactNode } from "react";
import CartAside from "@/features/cart/components/CartAside";
import MobileCartDrawer from "@/features/cart/components/MobileCartDrawer";
import { CartProvider } from "@/features/cart/context/cart.context";

export default function OrderShell({ children }: { children: ReactNode }) {
  return (
    <CartProvider>
      <div className="min-h-screen bg-[var(--color-accent-primary)]">
        <div className="mx-auto max-w-7xl lg:grid lg:grid-cols-[minmax(0,1fr)_24rem] lg:gap-6">
          <div className="min-w-0 pb-24 lg:pb-6">{children}</div>
          <div className="hidden p-4 pl-0 lg:block">
            <CartAside />
          </div>
        </div>
        <MobileCartDrawer />
      </div>
    </CartProvider>
  );
}
