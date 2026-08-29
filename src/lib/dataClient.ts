import { isSupabaseConfigured, supabase } from "./supabaseClient";
import { seedItems, seedMarkets, seedPriceReports } from "../data/seed";
import {
  recordPoints,
  getTotalPoints,
  POINTS_FOR_PHOTO,
  POINTS_FOR_PRODUCT_NAME,
  POINTS_FOR_REPORT,
  POINTS_FOR_VERIFICATION,
} from "./points";
import { isValidProductName } from "./productName";
import { evaluateReportStatus } from "./verification";
import { normalizeQuantity } from "./units";
import { isEligibleForMultiplier } from "./leaderboard";
import { enforceReportCooldown } from "./rateLimit";
import type { Item, Market, MyReportRow, PriceReport, PriceRowData, PriceStatus } from "../types";

const STORAGE_KEY = "palengkescout_reports_v1";
const FLAGS_STORAGE_KEY = "palengkescout_flags_v1";

// How many distinct users flagging the same report before it's marked
// "flagged" and sent for AI review.
const FLAGS_TO_TRIGGER_REVIEW = 2;

function loadMockReports(): PriceReport[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as PriceReport[];
  } catch {
    // ignore corrupt storage, fall back to seed
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(seedPriceReports));
  return seedPriceReports;
}

function saveMockReports(reports: PriceReport[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(reports));
}

// Mock flags are stored as `${reportId}:${userId}` strings — enough to
// dedupe and count without needing a second local "table".
function loadMockFlags(): string[] {
  try {
    const raw = localStorage.getItem(FLAGS_STORAGE_KEY);
    if (raw) return JSON.parse(raw) as string[];
  } catch {
    // ignore corrupt storage
  }
  return [];
}

function saveMockFlags(flags: string[]) {
  localStorage.setItem(FLAGS_STORAGE_KEY, JSON.stringify(flags));
}

export async function listItems(): Promise<Item[]> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.from("items").select("*").order("name");
    if (error) throw error;
    return data as Item[];
  }
  return seedItems;
}

export async function listMarkets(): Promise<Market[]> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.from("markets").select("*").order("name");
    if (error) throw error;
    return data as Market[];
  }
  return seedMarkets;
}

export async function getItem(itemId: string): Promise<Item | undefined> {
  const items = await listItems();
  return items.find((i) => i.id === itemId);
}

function mapSupabaseRow(row: any): PriceRowData {
  return {
    id: row.id,
    itemId: row.item_id,
    marketId: row.market_id,
    price: Number(row.price),
    status: row.status,
    reportedAt: row.reported_at,
    reporterName: row.reporter_name,
    photoUrl: row.photo_url ?? undefined,
    userId: row.user_id ?? undefined,
    productName: row.product_name,
    unit: row.unit,
    quantity: Number(row.quantity),
    normalizedUnit: row.normalized_unit,
    normalizedPrice: Number(row.normalized_price),
    market: {
      id: row.market.id,
      name: row.market.name,
      barangay: row.market.barangay,
      type: row.market.type,
      latitude: row.market.latitude,
      longitude: row.market.longitude,
    },
  };
}

export async function listPricesForItem(itemId: string): Promise<PriceRowData[]> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from("price_reports")
      .select("*, market:markets(*)")
      .eq("item_id", itemId)
      .order("reported_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map(mapSupabaseRow);
  }

  const reports = loadMockReports().filter((r) => r.itemId === itemId);
  const markets = seedMarkets;
  return reports
    .map((r) => {
      const market = markets.find((m) => m.id === r.marketId);
      if (!market) return null;
      return { ...r, market } satisfies PriceRowData;
    })
    .filter((r): r is PriceRowData => r !== null)
    .sort((a, b) => new Date(b.reportedAt).getTime() - new Date(a.reportedAt).getTime());
}

export interface LowestPriceInfo {
  price: number;
  reporterId: string | null;
}

