"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { MenuItem } from "@/types/types";

export type CartLine = {
  item: MenuItem;
  quantity: number;
};

type CartContextValue = {
  items: CartLine[];
  itemCount: number;
  subtotal: number;
  addItem: (item: MenuItem) => void;
  decrementItem: (itemId: number) => void;
  removeItem: (itemId: number) => void;
  clearCart: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartLine[]>([]);

  const addItem = useCallback((item: MenuItem) => {
    setItems((currentItems) => {
      const existingItem = currentItems.find(
        (cartLine) => cartLine.item.id === item.id,
      );

      if (!existingItem) {
        return [...currentItems, { item, quantity: 1 }];
      }

      return currentItems.map((cartLine) =>
        cartLine.item.id === item.id
          ? { ...cartLine, quantity: cartLine.quantity + 1 }
          : cartLine,
      );
    });
  }, []);

  const decrementItem = useCallback((itemId: number) => {
    setItems((currentItems) =>
      currentItems.flatMap((cartLine) => {
        if (cartLine.item.id !== itemId) {
          return [cartLine];
        }

        if (cartLine.quantity === 1) {
          return [];
        }

        return [{ ...cartLine, quantity: cartLine.quantity - 1 }];
      }),
    );
  }, []);

  const removeItem = useCallback((itemId: number) => {
    setItems((currentItems) =>
      currentItems.filter((cartLine) => cartLine.item.id !== itemId),
    );
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
  }, []);

  const itemCount = useMemo(
    () =>
      items.reduce(
        (totalItems, cartLine) => totalItems + cartLine.quantity,
        0,
      ),
    [items],
  );

  const subtotal = useMemo(
    () =>
      items.reduce(
        (totalPrice, cartLine) =>
          totalPrice + cartLine.quantity * cartLine.item.price,
        0,
      ),
    [items],
  );

  const value = useMemo(
    () => ({
      items,
      itemCount,
      subtotal,
      addItem,
      decrementItem,
      removeItem,
      clearCart,
    }),
    [addItem, clearCart, decrementItem, itemCount, items, removeItem, subtotal],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);

  if (!context) {
    throw new Error("useCart must be used inside a CartProvider");
  }

  return context;
}
