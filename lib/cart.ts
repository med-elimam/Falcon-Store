"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Size } from "./products";

export interface CartItem {
  slug: string;
  nameAr: string;
  brand: string;
  image: string;
  size: Size;
  /** MRU — null = يُحسم عبر واتساب */
  price: number | null;
  qty: number;
}

interface CartState {
  items: CartItem[];
  drawerOpen: boolean;
  add: (item: Omit<CartItem, "qty">) => void;
  remove: (slug: string, size: Size) => void;
  setQty: (slug: string, size: Size, qty: number) => void;
  clear: () => void;
  openDrawer: () => void;
  closeDrawer: () => void;
}

export const useCart = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      drawerOpen: false,
      add: (item) =>
        set((s) => {
          const idx = s.items.findIndex(
            (i) => i.slug === item.slug && i.size === item.size
          );
          if (idx >= 0) {
            const items = [...s.items];
            items[idx] = { ...items[idx], qty: items[idx].qty + 1 };
            return { items, drawerOpen: true };
          }
          return { items: [...s.items, { ...item, qty: 1 }], drawerOpen: true };
        }),
      remove: (slug, size) =>
        set((s) => ({
          items: s.items.filter((i) => !(i.slug === slug && i.size === size)),
        })),
      setQty: (slug, size, qty) =>
        set((s) => ({
          items: s.items
            .map((i) =>
              i.slug === slug && i.size === size ? { ...i, qty } : i
            )
            .filter((i) => i.qty > 0),
        })),
      clear: () => set({ items: [] }),
      openDrawer: () => set({ drawerOpen: true }),
      closeDrawer: () => set({ drawerOpen: false }),
    }),
    { name: "falcon-cart", partialize: (s) => ({ items: s.items }) }
  )
);

export function cartTotal(items: CartItem[]): {
  total: number;
  hasUnpriced: boolean;
} {
  let total = 0;
  let hasUnpriced = false;
  for (const i of items) {
    if (i.price === null) hasUnpriced = true;
    else total += i.price * i.qty;
  }
  return { total, hasUnpriced };
}
