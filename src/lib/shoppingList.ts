import { supabase, isSupabaseConfigured } from "./supabaseClient";
import type { Item } from "../types";

export interface ShoppingListRow {
  id: string;
  itemId: string;
  quantity: number;
  item: Item;
}

export async function listMyShoppingList(userId: string): Promise<ShoppingListRow[]> {
  if (!isSupabaseConfigured || !supabase) return [];
  const { data, error } = await supabase
    .from("shopping_list_items")
    .select("id, item_id, quantity, item:items(*)")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((row: any) => ({
    id: row.id,
    itemId: row.item_id,
    quantity: Number(row.quantity),
    item: row.item,
  }));
}

export async function addToShoppingList(userId: string, itemId: string): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return;
  const { error } = await supabase
    .from("shopping_list_items")
    .upsert({ user_id: userId, item_id: itemId }, { onConflict: "user_id,item_id", ignoreDuplicates: true });
  if (error) throw error;
}

export async function removeFromShoppingList(rowId: string): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return;
  const { error } = await supabase.from("shopping_list_items").delete().eq("id", rowId);
  if (error) throw error;
}

export async function updateShoppingListQuantity(rowId: string, quantity: number): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return;
  const { error } = await supabase.from("shopping_list_items").update({ quantity }).eq("id", rowId);
  if (error) throw error;
}

export async function isItemInList(userId: string, itemId: string): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase) return false;
  const { data, error } = await supabase
    .from("shopping_list_items")
    .select("id")
    .eq("user_id", userId)
    .eq("item_id", itemId)
    .maybeSingle();
  if (error) throw error;
  return Boolean(data);
}

export async function getUserBarangay(userId: string): Promise<string | null> {
  if (!isSupabaseConfigured || !supabase) return null;
  const { data, error } = await supabase.from("profiles").select("barangay").eq("id", userId).single();
  if (error) throw error;
  return data?.barangay ?? null;
}

export async function setUserBarangay(userId: string, barangay: string): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return;
  const { error } = await supabase.from("profiles").update({ barangay }).eq("id", userId);
  if (error) throw error;
}