import { supabase, isSupabaseConfigured } from "./supabaseClient";
import type { User } from "@supabase/supabase-js";

export interface AuthResult {
  user: User | null;
  error?: string;
}

export async function checkUsernameAvailable(username: string): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase) return true;
  const { data, error } = await supabase.from("profiles").select("id").ilike("display_name", username).limit(1);
  if (error) throw error;
  return (data ?? []).length === 0;
}

export async function signUp(email: string, password: string, username: string): Promise<AuthResult> {
  if (!isSupabaseConfigured || !supabase) {
    return { user: null, error: "Accounts aren't available in this build yet." };
  }

  const trimmed = username.trim();
  if (!/^[A-Za-z0-9_]{3,20}$/.test(trimmed)) {
    return { user: null, error: "Username must be 3–20 characters: letters, numbers, or underscores only." };
  }

  const available = await checkUsernameAvailable(trimmed);
  if (!available) {
    return { user: null, error: "That username is already taken." };
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { username: trimmed } },
  });
  if (error) {
    const msg = error.message.toLowerCase();
    return {
      user: null,
      error:
        msg.includes("duplicate") || msg.includes("database error")
          ? "That username was just taken — please try another."
          : error.message,
    };
  }
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