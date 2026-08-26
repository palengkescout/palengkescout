import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  CirclePlus,
  Award,
  ListPlus,
  Check,
  MapPin,
  Sparkles,
  Navigation,
} from "lucide-react";
import PriceRow from "../components/PriceRow";
import PriceHistoryChart from "../components/PriceHistoryChart";
import EmptyState from "../components/EmptyState";
import RouteMap from "../components/RouteMap";
import { getItem, listPricesForItem } from "../lib/dataClient";
import { getItemEmoji } from "../lib/categoryIcons";
import { POINTS_FOR_REPORT } from "../lib/points";
import { useAuth } from "../lib/authContext";
import { addToShoppingList, isItemInList, getUserLocation, type SavedLocation } from "../lib/shoppingList";
import { haversineDistanceKm } from "../lib/geo";
import { computeSmartScore } from "../lib/smartScore";
import type { Item, PriceRowData } from "../types";

type SortMode = "price" | "recent" | "smart";

interface RowWithDistance {
  row: PriceRowData;
  distanceKm: number | null;
}

function rankBySmartScore(
  candidates: RowWithDistance[],
  hasLocation: boolean
): { sorted: RowWithDistance[]; topId: string | null } {
  if (!hasLocation || candidates.length < 2) {
    return { sorted: candidates, topId: null };
  }
  const prices = candidates.map((c) => c.row.price);
  const distances = candidates.filter((c) => c.distanceKm !== null).map((c) => c.distanceKm as number);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const minDist = distances.length ? Math.min(...distances) : 0;
  const maxDist = distances.length ? Math.max(...distances) : 0;

  const scored = candidates.map((c) => ({
    ...c,
    score: computeSmartScore(c.row.price, minPrice, maxPrice, c.distanceKm, minDist, maxDist),
  }));
  scored.sort((a, b) => a.score - b.score);
  return { sorted: scored, topId: scored[0]?.row.id ?? null };
}

