import { isSupabaseConfigured, supabase } from "./supabaseClient";
import { seedItems, seedMarkets, seedPriceReports } from "../data/seed";
import { recordPoints, getTotalPoints, POINTS_FOR_PHOTO, POINTS_FOR_REPORT } from "./points";
import { evaluateReportStatus } from "./verification";
import { isEligibleForMultiplier } from "./leaderboard";
import { enforceReportCooldown } from "./rateLimit";
import type { Item, Market, MyReportRow, PriceReport, PriceRowData, PriceStatus } from "../types";

const STORAGE_KEY = "palengkescout_reports_v1";

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

/**
 * Lowest currently-visible price per item, plus who reported it — the
 * reporter id is used to show a "Top Scout" badge on the Home screen card
 * when that reporter is currently in this week's top 3.
 */
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

/**
 * The most recent N reports app-wide, newest first — feeds the Home
 * screen's "recent activity" strip. Corrected to match
 * RecentReportsStrip.tsx's actual shape (flat itemName/itemCategory
 * fields, used for its emoji + label + link-to-item-detail row) — my
 * first restore attempt guessed a nested item/market shape instead,
 * which was wrong. Flagged reports are excluded, same reasoning as
 * listLowestPrices: a likely-bad price shouldn't be surfaced as
 * highlighted recent activity on the Home screen.
 */
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

/**
 * Upgrades other pending reports to "verified" once a new/edited report
 * anchors a large-enough consensus cluster (see verification.ts).
 *
 * This is a cross-user UPDATE — it touches rows that don't belong to the
 * caller — and price_reports has no RLS policy permitting that (by
 * design; see migration 007's comments on why a broader policy would be
 * unsafe). Until that's replaced with a proper SECURITY DEFINER function
 * that re-derives the upgrade set server-side, this call is expected to
 * fail under RLS. It's wrapped here so that expected failure can never
 * take down the report the person actually just submitted or edited —
 * previously it did exactly that, because the un-caught error propagated
 * up and rejected the whole reportPrice()/updateMyReport() call even
 * though the primary row had already saved successfully.
 */
async function tryUpgradeMatchingReports(ids: string[]): Promise<void> {
  if (ids.length === 0 || !supabase) return;
  try {
    const { error } = await supabase.from("price_reports").update({ status: "verified" }).in("id", ids);
    if (error) throw error;
  } catch (err) {
    console.error("Could not upgrade matching reports to verified (likely RLS — see migration 007 notes):", err);
  }
}

export interface ReportPriceInput {
  itemId: string;
  marketId: string;
  price: number;
  reporterName: string;
  photoFile?: File;
  userId?: string;
}

export interface ReportPriceResult {
  report: PriceReport;
  pointsAwarded: number;
  totalPoints: number;
  multiplierApplied: boolean;
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
  const baseline = POINTS_FOR_REPORT + (input.photoFile ? POINTS_FOR_PHOTO : 0);
  const multiplierApplied = input.userId ? await isEligibleForMultiplier(input.userId) : false;
  const pointsAwarded = multiplierApplied ? Math.round(baseline * 1.5) : baseline;
  const reason = input.photoFile ? "report_with_photo" : "report";
  const now = new Date().toISOString();

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
      .select("id, price, status, user_id, reported_at")
      .eq("item_id", input.itemId)
      .eq("market_id", input.marketId)
      .order("reported_at", { ascending: false })
      .limit(200);
    if (existingError) throw existingError;

    // A reporter's own other reports can never count as corroboration for
    // each other — otherwise submitting two reports yourself at a similar
    // price would "verify" both, with no independent confirmation at all.
    const othersOnly = input.userId
      ? (existing ?? []).filter((r) => r.user_id !== input.userId)
      : existing ?? [];

    const evaluation = evaluateReportStatus(
      input.price,
      now,
      othersOnly.map((r) => ({ id: r.id, price: Number(r.price), status: r.status, reportedAt: r.reported_at }))
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
      })
      .select()
      .single();
    if (error) throw error;

    await tryUpgradeMatchingReports(evaluation.upgradeReportIds);

    const totalPoints = await recordPoints({
      userId: input.userId,
      points: pointsAwarded,
      reason,
      priceReportId: data.id,
    });

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
      },
      pointsAwarded,
      totalPoints,
      multiplierApplied,
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

  // Same self-corroboration exclusion as the Supabase branch above.
  const sameItemMarketReports = reports.filter(
    (r) =>
      r.itemId === input.itemId &&
      r.marketId === input.marketId &&
      (!input.userId || r.userId !== input.userId)
  );
  const evaluation = evaluateReportStatus(input.price, now, sameItemMarketReports);

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
    pointsAwarded,
    userId: input.userId,
  };

  const upgraded = reports.map((r) =>
    evaluation.upgradeReportIds.includes(r.id) ? { ...r, status: "verified" as const } : r
  );
  const updated = [newReport, ...upgraded];
  saveMockReports(updated);

  const totalPoints = await recordPoints({ userId: input.userId, points: pointsAwarded, reason });
  return { report: newReport, pointsAwarded, totalPoints, multiplierApplied };
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
}