export async function listLowestPrices(): Promise<Record<string, LowestPriceInfo | null>> {
  const result: Record<string, LowestPriceInfo | null> = {};

  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from("price_reports")
      .select("item_id, price, status, user_id")
      .neq("status", "flagged");
    if (error) throw error;
    for (const row of data ?? []) {
      const current = result[row.item_id];
      const price = Number(row.price);
      if (!current || price < current.price) {
        result[row.item_id] = { price, reporterId: row.user_id ?? null };
      }
    }
    return result;
  }

  const reports = loadMockReports().filter((r) => r.status !== "flagged");
  for (const report of reports) {
    const current = result[report.itemId];
    if (!current || report.price < current.price) {
      result[report.itemId] = { price: report.price, reporterId: report.userId ?? null };
    }
  }
  return result;
}

export interface RecentReportInfo {
  id: string;
  itemId: string;
  itemName: string;
  itemCategory: string;
  price: number;
  status: PriceStatus;
  reportedAt: string;
}

export async function listRecentReports(limit: number): Promise<RecentReportInfo[]> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from("price_reports")
      .select("id, item_id, price, status, reported_at, item:items(name, category)")
      .neq("status", "flagged")
      .order("reported_at", { ascending: false })
      .limit(limit);
    if (error) throw error;
    return (data ?? [])
      .filter((row: any) => row.item)
      .map((row: any) => ({
        id: row.id,
        itemId: row.item_id,
        itemName: row.item.name,
        itemCategory: row.item.category,
        price: Number(row.price),
        status: row.status,
        reportedAt: row.reported_at,
      }));
  }

  const reports = [...loadMockReports()]
    .filter((r) => r.status !== "flagged")
    .sort((a, b) => new Date(b.reportedAt).getTime() - new Date(a.reportedAt).getTime())
    .slice(0, limit);

  return reports
    .map((r) => {
      const item = seedItems.find((i) => i.id === r.itemId);
      if (!item) return null;
      return {
        id: r.id,
        itemId: r.itemId,
        itemName: item.name,
        itemCategory: item.category,
        price: r.price,
        status: r.status,
        reportedAt: r.reportedAt,
      };
    })
    .filter((r): r is RecentReportInfo => r !== null);
}

interface UpgradeCandidate {
  id: string;
  previousStatus: PriceStatus;
  userId?: string;
}

/**
 * Upgrades other pending reports to "verified" once a new/edited report
 * anchors a large-enough consensus cluster (see verification.ts), and
 * awards each newly-verified report's owner the +10 verification bonus.
 *
 * Both the status update and each point award are cross-user writes —
 * they touch rows/accounts that don't belong to the caller — so both are
 * wrapped defensively. price_reports has no RLS policy permitting a
 * cross-user status update by design (see migration 007's notes on why a
 * broader policy would be unsafe); point_events may have a similar
 * restriction that hasn't been confirmed either way. Each failure is
 * logged and skipped rather than allowed to break the report the person
 * actually just submitted or edited.
 *
 * Only candidates whose *previous* status wasn't already "verified" get
 * the bonus — a report that's re-matched into a cluster it was already
 * part of shouldn't be paid again every time a new report happens to
 * match it the same day.
 */
async function tryUpgradeAndRewardMatchingReports(candidates: UpgradeCandidate[]): Promise<void> {
  if (candidates.length === 0 || !supabase) return;

  try {
    const { error } = await supabase
      .from("price_reports")
      .update({ status: "verified" })
      .in(
        "id",
        candidates.map((c) => c.id)
      );
    if (error) throw error;
  } catch (err) {
    console.error("Could not upgrade matching reports to verified (likely RLS — see migration 007 notes):", err);
    return; // the status change didn't happen, so don't pay out bonuses for it
  }

  for (const candidate of candidates) {
    if (candidate.previousStatus === "verified" || !candidate.userId) continue;
    try {
      await recordPoints({
        userId: candidate.userId,
        points: POINTS_FOR_VERIFICATION,
        reason: "verified_bonus",
        priceReportId: candidate.id,
      });
    } catch (err) {
      console.error(
        `Could not award verification bonus for report ${candidate.id} (possibly an RLS restriction on inserting point_events for another user, or a CHECK constraint that doesn't yet allow reason='verified_bonus'):`,
        err
      );
    }
  }
}

