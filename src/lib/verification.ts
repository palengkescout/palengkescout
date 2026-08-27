import type { PriceStatus } from "../types";

export const PRICE_FLAG_PCT = 0.5; // more than 50% off today's verified price = flagged for review
export const CONFIRMATIONS_NEEDED = 3; // distinct reporters (including this one) needed to verify a price today

const MANILA_OFFSET_MS = 8 * 60 * 60 * 1000;

function manilaDateKey(iso: string): string {
  const shifted = new Date(new Date(iso).getTime() + MANILA_OFFSET_MS);
  return shifted.toISOString().slice(0, 10);
}

function samePrice(a: number, b: number): boolean {
  return Math.round(a * 100) === Math.round(b * 100);
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export interface ReportForEvaluation {
  id: string;
  status: PriceStatus;
  reportedAt: string;
  normalizedUnit: string; 
  normalizedPrice: number; 
}

export interface StatusEvaluation {
  status: PriceStatus;
  upgradeReportIds: string[];
}

export function evaluateReportStatus(
  newNormalizedPrice: number,
  newReportedAt: string,
  newNormalizedUnit: string,
  existingReportsSameMarket: ReportForEvaluation[]
): StatusEvaluation {
  const today = manilaDateKey(newReportedAt);

  const sameUnit = existingReportsSameMarket.filter((r) => r.normalizedUnit === newNormalizedUnit);

  const matchingToday = sameUnit.filter(
    (r) => samePrice(r.normalizedPrice, newNormalizedPrice) && manilaDateKey(r.reportedAt) === today
  );

  if (matchingToday.length + 1 >= CONFIRMATIONS_NEEDED) {
    return { status: "verified", upgradeReportIds: matchingToday.map((r) => r.id) };
  }

  const verifiedToday = sameUnit.filter(
    (r) => r.status === "verified" && manilaDateKey(r.reportedAt) === today
  );
  if (verifiedToday.length > 0) {
    const referencePrice = median(verifiedToday.map((r) => r.normalizedPrice));
    const diffPct = Math.abs(newNormalizedPrice - referencePrice) / referencePrice;
    if (diffPct > PRICE_FLAG_PCT) {
      return { status: "flagged", upgradeReportIds: [] };
    }
  }

  return { status: "pending", upgradeReportIds: [] };
}