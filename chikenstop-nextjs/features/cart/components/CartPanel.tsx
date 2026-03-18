"use client";

import { useCart } from "@/features/cart/context/cart.context";
import CartItem from "./item/CartItem";

export default function CartPanel() {
  const { items, itemCount, subtotal} = useCart();

  return (
    <div className="flex h-full flex-col rounded-sm border border-[var(--color-accent-secondary)] bg-[var(--color-accent-primary)] text-[var(--color-accent-secondary)] shadow-lg">
      <div className="flex items-center justify-between border-b border-[var(--color-accent-secondary)] px-4 py-4">
        <div>
          <p className="text-sm uppercase tracking-[0.2em]">Tu pedido</p>
          <h2 className="text-2xl font-bold">Carrito</h2>
        </div>
        <span className="rounded-full border border-[var(--color-accent-secondary)] px-3 py-1 text-sm font-semibold">
          {itemCount} {itemCount === 1 ? "item" : "items"}
        </span>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {items.length === 0 ? (
          <div className="rounded-sm border border-dashed border-[var(--color-accent-secondary)] p-4 text-sm">
            Agrega productos desde el menu para empezar tu pedido.
          </div>
        ) : (
          items.map((cartLine) => (
            <article
              key={cartLine.item.id}
              className="space-y-3 rounded-sm border border-[var(--color-accent-secondary)] bg-white/30 p-4"
            >
              <CartItem cartLine={cartLine} />
            </article>
          ))
        )}
      </div>

      <div className="space-y-4 border-t border-[var(--color-accent-secondary)] px-4 py-4">
        <div className="flex items-center justify-between text-lg font-semibold">
          <span>Subtotal</span>
          <span>${subtotal}</span>
        </div>

        <button
          type="button"
          // luego pongo onClick={}
          disabled={items.length === 0}
          className="w-full rounded-sm bg-[var(--color-accent-secondary)] text-[var(--color-accent-primary)] px-4 py-3 font-semibold disabled:cursor-not-allowed disabled:opacity-50"
        >
          {`Checkout =>`}
        </button>
      </div>
    </div>
  );
}