export interface ReportPriceInput {
  itemId: string;
  marketId: string;
  price: number; // total price for `quantity` of `unit` — e.g. ₱45 for 500g
  reporterName: string;
  photoFile?: File;
  userId?: string;
  productName: string; // required — the specific brand/variant being priced
  unit: string; // required — the measurement this report was entered in
  quantity: number; // required — how much of `unit` the price covers, e.g. 500 for "500 g"
}

export interface ReportPriceResult {
  report: PriceReport;
  pointsAwarded: number;
  totalPoints: number;
  multiplierApplied: boolean;
  verificationBonusAwarded: number; // 0 or POINTS_FOR_VERIFICATION — already folded into pointsAwarded, broken out so the UI can call it out separately
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

async function uploadPhotoToSupabase(file: File): Promise<string> {
  if (!supabase) throw new Error("Supabase not configured");
  const path = `${Date.now()}-${file.name}`;
  const { error } = await supabase.storage.from("price-photos").upload(path, file);
  if (error) throw error;
  const { data } = supabase.storage.from("price-photos").getPublicUrl(path);
  return data.publicUrl;
}

export async function reportPrice(input: ReportPriceInput): Promise<ReportPriceResult> {
  // Fetch the item name server-side so the product-name bonus can't be
  // earned by bypassing the UI (e.g. hitting reportPrice directly with a
  // junk string like "aaaaa"). Same isValidProductName rule the form
  // uses for its live preview.
  const reportedItem = await getItem(input.itemId);
  const productNameCounts = isValidProductName(input.productName, reportedItem?.name);

  const baseline =
    POINTS_FOR_REPORT +
    (productNameCounts ? POINTS_FOR_PRODUCT_NAME : 0) +
    (input.photoFile ? POINTS_FOR_PHOTO : 0);
  const multiplierApplied = input.userId ? await isEligibleForMultiplier(input.userId) : false;
  const baselinePoints = multiplierApplied ? Math.round(baseline * 1.5) : baseline;
  const reason = input.photoFile ? "report_with_photo" : "report";
  const now = new Date().toISOString();

  const { normalizedUnit, normalizedPrice } = normalizeQuantity(input.price, input.quantity, input.unit);

  if (isSupabaseConfigured && supabase) {
    if (input.userId) {
      const { data: lastOwn, error: lastOwnError } = await supabase
        .from("price_reports")
        .select("reported_at")
        .eq("item_id", input.itemId)
        .eq("market_id", input.marketId)
        .eq("user_id", input.userId)
        .order("reported_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (lastOwnError) throw lastOwnError;
      enforceReportCooldown(lastOwn?.reported_at ?? null);
    }

    const { data: existing, error: existingError } = await supabase
      .from("price_reports")
      .select("id, status, user_id, reported_at, normalized_unit, normalized_price")
      .eq("item_id", input.itemId)
      .eq("market_id", input.marketId)
      .order("reported_at", { ascending: false })
      .limit(200);
    if (existingError) throw existingError;

    const othersOnly = input.userId
      ? (existing ?? []).filter((r) => r.user_id !== input.userId)
      : existing ?? [];

    const evaluation = evaluateReportStatus(
      normalizedPrice,
      now,
      normalizedUnit,
      othersOnly.map((r) => ({
        id: r.id,
        status: r.status,
        reportedAt: r.reported_at,
        normalizedUnit: r.normalized_unit,
        normalizedPrice: Number(r.normalized_price),
      }))
    );

    const photoUrl = input.photoFile ? await uploadPhotoToSupabase(input.photoFile) : undefined;
    const { data, error } = await supabase
      .from("price_reports")
      .insert({
        item_id: input.itemId,
        market_id: input.marketId,
        price: input.price,
        status: evaluation.status,
        reporter_name: input.reporterName,
        photo_url: photoUrl,
        user_id: input.userId ?? null,
        product_name: input.productName,
        unit: input.unit,
        quantity: input.quantity,
        normalized_unit: normalizedUnit,
        normalized_price: normalizedPrice,
      })
      .select()
      .single();
    if (error) throw error;

    const upgradeCandidates: UpgradeCandidate[] = othersOnly
      .filter((r) => evaluation.upgradeReportIds.includes(r.id))
      .map((r) => ({ id: r.id, previousStatus: r.status as PriceStatus, userId: r.user_id ?? undefined }));
    await tryUpgradeAndRewardMatchingReports(upgradeCandidates);

    let totalPoints = await recordPoints({
      userId: input.userId,
      points: baselinePoints,
      reason,
      priceReportId: data.id,
    });

    // A brand-new report has no "previous status" to compare against — if
    // it lands as verified immediately (a 3rd matching report already
    // existed today), the bonus applies right away.
    let verificationBonusAwarded = 0;
    if (evaluation.status === "verified" && input.userId) {
      try {
        totalPoints = await recordPoints({
          userId: input.userId,
          points: POINTS_FOR_VERIFICATION,
          reason: "verified_bonus",
          priceReportId: data.id,
        });
        verificationBonusAwarded = POINTS_FOR_VERIFICATION;
      } catch (err) {
        console.error("Could not award self verification bonus:", err);
      }
    }

    return {
      report: {
        id: data.id,
        itemId: data.item_id,
        marketId: data.market_id,
        price: Number(data.price),
        status: data.status,
        reportedAt: data.reported_at,
        reporterName: data.reporter_name,
        photoUrl: data.photo_url ?? undefined,
        userId: data.user_id ?? undefined,
        productName: data.product_name,
        unit: data.unit,
        quantity: Number(data.quantity),
        normalizedUnit: data.normalized_unit,
        normalizedPrice: Number(data.normalized_price),
      },
      pointsAwarded: baselinePoints + verificationBonusAwarded,
      totalPoints,
      multiplierApplied,
      verificationBonusAwarded,
    };
  }

  // Mock/local-dev branch — same cooldown rule, checked against localStorage.
  const reports = loadMockReports();
  if (input.userId) {
    const ownReports = reports
      .filter((r) => r.itemId === input.itemId && r.marketId === input.marketId && r.userId === input.userId)
      .sort((a, b) => new Date(b.reportedAt).getTime() - new Date(a.reportedAt).getTime());
    enforceReportCooldown(ownReports[0]?.reportedAt ?? null);
  }

  const sameItemMarketReports = reports.filter(
    (r) =>
      r.itemId === input.itemId &&
      r.marketId === input.marketId &&
      (!input.userId || r.userId !== input.userId)
  );
  const evaluation = evaluateReportStatus(normalizedPrice, now, normalizedUnit, sameItemMarketReports);

  const photoUrl = input.photoFile ? await fileToDataUrl(input.photoFile) : undefined;
  const newReport: PriceReport = {
    id: `pr-${Date.now()}`,
    itemId: input.itemId,
    marketId: input.marketId,
    price: input.price,
    status: evaluation.status,
    reportedAt: now,
    reporterName: input.reporterName || "Anonymous",
    photoUrl,
    pointsAwarded: baselinePoints,
    userId: input.userId,
    productName: input.productName,
    unit: input.unit,
    quantity: input.quantity,
    normalizedUnit,
    normalizedPrice,
  };

  const upgradeCandidates: UpgradeCandidate[] = sameItemMarketReports
    .filter((r) => evaluation.upgradeReportIds.includes(r.id))
    .map((r) => ({ id: r.id, previousStatus: r.status, userId: r.userId }));

  const upgraded = reports.map((r) =>
    evaluation.upgradeReportIds.includes(r.id) ? { ...r, status: "verified" as const } : r
  );
  const updated = [newReport, ...upgraded];
  saveMockReports(updated);

  // Mirror the same "only newly-transitioning reports get paid" rule in
  // mock mode. Mock mode's local point tally isn't actually segmented per
  // user (it's one shared on-device number), so this mainly exists to keep
  // the two code paths behaving identically for testing.
  for (const candidate of upgradeCandidates) {
    if (candidate.previousStatus === "verified") continue;
    await recordPoints({ userId: candidate.userId, points: POINTS_FOR_VERIFICATION, reason: "verified_bonus" });
  }

  let totalPoints = await recordPoints({ userId: input.userId, points: baselinePoints, reason });

  let verificationBonusAwarded = 0;
  if (evaluation.status === "verified") {
    totalPoints = await recordPoints({ userId: input.userId, points: POINTS_FOR_VERIFICATION, reason: "verified_bonus" });
    verificationBonusAwarded = POINTS_FOR_VERIFICATION;
  }

  return {
    report: newReport,
    pointsAwarded: baselinePoints + verificationBonusAwarded,
    totalPoints,
    multiplierApplied,
    verificationBonusAwarded,
  };
}

/** All of a user's own reports, joined with item + market, newest first. */
export async function listMyReports(userId: string): Promise<MyReportRow[]> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from("price_reports")
      .select("*, item:items(*), market:markets(*)")
      .eq("user_id", userId)
      .order("reported_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map((row: any) => ({
      id: row.id,
      itemId: row.item_id,
      marketId: row.market_id,
      price: Number(row.price),
      status: row.status,
      reportedAt: row.reported_at,
      reporterName: row.reporter_name,
      photoUrl: row.photo_url ?? undefined,
      userId: row.user_id ?? undefined,
      productName: row.product_name,
      unit: row.unit,
      quantity: Number(row.quantity),
      normalizedUnit: row.normalized_unit,
      normalizedPrice: Number(row.normalized_price),
      item: row.item,
      market: row.market,
    }));
  }

  const reports = loadMockReports().filter((r) => r.userId === userId);
  return reports
    .map((r) => {
      const item = seedItems.find((i) => i.id === r.itemId);
      const market = seedMarkets.find((m) => m.id === r.marketId);
      if (!item || !market) return null;
      return { ...r, item, market } satisfies MyReportRow;
    })
    .filter((r): r is MyReportRow => r !== null)
    .sort((a, b) => new Date(b.reportedAt).getTime() - new Date(a.reportedAt).getTime());
}

