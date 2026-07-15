"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { VariantSize } from "@falcon/shared";

export interface CartItem {
  variantId: string;
  slug: string;
  nameAr: string;
  brand: string;
  image: string | null;
  size: VariantSize;
  /** MRU — العناصر بلا سعر لا تدخل السلة أصلًا */
  priceMru: number;
  maxQuantity: number;
  qty: number;
}

interface CartState {
  items: CartItem[];
  drawerOpen: boolean;
  add: (item: Omit<CartItem, "qty">, qty?: number) => void;
  remove: (variantId: string) => void;
  setQty: (variantId: string, qty: number) => void;
  clear: () => void;
  openDrawer: () => void;
  closeDrawer: () => void;
}

export const useCart = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      drawerOpen: false,
      add: (item, qty = 1) =>
        set((s) => {
          const idx = s.items.findIndex((i) => i.variantId === item.variantId);
          if (idx >= 0) {
            const items = [...s.items];
            const prev = items[idx]!;
            items[idx] = { ...prev, ...item, qty: Math.min(prev.qty + qty, item.maxQuantity, 20) };
            return { items, drawerOpen: true };
          }
          return { items: [...s.items, { ...item, qty: Math.min(qty, item.maxQuantity, 20) }], drawerOpen: true };
        }),
      remove: (variantId) => set((s) => ({ items: s.items.filter((i) => i.variantId !== variantId) })),
      setQty: (variantId, qty) =>
        set((s) => ({
          items: s.items
            .map((i) => (i.variantId === variantId ? { ...i, qty: Math.min(qty, i.maxQuantity ?? 20, 20) } : i))
            .filter((i) => i.qty > 0),
        })),
      clear: () => set({ items: [] }),
      openDrawer: () => set({ drawerOpen: true }),
      closeDrawer: () => set({ drawerOpen: false }),
    }),
    { name: "falcon-cart-v2", partialize: (s) => ({ items: s.items }) }
  )
);

export function cartTotal(items: CartItem[]): number {
  return items.reduce((sum, i) => sum + i.priceMru * i.qty, 0);
}
