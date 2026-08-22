import type { PriceStatus } from "../types";

export const PRICE_TOLERANCE_PCT = 0.15; // within 15% of the reference price = valid
export const PRICE_FLAG_PCT = 0.5; // more than 50% off = flagged for review

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export interface ReportForEvaluation {
  id: string;
  price: number;
  status: PriceStatus;
}

export interface StatusEvaluation {
  status: PriceStatus;
  /** IDs of existing pending reports that should also be upgraded to
   *  verified, because the new report corroborates them. */
  upgradeReportIds: string[];
}

/**
 * Decides a new report's status by comparing it to *other reports for the
 * same item at the same market* — never by trusting who submitted it. This
 * is what stops a single report (even from a reputable reporter) from being
 * able to set a false price on its own:
 *
 * - If a verified price is already established here, the new report must
 *   land within PRICE_TOLERANCE_PCT of it to auto-verify. Small day-to-day
 *   gaps are expected and pass fine.
 * - A report more than PRICE_FLAG_PCT off gets flagged for review instead
 *   of silently accepted — no matter whose report it is.
 * - If nothing is verified yet, a new report is checked against other
 *   *pending* reports for agreement. Two independent people landing in the
 *   same range counts as corroboration, and both become verified together.
 * - A true first-of-its-kind report (nothing to compare against at all)
 *   stays pending — there's nothing yet to judge it against.
 */
export function evaluateReportStatus(
  newPrice: number,
  existingReportsSameMarket: ReportForEvaluation[]
): StatusEvaluation {
  const verified = existingReportsSameMarket.filter((r) => r.status === "verified");

  if (verified.length > 0) {
    const referencePrice = median(verified.map((r) => r.price));
    const diffPct = Math.abs(newPrice - referencePrice) / referencePrice;

    if (diffPct <= PRICE_TOLERANCE_PCT) return { status: "verified", upgradeReportIds: [] };
    if (diffPct > PRICE_FLAG_PCT) return { status: "flagged", upgradeReportIds: [] };
    return { status: "pending", upgradeReportIds: [] };
  }

  const pending = existingReportsSameMarket.filter((r) => r.status === "pending");
  const corroborating = pending.filter(
    (r) => Math.abs(newPrice - r.price) / r.price <= PRICE_TOLERANCE_PCT
  );

  if (corroborating.length > 0) {
    return { status: "verified", upgradeReportIds: corroborating.map((r) => r.id) };
  }

  return { status: "pending", upgradeReportIds: [] };
}