export interface UpdateReportInput {
  reportId: string;
  userId: string;
  newPrice: number;
}

export interface UpdateReportResult {
  report: PriceReport;
  verificationBonusAwarded: number; // 0 or POINTS_FOR_VERIFICATION
}

export async function updateMyReport(input: UpdateReportInput): Promise<UpdateReportResult> {
  const now = new Date().toISOString();

  if (isSupabaseConfigured && supabase) {
    const { data: current, error: currentError } = await supabase
      .from("price_reports")
      .select("item_id, market_id, user_id, unit, quantity, status")
      .eq("id", input.reportId)
      .single();
    if (currentError) throw currentError;
    if (current.user_id !== input.userId) throw new Error("You can only edit your own reports.");

    const previousStatus = current.status as PriceStatus;

    const { normalizedUnit, normalizedPrice } = normalizeQuantity(
      input.newPrice,
      Number(current.quantity),
      current.unit
    );

    const { data: existing, error: existingError } = await supabase
      .from("price_reports")
      .select("id, status, user_id, reported_at, normalized_unit, normalized_price")
      .eq("item_id", current.item_id)
      .eq("market_id", current.market_id)
      .neq("id", input.reportId)
      .order("reported_at", { ascending: false })
      .limit(200);
    if (existingError) throw existingError;

    const othersOnly = (existing ?? []).filter((r) => r.user_id !== input.userId);

    const evaluation = evaluateReportStatus(
      normalizedPrice,
      now,
      normalizedUnit,
      othersOnly.map((r) => ({
        id: r.id,
        status: r.status,
        reportedAt: r.reported_at,
        normalizedUnit: r.normalized_unit,
        normalizedPrice: Number(r.normalized_price),
      }))
    );

    const { data, error } = await supabase
      .from("price_reports")
      .update({
        price: input.newPrice,
        status: evaluation.status,
        reported_at: now,
        normalized_unit: normalizedUnit,
        normalized_price: normalizedPrice,
      })
      .eq("id", input.reportId)
      .eq("user_id", input.userId)
      .select()
      .single();
    if (error) throw error;

    const upgradeCandidates: UpgradeCandidate[] = othersOnly
      .filter((r) => evaluation.upgradeReportIds.includes(r.id))
      .map((r) => ({ id: r.id, previousStatus: r.status as PriceStatus, userId: r.user_id ?? undefined }));
    await tryUpgradeAndRewardMatchingReports(upgradeCandidates);

    let verificationBonusAwarded = 0;
    if (evaluation.status === "verified" && previousStatus !== "verified") {
      try {
        await recordPoints({
          userId: input.userId,
          points: POINTS_FOR_VERIFICATION,
          reason: "verified_bonus",
          priceReportId: input.reportId,
        });
        verificationBonusAwarded = POINTS_FOR_VERIFICATION;
      } catch (err) {
        console.error("Could not award verification bonus on edit:", err);
      }
    }

    return {
      report: {
        id: data.id,
        itemId: data.item_id,
        marketId: data.market_id,
        price: Number(data.price),
        status: data.status,
        reportedAt: data.reported_at,
        reporterName: data.reporter_name,
        photoUrl: data.photo_url ?? undefined,
        userId: data.user_id ?? undefined,
        productName: data.product_name,
        unit: data.unit,
        quantity: Number(data.quantity),
        normalizedUnit: data.normalized_unit,
        normalizedPrice: Number(data.normalized_price),
      },
      verificationBonusAwarded,
    };
  }

  const reports = loadMockReports();
  const target = reports.find((r) => r.id === input.reportId && r.userId === input.userId);
  if (!target) throw new Error("Report not found.");

  const previousStatus = target.status;
  const { normalizedUnit, normalizedPrice } = normalizeQuantity(input.newPrice, target.quantity, target.unit);

  const others = reports.filter(
    (r) =>
      r.id !== input.reportId &&
      r.itemId === target.itemId &&
      r.marketId === target.marketId &&
      r.userId !== input.userId
  );
  const evaluation = evaluateReportStatus(normalizedPrice, now, normalizedUnit, others);

  const updated = reports.map((r) => {
    if (r.id === input.reportId) {
      return {
        ...r,
        price: input.newPrice,
        status: evaluation.status,
        reportedAt: now,
        normalizedUnit,
        normalizedPrice,
      };
    }
    if (evaluation.upgradeReportIds.includes(r.id)) return { ...r, status: "verified" as const };
    return r;
  });
  saveMockReports(updated);

  const upgradeCandidates = others.filter((r) => evaluation.upgradeReportIds.includes(r.id));
  for (const candidate of upgradeCandidates) {
    if (candidate.status === "verified") continue;
    await recordPoints({ userId: candidate.userId, points: POINTS_FOR_VERIFICATION, reason: "verified_bonus" });
  }

  let verificationBonusAwarded = 0;
  if (evaluation.status === "verified" && previousStatus !== "verified") {
    await recordPoints({ userId: input.userId, points: POINTS_FOR_VERIFICATION, reason: "verified_bonus" });
    verificationBonusAwarded = POINTS_FOR_VERIFICATION;
  }

  const updatedReport = updated.find((r) => r.id === input.reportId)!;
  return { report: updatedReport, verificationBonusAwarded };
}

