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
  price: number;
  status: PriceStatus;
  reportedAt: string;
}

export interface StatusEvaluation {
  status: PriceStatus;
  upgradeReportIds: string[];
}

export function evaluateReportStatus(
  newPrice: number,
  newReportedAt: string,
  existingReportsSameMarket: ReportForEvaluation[]
): StatusEvaluation {
  const today = manilaDateKey(newReportedAt);

  const matchingToday = existingReportsSameMarket.filter(
    (r) => samePrice(r.price, newPrice) && manilaDateKey(r.reportedAt) === today
  );

  // +1 counts the report being evaluated itself.
  if (matchingToday.length + 1 >= CONFIRMATIONS_NEEDED) {
    return { status: "verified", upgradeReportIds: matchingToday.map((r) => r.id) };
  }

  // Not enough confirmations yet for this exact price today. Before
  // leaving it as pending, check it against whatever price *did* reach
  // consensus today, if any — a huge divergence from an already-confirmed
  // price gets flagged rather than silently ignored.
  const verifiedToday = existingReportsSameMarket.filter(
    (r) => r.status === "verified" && manilaDateKey(r.reportedAt) === today
  );
  if (verifiedToday.length > 0) {
    const referencePrice = median(verifiedToday.map((r) => r.price));
    const diffPct = Math.abs(newPrice - referencePrice) / referencePrice;
    if (diffPct > PRICE_FLAG_PCT) {
      return { status: "flagged", upgradeReportIds: [] };
    }
  }

  return { status: "pending", upgradeReportIds: [] };
}