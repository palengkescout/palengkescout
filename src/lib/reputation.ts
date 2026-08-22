import { isSupabaseConfigured, supabase } from "./supabaseClient";

export type ReputationTier = "new" | "active" | "trusted";

export interface ReporterStats {
  verifiedCount: number;
  flaggedCount: number;
  pendingCount: number;
  totalCount: number;
  flagRate: number; // 0–1
  tier: ReputationTier;
  nextTier: { tier: ReputationTier; verifiedNeeded: number } | null;
}

const TIER_LABELS: Record<ReputationTier, string> = {
  new: "New Reporter",
  active: "Active Reporter",
  trusted: "Trusted Reporter",
};

export function tierLabel(tier: ReputationTier): string {
  return TIER_LABELS[tier];
}

function computeTier(verifiedCount: number, flagRate: number): ReputationTier {
  if (verifiedCount >= 20 && flagRate <= 0.1) return "trusted";
  if (verifiedCount >= 5 && flagRate <= 0.2) return "active";
  return "new";
}

/**
 * A "verified" badge comes from a track record — reports that agreed with
 * consensus over time — not a single test. It can also be lost again: a
 * rising flag rate drops a reporter back down a tier.
 */
export async function getReporterStats(userId: string): Promise<ReporterStats> {
  if (!isSupabaseConfigured || !supabase) {
    return {
      verifiedCount: 0,
      flaggedCount: 0,
      pendingCount: 0,
      totalCount: 0,
      flagRate: 0,
      tier: "new",
      nextTier: { tier: "active", verifiedNeeded: 5 },
    };
  }

  const { data, error } = await supabase.from("price_reports").select("status").eq("user_id", userId);
  if (error) throw error;

  const rows = data ?? [];
  const verifiedCount = rows.filter((r) => r.status === "verified").length;
  const flaggedCount = rows.filter((r) => r.status === "flagged").length;
  const pendingCount = rows.filter((r) => r.status === "pending").length;
  const totalCount = rows.length;
  const flagRate = totalCount === 0 ? 0 : flaggedCount / totalCount;
  const tier = computeTier(verifiedCount, flagRate);

  let nextTier: ReporterStats["nextTier"] = null;
  if (tier === "new") nextTier = { tier: "active", verifiedNeeded: Math.max(0, 5 - verifiedCount) };
  else if (tier === "active") nextTier = { tier: "trusted", verifiedNeeded: Math.max(0, 20 - verifiedCount) };

  return { verifiedCount, flaggedCount, pendingCount, totalCount, flagRate, tier, nextTier };
}