export interface DeleteReportResult {
  pointsClawedBack: number;
  totalPoints: number;
}

export async function deleteMyReport(reportId: string, userId: string): Promise<DeleteReportResult> {
  if (isSupabaseConfigured && supabase) {
    const { data: current, error: currentError } = await supabase
      .from("price_reports")
      .select("status, user_id")
      .eq("id", reportId)
      .single();
    if (currentError) throw currentError;
    if (current.user_id !== userId) throw new Error("You can only delete your own reports.");

    // Figure out how many points to claw back, but DON'T record anything
    // yet. Points should only be removed once the delete actually
    // succeeds — recording the clawback first (the old order) meant a
    // failed delete (e.g. the price_reports/point_events FK constraint)
    // still silently drained points on every retry, with the report
    // never actually going away.
    let pointsClawedBack = 0;
    if (current.status !== "verified") {
      const { data: events, error: eventsError } = await supabase
        .from("point_events")
        .select("points")
        .eq("price_report_id", reportId);
      if (eventsError) throw eventsError;
      pointsClawedBack = (events ?? []).reduce((sum, e) => sum + e.points, 0);
    }

    // Delete FIRST. If this throws (RLS, FK, anything else), we stop
    // here and no points are touched.
    const { error: deleteError } = await supabase
      .from("price_reports")
      .delete()
      .eq("id", reportId)
      .eq("user_id", userId);
    if (deleteError) throw deleteError;

    if (pointsClawedBack > 0) {
      await recordPoints({ userId, points: -pointsClawedBack, reason: "report" });
    }

    const totalPoints = await getTotalPoints(userId);
    return { pointsClawedBack, totalPoints };
  }

  // Mock/local-dev branch — already deletes via saveMockReports(updated)
  // before recording points, so no reordering needed here.
  const reports = loadMockReports();
  const target = reports.find((r) => r.id === reportId && r.userId === userId);
  if (!target) throw new Error("Report not found.");

  let pointsClawedBack = 0;
  if (target.status !== "verified") {
    pointsClawedBack = target.pointsAwarded ?? 0;
  }

  const updated = reports.filter((r) => r.id !== reportId);
  saveMockReports(updated);

  const totalPoints =
    pointsClawedBack > 0
      ? await recordPoints({ userId, points: -pointsClawedBack, reason: "report" })
      : await getTotalPoints(userId);

  return { pointsClawedBack, totalPoints };
}