/**
 * Edits a report's price and re-runs the same daily verification logic
 * used for new reports. The report is also re-attributed to right now
 * (reported_at is bumped) — editing a price is, in effect, re-reporting
 * it today, and today's calendar day is what the whole daily-reset rule
 * keys off of. Both the report being edited AND this user's other reports
 * at this market are excluded from the comparison set (self-corroboration
 * guard, same as reportPrice()).
 */
export async function updateMyReport(input: UpdateReportInput): Promise<UpdateReportResult> {
  const now = new Date().toISOString();

  if (isSupabaseConfigured && supabase) {
    const { data: current, error: currentError } = await supabase
      .from("price_reports")
      .select("item_id, market_id, user_id")
      .eq("id", input.reportId)
      .single();
    if (currentError) throw currentError;
    if (current.user_id !== input.userId) throw new Error("You can only edit your own reports.");

    const { data: existing, error: existingError } = await supabase
      .from("price_reports")
      .select("id, price, status, user_id, reported_at")
      .eq("item_id", current.item_id)
      .eq("market_id", current.market_id)
      .neq("id", input.reportId)
      .order("reported_at", { ascending: false })
      .limit(200);
    if (existingError) throw existingError;

    // Exclude this reporter's own other reports at this market — same
    // self-corroboration guard as reportPrice() above.
    const othersOnly = (existing ?? []).filter((r) => r.user_id !== input.userId);

    const evaluation = evaluateReportStatus(
      input.newPrice,
      now,
      othersOnly.map((r) => ({ id: r.id, price: Number(r.price), status: r.status, reportedAt: r.reported_at }))
    );

    const { data, error } = await supabase
      .from("price_reports")
      .update({ price: input.newPrice, status: evaluation.status, reported_at: now })
      .eq("id", input.reportId)
      .eq("user_id", input.userId)
      .select()
      .single();
    if (error) throw error;

    await tryUpgradeMatchingReports(evaluation.upgradeReportIds);

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
      },
    };
  }

  // Mock/local-dev branch.
  const reports = loadMockReports();
  const target = reports.find((r) => r.id === input.reportId && r.userId === input.userId);
  if (!target) throw new Error("Report not found.");

  const others = reports.filter(
    (r) =>
      r.id !== input.reportId &&
      r.itemId === target.itemId &&
      r.marketId === target.marketId &&
      r.userId !== input.userId
  );
  const evaluation = evaluateReportStatus(input.newPrice, now, others);

  const updated = reports.map((r) => {
    if (r.id === input.reportId) return { ...r, price: input.newPrice, status: evaluation.status, reportedAt: now };
    if (evaluation.upgradeReportIds.includes(r.id)) return { ...r, status: "verified" as const };
    return r;
  });
  saveMockReports(updated);

  const updatedReport = updated.find((r) => r.id === input.reportId)!;
  return { report: updatedReport };
}

export interface DeleteReportResult {
  pointsClawedBack: number;
  totalPoints: number;
}

/**
 * Deletes a report. Points earned from it are only clawed back if the
 * report was NOT verified at the time of deletion — a verified report
 * keeps its points permanently, even after deletion, per product rule.
 *
 * The clawback is recorded as a new, independent negative point_events
 * entry rather than deleting the original one, preserving an audit trail
 * and sidestepping any foreign-key/cascade complications from the report
 * row being deleted out from under it.
 */
export async function deleteMyReport(reportId: string, userId: string): Promise<DeleteReportResult> {
  if (isSupabaseConfigured && supabase) {
    const { data: current, error: currentError } = await supabase
      .from("price_reports")
      .select("status, user_id")
      .eq("id", reportId)
      .single();
    if (currentError) throw currentError;
    if (current.user_id !== userId) throw new Error("You can only delete your own reports.");

    let pointsClawedBack = 0;
    if (current.status !== "verified") {
      const { data: events, error: eventsError } = await supabase
        .from("point_events")
        .select("points")
        .eq("price_report_id", reportId);
      if (eventsError) throw eventsError;
      pointsClawedBack = (events ?? []).reduce((sum, e) => sum + e.points, 0);

      if (pointsClawedBack > 0) {
        await recordPoints({ userId, points: -pointsClawedBack, reason: "report" });
      }
    }

    const { error: deleteError } = await supabase
      .from("price_reports")
      .delete()
      .eq("id", reportId)
      .eq("user_id", userId);
    if (deleteError) throw deleteError;

    const totalPoints = await getTotalPoints(userId);
    return { pointsClawedBack, totalPoints };
  }

  // Mock/local-dev branch.
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