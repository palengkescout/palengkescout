export type MarketType = "wet_market" | "grocery" | "sari_sari";

export interface Market {
  id: string;
  name: string;
  barangay: string;
  type: MarketType;
  latitude: number;
  longitude: number;
}

export interface Item {
  id: string;
  name: string;
  unit: string; // "kg" | "piece" | "bundle" | ...
  category: string; // used to resolve a lucide icon, see lib/categoryIcons
}

export type PriceStatus = "verified" | "pending" | "flagged";

export interface PriceReport {
  id: string;
  itemId: string;
  marketId: string;
  price: number;
  status: PriceStatus;
  reportedAt: string; // ISO timestamp
  reporterName: string;
  photoUrl?: string; // optional photo of the product, attached by the reporter
  pointsAwarded?: number; // points earned for this specific report
}

// Convenience shape used once a price report is joined with its market,
// for rendering a single row in a results list.
export interface PriceRowData extends PriceReport {
  market: Market;
}