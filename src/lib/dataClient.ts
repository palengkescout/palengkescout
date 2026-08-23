import { isSupabaseConfigured, supabase } from "./supabaseClient";
import { seedItems, seedMarkets, seedPriceReports } from "../data/seed";
import { recordPoints, POINTS_FOR_PHOTO, POINTS_FOR_REPORT } from "./points";
import { evaluateReportStatus } from "./verification";
import { isEligibleForMultiplier } from "./leaderboard";
import { enforceReportCooldown } from "./rateLimit";
import type { Item, Market, PriceReport, PriceRowData } from "../types";

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
      .select("id, price, status")
      .eq("item_id", input.itemId)
      .eq("market_id", input.marketId)
      .order("reported_at", { ascending: false })
      .limit(50);
    if (existingError) throw existingError;

    const evaluation = evaluateReportStatus(
      input.price,
      (existing ?? []).map((r) => ({ id: r.id, price: Number(r.price), status: r.status }))
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

    if (evaluation.upgradeReportIds.length > 0) {
      const { error: upgradeError } = await supabase
        .from("price_reports")
        .update({ status: "verified" })
        .in("id", evaluation.upgradeReportIds);
      if (upgradeError) throw upgradeError;
    }

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

  const sameItemMarketReports = reports.filter(
    (r) => r.itemId === input.itemId && r.marketId === input.marketId
  );
  const evaluation = evaluateReportStatus(input.price, sameItemMarketReports);

  const photoUrl = input.photoFile ? await fileToDataUrl(input.photoFile) : undefined;
  const newReport: PriceReport = {
    id: `pr-${Date.now()}`,
    itemId: input.itemId,
    marketId: input.marketId,
    price: input.price,
    status: evaluation.status,
    reportedAt: new Date().toISOString(),
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