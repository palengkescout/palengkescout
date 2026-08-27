export type MarketType =
  | "wet_market"
  | "public_market"
  | "supermarket"
  | "grocery"
  | "farmers_market"
  | "sari_sari";

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
  unit: string;
  category: string;
}

export type PriceStatus = "verified" | "pending" | "flagged";

export interface PriceReport {
  id: string;
  itemId: string;
  marketId: string;
  price: number;
  status: PriceStatus;
  reportedAt: string;
  reporterName: string;
  photoUrl?: string;
  pointsAwarded?: number;
  userId?: string; // logged-in reporter's id, used for priority-visibility highlighting
  productName: string; // NEW — specific brand/variant being priced, e.g. "Kinder Garlic"
  unit: string; // NEW — measurement for this specific report (Kg, Pack, Piece, etc.), defaults to the item's catalog unit but can be overridden
}

export interface PriceRowData extends PriceReport {
  market: Market;
}

export interface MyReportRow extends PriceReport {
  item: Item;
  market: Market;
}