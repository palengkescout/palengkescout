import { isSupabaseConfigured, supabase } from "./supabaseClient";

export type LeaderboardPeriod = "week" | "month";

export interface LeaderboardEntry {
  userId: string;
  displayName: string;
  points: number;
}

function startOfWeek(): Date {
  const now = new Date();
  const day = now.getDay(); // 0 = Sunday
  const diffToMonday = day === 0 ? 6 : day - 1;
  const monday = new Date(now);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(now.getDate() - diffToMonday);
  return monday;
}

function startOfMonth(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

/**
 * Weekly/monthly leaderboards are just point_events filtered to the current
 * window — there's no destructive "reset" each period, the window simply
 * moves forward, so nobody's history is ever lost.
 */
export async function getLeaderboard(period: LeaderboardPeriod): Promise<LeaderboardEntry[]> {
  if (!isSupabaseConfigured || !supabase) return [];

  const cutoff = period === "week" ? startOfWeek() : startOfMonth();
  const { data, error } = await supabase
    .from("point_events")
    .select("user_id, points, profiles(display_name)")
    .gte("created_at", cutoff.toISOString());
  if (error) throw error;

  const totals = new Map<string, LeaderboardEntry>();
  for (const row of (data ?? []) as any[]) {
    const existing = totals.get(row.user_id);
    const displayName = row.profiles?.display_name ?? "Anonymous Scout";
    if (existing) {
      existing.points += row.points;
    } else {
      totals.set(row.user_id, { userId: row.user_id, displayName, points: row.points });
    }
  }

  return Array.from(totals.values()).sort((a, b) => b.points - a.points);
}