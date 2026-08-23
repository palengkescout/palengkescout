import { Fish, Building2, ShoppingCart, Store, Tractor, Package, type LucideIcon } from "lucide-react";
import type { MarketType } from "../types";

const marketTypeIconMap: Record<MarketType, LucideIcon> = {
  wet_market: Fish,
  public_market: Building2,
  supermarket: ShoppingCart,
  grocery: Store,
  farmers_market: Tractor,
  sari_sari: Package,
};

export function getMarketTypeIcon(type: MarketType): LucideIcon {
  return marketTypeIconMap[type] ?? Store;
}