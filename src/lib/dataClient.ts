import { isSupabaseConfigured, supabase } from "./supabaseClient";
import { seedItems, seedMarkets, seedPriceReports } from "../data/seed";
import { addPoints, POINTS_FOR_PHOTO, POINTS_FOR_REPORT } from "./points";
import { evaluateReportStatus } from "./verification";
import type { Item, Market, PriceReport, PriceRowData } from "../types";

const STORAGE_KEY = "palengkescout_reports_v1";

/**
 * Phase 1 scope: plain CRUD, no AI/anomaly logic yet (that's Phase 2).
 * Every new report's status is now decided by evaluateReportStatus() —
 * comparing it against other reports for the same item + market — rather
 * than being hardcoded to "pending".
 *
 * Runs against Supabase when VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY
 * are set. Otherwise falls back to a local mock store seeded with
 * realistic starting data, persisted in localStorage for the demo
 * session, so the app is fully usable with zero setup.
 */

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

/** Maps a Supabase (snake_case) price_reports row + joined market into our camelCase shape. */
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

/** All price rows for one item, joined with market info, newest first. */
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

/**
 * Lowest currently-visible price per item, used for Home screen browse
 * cards ("Tomato — from ₱82/kg"). Includes verified + pending, since
 * this is a lightweight preview, not a trust-bearing figure.
 *
 * Fetches all reports once and groups them in memory, rather than one
 * query per item — with 140+ items in the catalog, a per-item query
 * would mean 140+ round-trips on every Home screen load.
 */
export async function listLowestPrices(): Promise<Record<string, number | null>> {
  const result: Record<string, number | null> = {};

  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from("price_reports")
      .select("item_id, price, status")
      .neq("status", "flagged");
    if (error) throw error;
    for (const row of data ?? []) {
      const current = result[row.item_id];
      const price = Number(row.price);
      result[row.item_id] = current === undefined || current === null ? price : Math.min(current, price);
    }
    return result;
  }

  const reports = loadMockReports().filter((r) => r.status !== "flagged");
  for (const report of reports) {
    const current = result[report.itemId];
    result[report.itemId] =
      current === undefined || current === null ? report.price : Math.min(current, report.price);
  }
  return result;
}

export interface ReportPriceInput {
  itemId: string;
  marketId: string;
  price: number;
  reporterName: string;
  photoFile?: File; // optional — attaching a real photo earns bonus points
}

export interface ReportPriceResult {
  report: PriceReport;
  pointsAwarded: number;
  totalPoints: number;
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
  const pointsAwarded = POINTS_FOR_REPORT + (input.photoFile ? POINTS_FOR_PHOTO : 0);

  if (isSupabaseConfigured && supabase) {
    // Pull recent reports for this exact item + market to evaluate against.
    // NOTE: this client-side check has a small race-condition window if two
    // people submit at the same instant. For production traffic, moving this
    // logic into a Postgres function/trigger would close that gap — happy to
    // draft that SQL separately if you want it.
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

    const totalPoints = addPoints(pointsAwarded);
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
      },
      pointsAwarded,
      totalPoints,
    };
  }

  const reports = loadMockReports();
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
  };

  const upgraded = reports.map((r) =>
    evaluation.upgradeReportIds.includes(r.id) ? { ...r, status: "verified" as const } : r
  );
  const updated = [newReport, ...upgraded];
  saveMockReports(updated);
  const totalPoints = addPoints(pointsAwarded);
  return { report: newReport, pointsAwarded, totalPoints };
}