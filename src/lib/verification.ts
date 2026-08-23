import type { PriceStatus } from "../types";

export const PRICE_TOLERANCE_PCT = 0.15; // within 15% of the reference price = valid
export const PRICE_FLAG_PCT = 0.5; // more than 50% off = flagged for review

const MIN_BASELINE_SAMPLE = 2;

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
  upgradeReportIds: string[];
}

function clusterPrices(
  reports: ReportForEvaluation[],
  tolerancePct: number
): ReportForEvaluation[][] {
  const sorted = [...reports].sort((a, b) => a.price - b.price);
  const clusters: ReportForEvaluation[][] = [];

  for (const report of sorted) {
    const lastCluster = clusters[clusters.length - 1];
    if (lastCluster) {
      const clusterMedian = median(lastCluster.map((r) => r.price));
      if (Math.abs(report.price - clusterMedian) / clusterMedian <= tolerancePct) {
        lastCluster.push(report);
        continue;
      }
    }
    clusters.push([report]);
  }

  return clusters;
}

function largestCluster(clusters: ReportForEvaluation[][]): ReportForEvaluation[] {
  return clusters.reduce((largest, c) => (c.length > largest.length ? c : largest), [] as ReportForEvaluation[]);
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
 * - If nothing is verified yet, pending reports are grouped into clusters
 *   of mutual agreement, and the *largest* cluster becomes the baseline —
 *   not just any single matching report. This matters when pending reports
 *   split into two different price groups (e.g. a promo price vs a regular
 *   price): the new report should be judged against the group most people
 *   agree on, not whichever isolated report it happens to land near first.
 * - A true first-of-its-kind report, or one with no cluster big enough to
 *   count as consensus yet, stays pending — there's nothing solid yet to
 *   judge it against.
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
  const clusters = clusterPrices(pending, PRICE_TOLERANCE_PCT);
  const biggest = largestCluster(clusters);

  if (biggest.length >= MIN_BASELINE_SAMPLE) {
    const baseline = median(biggest.map((r) => r.price));
    const diffPct = Math.abs(newPrice - baseline) / baseline;

    if (diffPct <= PRICE_TOLERANCE_PCT) {
      return { status: "verified", upgradeReportIds: biggest.map((r) => r.id) };
    }
    if (diffPct > PRICE_FLAG_PCT) {
      return { status: "flagged", upgradeReportIds: [] };
    }
    return { status: "pending", upgradeReportIds: [] };
  }

  const corroborating = pending.filter(
    (r) => Math.abs(newPrice - r.price) / r.price <= PRICE_TOLERANCE_PCT
  );

  if (corroborating.length > 0) {
    return { status: "verified", upgradeReportIds: corroborating.map((r) => r.id) };
  }

  return { status: "pending", upgradeReportIds: [] };
}