export default function ItemPricesScreen() {
  const { itemId } = useParams<{ itemId: string }>();
  const navigate = useNavigate();
  const { user, openAuthModal } = useAuth();
  const [item, setItem] = useState<Item | null>(null);
  const [rows, setRows] = useState<PriceRowData[]>([]);
  const [sort, setSort] = useState<SortMode>("price");
  const [loading, setLoading] = useState(true);
  const [inList, setInList] = useState(false);
  const [addingToList, setAddingToList] = useState(false);
  const [location, setLocation] = useState<SavedLocation | null>(null);
  const [showRoute, setShowRoute] = useState(false);

  useEffect(() => {
    if (!itemId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const [foundItem, priceRows] = await Promise.all([getItem(itemId), listPricesForItem(itemId)]);
      if (!cancelled) {
        setItem(foundItem ?? null);
        setRows(priceRows);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [itemId]);

  useEffect(() => {
    if (!user || !itemId) return;
    isItemInList(user.id, itemId).then(setInList);
  }, [user, itemId]);

  useEffect(() => {
    if (!user) {
      setLocation(null);
      return;
    }
    let cancelled = false;
    getUserLocation(user.id)
      .then((loc) => {
        if (!cancelled) setLocation(loc);
      })
      .catch(() => {
        if (!cancelled) setLocation(null);
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  // Route toggle resets whenever the underlying item/sort/location context
  // changes, so a stale route panel never lingers open for a different
  // Smart Pick market than the one it was originally opened for.
  useEffect(() => {
    setShowRoute(false);
  }, [itemId, sort, location]);

  const rowsWithDistance = useMemo<RowWithDistance[]>(
    () =>
      rows.map((row) => ({
        row,
        distanceKm: location
          ? haversineDistanceKm(location.lat, location.lng, row.market.latitude, row.market.longitude)
          : null,
      })),
    [rows, location]
  );

  const nonFlagged = useMemo(
    () => rowsWithDistance.filter((r) => r.row.status !== "flagged"),
    [rowsWithDistance]
  );
  const flagged = useMemo(() => rowsWithDistance.filter((r) => r.row.status === "flagged"), [rowsWithDistance]);
  const { sorted: smartRankedNonFlagged, topId: smartPickId } = useMemo(
    () => rankBySmartScore(nonFlagged, location !== null),
    [nonFlagged, location]
  );

  const sortedRows = useMemo<RowWithDistance[]>(() => {
    if (sort === "smart") {
      return [...smartRankedNonFlagged, ...[...flagged].sort((a, b) => a.row.price - b.row.price)];
    }
    if (sort === "recent") {
      return [...rowsWithDistance].sort(
        (a, b) => new Date(b.row.reportedAt).getTime() - new Date(a.row.reportedAt).getTime()
      );
    }
    return [...rowsWithDistance].sort((a, b) => a.row.price - b.row.price);
  }, [sort, rowsWithDistance, smartRankedNonFlagged, flagged]);

  const itemEmoji = getItemEmoji(item?.name ?? "", item?.category ?? "");

  function goToReport() {
    if (!user) {
      openAuthModal();
      return;
    }
    navigate(`/report?item=${itemId}`);
  }

  async function handleAddToList() {
    if (!user) {
      openAuthModal();
      return;
    }
    if (!itemId || inList || addingToList) return;
    setAddingToList(true);
    try {
      await addToShoppingList(user.id, itemId);
      setInList(true);
    } finally {
      setAddingToList(false);
    }
  }

  const sortOptions: { mode: SortMode; label: string }[] = [
    { mode: "price", label: "Lowest price" },
    { mode: "recent", label: "Most recent" },
    ...(location ? [{ mode: "smart" as SortMode, label: "Smart Pick" }] : []),
  ];

  return (
    <div className="app-shell bg-cream">
      <header
        className="shrink-0 bg-palengke-green px-5 pt-3 pb-5 rounded-b-[28px] shadow-card"
        style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top))" }}
      >
        <button
          onClick={() => navigate(-1)}
          aria-label="Back"
          className="w-9 h-9 -ml-2 mb-2 flex items-center justify-center rounded-full active:bg-white/10"
        >
          <ArrowLeft size={20} className="text-white" strokeWidth={2.2} />
        </button>
        <div className="flex items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-11 h-11 rounded-full bg-white/15 flex items-center justify-center shrink-0">
              <span className="text-[22px] leading-none" role="img" aria-label={item?.name ?? ""}>
                {itemEmoji}
              </span>
            </div>
            <div className="min-w-0">
              <h1 className="font-display text-white text-xl leading-tight truncate">
                {item?.name ?? "Loading..."}
              </h1>
              {item && <p className="text-cream/70 text-xs mt-0.5">Prices reported per {item.unit}</p>}
            </div>
          </div>

          {item && (
            <button
              onClick={handleAddToList}
              disabled={addingToList}
              aria-label={inList ? "Already in your list" : "Add to my list"}
              className={`shrink-0 flex items-center gap-1.5 rounded-pill px-3 py-1.5 text-xs font-semibold min-h-[32px] ${
                inList ? "bg-white/20 text-white" : "bg-white text-palengke-green"
              }`}
            >
              {inList ? <Check size={13} strokeWidth={2.4} /> : <ListPlus size={13} strokeWidth={2.4} />}
              {inList ? "In list" : "Add to list"}
            </button>
          )}
        </div>
      </header>

      <div className="app-content px-5 pt-4 pb-6">
        {!loading && rows.length > 0 && <PriceHistoryChart rows={rows} />}

        {!loading && rows.length > 0 && (
          <div className="mb-4">
            <div className="flex bg-cream-soft rounded-pill p-1">
              {sortOptions.map(({ mode, label }) => (
                <button
                  key={mode}
                  onClick={() => setSort(mode)}
                  className={`flex-1 py-2 rounded-pill text-[13px] font-semibold transition-colors min-h-[36px] ${
                    sort === mode ? "bg-white text-ink shadow-sm" : "text-ink-faint"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {!location && (
              <button
                onClick={() => navigate("/profile")}
                className="flex items-center gap-1.5 text-xs font-medium text-palengke-green mt-2.5"
              >
                <MapPin size={13} strokeWidth={2.2} />
                Set location for distance
              </button>
            )}
          </div>
        )}

        {loading ? (
          <div className="flex flex-col gap-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-[92px] rounded-card bg-white/60 animate-pulse" />
            ))}
          </div>
        ) : sortedRows.length === 0 ? (
          <EmptyState
            title="No recent reports yet"
            description="Be the first to report a price for this item near you."
            actionLabel="Report a price"
            onAction={goToReport}
          />
        ) : (
          <div className="flex flex-col gap-4">
            {sortedRows.map(({ row, distanceKm }) => {
              const isSmartPick = row.id === smartPickId;
              return (
                <div key={row.id} className="flex flex-col gap-1.5">
                  {isSmartPick && (
                    <div className="flex items-center justify-between gap-2 ml-1">
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-white bg-palengke-green rounded-pill px-2.5 py-1">
                        <Sparkles size={11} strokeWidth={2.4} />
                        Recommended option
                      </span>
                      {location && (
                        <button
                          onClick={() => setShowRoute((v) => !v)}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-palengke-green"
                        >
                          <Navigation size={12} strokeWidth={2.4} />
                          {showRoute ? "Hide route" : "Show route"}
                        </button>
                      )}
                    </div>
                  )}
                  <PriceRow row={row} />
                  {distanceKm !== null && (
                    <p className="text-ink-faint text-[11px] pl-3.5">{distanceKm.toFixed(1)} km from you</p>
                  )}
                  {isSmartPick && showRoute && location && (
                    <div className="mt-1">
                      <RouteMap
                        fromLat={location.lat}
                        fromLng={location.lng}
                        toLat={row.market.latitude}
                        toLng={row.market.longitude}
                        marketName={row.market.name}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {!loading && rows.length > 0 && (
          <button
            onClick={goToReport}
            className="mt-5 flex items-center justify-center gap-2 w-full py-3.5 rounded-pill border-2 border-dashed border-palengke-green/30 text-palengke-green font-medium text-sm min-h-[48px]"
          >
            <CirclePlus size={18} strokeWidth={2} />
            Report a price here
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-palengke-gold-dark bg-palengke-gold/15 rounded-pill px-2 py-0.5 ml-1">
              <Award size={12} strokeWidth={2.4} />+{POINTS_FOR_REPORT}
            </span>
          </button>
        )}
      </div>
    </div>
  );
}