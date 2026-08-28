import { isSupabaseConfigured, supabase } from "./supabaseClient";

const LOCAL_POINTS_KEY = "palengkescout_points_v1"; 

export const POINTS_FOR_REPORT = 5;
export const POINTS_FOR_PRODUCT_NAME = 5;
export const POINTS_FOR_PHOTO = 10;
export const POINTS_FOR_VERIFICATION = 10;

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

export async function getTotalPoints(userId?: string): Promise<number> {
  if (isSupabaseConfigured && supabase && userId) {
    const { data, error } = await supabase.from("point_events").select("points").eq("user_id", userId);
    if (error) throw error;
    return (data ?? []).reduce((sum, row) => sum + row.points, 0);
  }
  return getLocalPoints();
}