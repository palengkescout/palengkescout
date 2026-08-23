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

const MANILA_OFFSET_MS = 8 * 60 * 60 * 1000;

function manilaNow(): Date {
  return new Date(Date.now() + MANILA_OFFSET_MS);
}

function manilaWallClockToUtc(manilaWallClock: Date): Date {
  return new Date(manilaWallClock.getTime() - MANILA_OFFSET_MS);
}

function getPeriodRange(period: LeaderboardPeriod, offset: number): { start: Date; end: Date } {
  const manila = manilaNow();

  if (period === "week") {
    const day = manila.getUTCDay(); // 0 = Sunday, using UTC getters on the shifted date
    const diffToMonday = day === 0 ? 6 : day - 1;
    const currentMonday = new Date(manila);
    currentMonday.setUTCHours(0, 0, 0, 0);
    currentMonday.setUTCDate(manila.getUTCDate() - diffToMonday);

    const startManila = new Date(currentMonday);
    startManila.setUTCDate(startManila.getUTCDate() - offset * 7);
    const endManila = new Date(startManila);
    endManila.setUTCDate(startManila.getUTCDate() + 7);

    return { start: manilaWallClockToUtc(startManila), end: manilaWallClockToUtc(endManila) };
  }

  const startManila = new Date(Date.UTC(manila.getUTCFullYear(), manila.getUTCMonth() - offset, 1));
  const endManila = new Date(Date.UTC(manila.getUTCFullYear(), manila.getUTCMonth() - offset + 1, 1));
  return { start: manilaWallClockToUtc(startManila), end: manilaWallClockToUtc(endManila) };
}

function formatPeriodLabel(period: LeaderboardPeriod, start: Date): string {
  if (period === "week") {
    return `Week of ${start.toLocaleDateString("en-PH", {
      month: "short",
      day: "numeric",
      timeZone: "Asia/Manila",
    })}`;
  }
  return start.toLocaleDateString("en-PH", { month: "long", year: "numeric", timeZone: "Asia/Manila" });
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

export async function getLeaderboard(period: LeaderboardPeriod): Promise<LeaderboardEntry[]> {
  const { start, end } = getPeriodRange(period, 0);
  return getLeaderboardForRange(start, end);
}

export async function getPreviousTopThree(): Promise<string[]> {
  const { start, end } = getPeriodRange("week", 1);
  const board = await getLeaderboardForRange(start, end);
  return board.slice(0, 3).map((e) => e.userId);
}

export async function isEligibleForMultiplier(userId: string): Promise<boolean> {
  const topThree = await getPreviousTopThree();
  return topThree.includes(userId);
}

export async function getHallOfFame(period: LeaderboardPeriod, count = 8): Promise<PeriodWinner[]> {
  const winners: PeriodWinner[] = [];
  for (let offset = 1; offset <= count; offset++) {
    const { start, end } = getPeriodRange(period, offset);
    const board = await getLeaderboardForRange(start, end);
    winners.push({ label: formatPeriodLabel(period, start), winner: board[0] ?? null });
  }
  return winners;
}