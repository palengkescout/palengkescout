import { supabase, isSupabaseConfigured } from "./supabaseClient";
import type { User } from "@supabase/supabase-js";

export interface AuthResult {
  user: User | null;
  error?: string;
}

export async function signUp(email: string, password: string): Promise<AuthResult> {
  if (!isSupabaseConfigured || !supabase) {
    return { user: null, error: "Accounts aren't available in this build yet." };
  }
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) return { user: null, error: error.message };
  return { user: data.user };
}

export async function signIn(email: string, password: string): Promise<AuthResult> {
  if (!isSupabaseConfigured || !supabase) {
    return { user: null, error: "Accounts aren't available in this build yet." };
  }
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { user: null, error: error.message };
  return { user: data.user };
}

export async function signOut(): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return;
  await supabase.auth.signOut();
}