import { isSupabaseConfigured, supabase } from "./supabaseClient";

const LOCAL_POINTS_KEY = "palengkescout_points_v1"; // fallback only when Supabase isn't configured

export const POINTS_FOR_REPORT = 5;
export const POINTS_FOR_PRODUCT_NAME = 5; // awarded alongside POINTS_FOR_REPORT whenever a product name is provided — currently always, since the field is required
export const POINTS_FOR_PHOTO = 10;
export const POINTS_FOR_VERIFICATION = 10; // awarded once, the moment a report actually becomes verified — may happen well after submission, and to a different report than the one that triggered it

function getLocalPoints(): number {
  const raw = localStorage.getItem(LOCAL_POINTS_KEY);
  return raw ? Number(raw) || 0 : 0;
}

function addLocalPoints(amount: number): number {
  const total = getLocalPoints() + amount;
  localStorage.setItem(LOCAL_POINTS_KEY, String(total));
  return total;
}

export interface RecordPointsInput {
  userId?: string;
  points: number;
  reason: "report" | "report_with_photo" | "verified_bonus";
  priceReportId?: string;
}

/**
 * Records a point-earning event. When Supabase + a logged-in user are
 * available, this writes to point_events — tying points to the account and
 * feeding the weekly/monthly leaderboards. Otherwise it falls back to a
 * local, device-only tally, used only in local dev without a Supabase
 * project configured (reporting already requires login in the real app).
 *
 * "verified_bonus" is new — if point_events has a CHECK constraint
 * restricting `reason` to a fixed set of values, that constraint needs to
 * be updated to allow this one, or every verification-bonus insert will
 * fail.
 */
export async function recordPoints(input: RecordPointsInput): Promise<number> {
  if (isSupabaseConfigured && supabase && input.userId) {
    const { error } = await supabase.from("point_events").insert({
      user_id: input.userId,
      points: input.points,
      reason: input.reason,
      price_report_id: input.priceReportId ?? null,
    });
    if (error) throw error;
    return getTotalPoints(input.userId);
  }
  return addLocalPoints(input.points);
}

/** All-time point total for a user (or device, if not logged in). */
export async function getTotalPoints(userId?: string): Promise<number> {
  if (isSupabaseConfigured && supabase && userId) {
    const { data, error } = await supabase.from("point_events").select("points").eq("user_id", userId);
    if (error) throw error;
    return (data ?? []).reduce((sum, row) => sum + row.points, 0);
  }
  return getLocalPoints();
}