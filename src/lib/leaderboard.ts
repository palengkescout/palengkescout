import { isSupabaseConfigured, supabase } from "./supabaseClient";

export type LeaderboardPeriod = "week" | "month";

export interface LeaderboardEntry {
  userId: string;
  displayName: string;
  points: number;
}

export interface PeriodWinner {
  label: string;
  winner: LeaderboardEntry | null;
}

function getPeriodRange(period: LeaderboardPeriod, offset: number): { start: Date; end: Date } {
  const now = new Date();
  if (period === "week") {
    const day = now.getDay();
    const diffToMonday = day === 0 ? 6 : day - 1;
    const currentMonday = new Date(now);
    currentMonday.setHours(0, 0, 0, 0);
    currentMonday.setDate(now.getDate() - diffToMonday);
    const start = new Date(currentMonday);
    start.setDate(start.getDate() - offset * 7);
    const end = new Date(start);
    end.setDate(start.getDate() + 7);
    return { start, end };
  }
  const start = new Date(now.getFullYear(), now.getMonth() - offset, 1);
  const end = new Date(now.getFullYear(), now.getMonth() - offset + 1, 1);
  return { start, end };
}

function formatPeriodLabel(period: LeaderboardPeriod, start: Date): string {
  if (period === "week") {
    return `Week of ${start.toLocaleDateString(undefined, { month: "short", day: "numeric" })}`;
  }
  return start.toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

async function getLeaderboardForRange(start: Date, end: Date): Promise<LeaderboardEntry[]> {
  if (!isSupabaseConfigured || !supabase) return [];

  const { data, error } = await supabase
    .from("point_events")
    .select("user_id, points, profiles(display_name)")
    .gte("created_at", start.toISOString())
    .lt("created_at", end.toISOString());
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

/**
 * Weekly/monthly leaderboards are just point_events filtered to the current
 * window — there's no destructive "reset" each period, the window simply
 * moves forward, so nobody's history is ever lost.
 */
export async function getLeaderboard(period: LeaderboardPeriod): Promise<LeaderboardEntry[]> {
  const { start, end } = getPeriodRange(period, 0);
  return getLeaderboardForRange(start, end);
}

/** Top 3 from the most recently *completed* week — used to grant next week's point multiplier. */
export async function getPreviousTopThree(): Promise<string[]> {
  const { start, end } = getPeriodRange("week", 1);
  const board = await getLeaderboardForRange(start, end);
  return board.slice(0, 3).map((e) => e.userId);
}

/** Whether this user finished in the top 3 last week, earning a point multiplier this week. */
export async function isEligibleForMultiplier(userId: string): Promise<boolean> {
  const topThree = await getPreviousTopThree();
  return topThree.includes(userId);
}

/**
 * Hall of Fame: the #1 finisher for each of the last `count` completed
 * periods. Computed on demand from point_events history — nothing is
 * snapshotted or destroyed when a period ends.
 */
export async function getHallOfFame(period: LeaderboardPeriod, count = 8): Promise<PeriodWinner[]> {
  const winners: PeriodWinner[] = [];
  for (let offset = 1; offset <= count; offset++) {
    const { start, end } = getPeriodRange(period, offset);
    const board = await getLeaderboardForRange(start, end);
    winners.push({ label: formatPeriodLabel(period, start), winner: board[0] ?? null });
  }
  return winners;
}