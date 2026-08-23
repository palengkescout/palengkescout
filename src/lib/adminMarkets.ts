import { supabase, isSupabaseConfigured } from "./supabaseClient";
import type { Market, MarketType } from "../types";

export async function checkIsAdmin(userId: string): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase) return false;
  const { data, error } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw error;
  return Boolean((data as any)?.is_admin);
}

export interface NewMarketInput {
  name: string;
  barangay: string;
  type: MarketType;
  latitude: number;
  longitude: number;
}

/**
 * Only succeeds for accounts with is_admin = true — enforced by the
 * database's Row Level Security policy, not just this function, so even a
 * direct API call from outside the app would be rejected for non-admins.
 */
export async function createMarket(input: NewMarketInput): Promise<Market> {
  if (!isSupabaseConfigured || !supabase) throw new Error("Supabase not configured");
  const { data, error } = await supabase
    .from("markets")
    .insert({
      name: input.name,
      barangay: input.barangay,
      type: input.type,
      latitude: input.latitude,
      longitude: input.longitude,
    })
    .select()
    .single();
  if (error) throw error;
  return data as Market;
}

export async function deleteMarket(marketId: string): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return;
  const { error } = await supabase.from("markets").delete().eq("id", marketId);
  if (error) throw error;
}