import { supabase, isSupabaseConfigured } from "./supabaseClient";
import type { Market } from "../types";
import type { ShoppingListRow, SavedLocation } from "./shoppingList";
import { haversineDistanceKm } from "./geo";
import { normalize, PRICE_WEIGHT, DISTANCE_WEIGHT } from "./smartScore";

export interface MarketBasketResult {
  market: Market;
  totalCost: number;
  itemsFound: number;
  itemsMissing: number;
  distanceKm: number | null;
  score: number; // lower is better
}

export interface RecommendationResult {
  ranked: MarketBasketResult[];
  best: MarketBasketResult | null;
  aiExplanation: string | null;
}

export async function getMarketRecommendation(
  listRows: ShoppingListRow[],
  markets: Market[],
  userLocation: SavedLocation | null
): Promise<RecommendationResult> {
  if (listRows.length === 0 || markets.length === 0 || !isSupabaseConfigured || !supabase) {
    return { ranked: [], best: null, aiExplanation: null };
  }

  const itemIds = listRows.map((r) => r.itemId);
  const { data, error } = await supabase
    .from("price_reports")
    .select("item_id, market_id, price, status")
    .in("item_id", itemIds)
    .eq("status", "verified");
  if (error) throw error;

  const cheapestByMarketItem = new Map<string, number>();
  for (const row of data ?? []) {
    const key = `${row.market_id}:${row.item_id}`;
    const price = Number(row.price);
    const current = cheapestByMarketItem.get(key);
    if (current === undefined || price < current) cheapestByMarketItem.set(key, price);
  }

  const results: MarketBasketResult[] = markets.map((market) => {
    let totalCost = 0;
    let itemsFound = 0;
    let itemsMissing = 0;
    for (const row of listRows) {
      const price = cheapestByMarketItem.get(`${market.id}:${row.itemId}`);
      if (price !== undefined) {
        totalCost += price * row.quantity;
        itemsFound++;
      } else {
        itemsMissing++;
      }
    }
    const distanceKm = userLocation
      ? haversineDistanceKm(userLocation.lat, userLocation.lng, market.latitude, market.longitude)
      : null;
    return { market, totalCost, itemsFound, itemsMissing, distanceKm, score: 0 };
  });

  const comparable = results.filter((r) => r.itemsFound > 0);
  if (comparable.length === 0) {
    return { ranked: results, best: null, aiExplanation: null };
  }

  const costs = comparable.map((r) => r.totalCost);
  const distances = comparable.filter((r) => r.distanceKm !== null).map((r) => r.distanceKm as number);
  const minCost = Math.min(...costs);
  const maxCost = Math.max(...costs);
  const minDist = distances.length ? Math.min(...distances) : 0;
  const maxDist = distances.length ? Math.max(...distances) : 0;

  for (const r of comparable) {
    const costScore = normalize(r.totalCost, minCost, maxCost);
    const distScore = r.distanceKm !== null ? normalize(r.distanceKm, minDist, maxDist) : 0.5;
    r.score = costScore * PRICE_WEIGHT + distScore * DISTANCE_WEIGHT;
  }

  const ranked = [...comparable].sort((a, b) => a.score - b.score);
  const best = ranked[0] ?? null;

  let aiExplanation: string | null = null;
  if (best) {
    aiExplanation = await fetchAiExplanation(ranked, listRows.length);
  }

  return { ranked, best, aiExplanation };
}

async function fetchAiExplanation(
  ranked: MarketBasketResult[],
  listSize: number
): Promise<string | null> {
  if (!isSupabaseConfigured || !supabase) return null;
  try {
    const { data, error } = await supabase.functions.invoke("recommend-market", {
      body: {
        listSize,
        markets: ranked.slice(0, 3).map((r) => ({
          name: r.market.name,
          barangay: r.market.barangay,
          totalCost: r.totalCost,
          itemsFound: r.itemsFound,
          itemsMissing: r.itemsMissing,
          distanceKm: r.distanceKm,
        })),
      },
    });
    if (error) return null;
    return data?.explanation ?? null;
  } catch {
    return null;
  }
}