// Fire-and-forget: kicks off AI moderation for a newly-flagged report
// without making the person's tap wait on an OpenAI round trip. Failures
// are logged, not thrown — moderation is a nice-to-have layered on top
// of a flag that already recorded successfully.
function triggerAiModeration(reportId: string) {
  if (!supabase) return;
  supabase.functions
    .invoke("moderate-flagged-report", { body: { reportId } })
    .catch((err) => console.error("Could not trigger AI moderation:", err));
}

export interface FlagReportResult {
  totalFlags: number;
  nowFlagged: boolean; // true if THIS flag was the one that crossed the threshold
}

/**
 * Records that `userId` is flagging `reportId` as suspicious. Once a
 * report accumulates FLAGS_TO_TRIGGER_REVIEW distinct flags, its status
 * flips to "flagged" and AI moderation is triggered — this is currently
 * the ONLY path that leads to AI review (not tied to the automatic
 * price-outlier detection in evaluateReportStatus, which still sets
 * "flagged" independently for outlier pricing but doesn't call the AI).
 */
export async function flagPriceReport(reportId: string, userId: string): Promise<FlagReportResult> {
  if (isSupabaseConfigured && supabase) {
    const { error: insertError } = await supabase
      .from("price_report_flags")
      .insert({ price_report_id: reportId, user_id: userId });
    // 23505 = unique_violation — this user already flagged this report.
    // Treat that as a harmless no-op rather than an error.
    if (insertError && insertError.code !== "23505") throw insertError;

    const { count, error: countError } = await supabase
      .from("price_report_flags")
      .select("id", { count: "exact", head: true })
      .eq("price_report_id", reportId);
    if (countError) throw countError;

    const totalFlags = count ?? 0;
    let nowFlagged = false;

    if (totalFlags >= FLAGS_TO_TRIGGER_REVIEW) {
      const { data: current, error: currentError } = await supabase
        .from("price_reports")
        .select("status")
        .eq("id", reportId)
        .single();
      if (currentError) throw currentError;

      // Only act if this is the transition into "flagged" — avoids
      // re-triggering AI review every time a report that's already
      // flagged (or already resolved) gets an extra flag.
      if (current.status !== "flagged") {
        const { error: updateError } = await supabase
          .from("price_reports")
          .update({ status: "flagged" })
          .eq("id", reportId);
        if (updateError) throw updateError;
        nowFlagged = true;
        triggerAiModeration(reportId);
      }
    }

    return { totalFlags, nowFlagged };
  }

  // Mock/local-dev branch — flags tracked as "reportId:userId" strings in
  // localStorage. No AI call here since there's no edge function to hit
  // without a real Supabase backend.
  const flags = loadMockFlags();
  const key = `${reportId}:${userId}`;
  if (!flags.includes(key)) {
    flags.push(key);
    saveMockFlags(flags);
  }

  const totalFlags = flags.filter((f) => f.startsWith(`${reportId}:`)).length;
  let nowFlagged = false;

  if (totalFlags >= FLAGS_TO_TRIGGER_REVIEW) {
    const reports = loadMockReports();
    const target = reports.find((r) => r.id === reportId);
    if (target && target.status !== "flagged") {
      target.status = "flagged";
      saveMockReports(reports);
      nowFlagged = true;
    }
  }

  return { totalFlags, nowFlagged };
}