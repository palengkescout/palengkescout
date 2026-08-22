import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, CirclePlus, Award } from "lucide-react";
import PriceRow from "../components/PriceRow";
import EmptyState from "../components/EmptyState";
import { getItem, listPricesForItem } from "../lib/dataClient";
import { getItemEmoji } from "../lib/categoryIcons";
import { POINTS_FOR_REPORT } from "../lib/points";
import type { Item, PriceRowData } from "../types";

type SortMode = "price" | "recent";

export default function ItemPricesScreen() {
  const { itemId } = useParams<{ itemId: string }>();
  const navigate = useNavigate();
  const [item, setItem] = useState<Item | null>(null);
  const [rows, setRows] = useState<PriceRowData[]>([]);
  const [sort, setSort] = useState<SortMode>("price");
  const [loading, setLoading] = useState(true);

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

  const sortedRows = [...rows].sort((a, b) => {
    if (sort === "price") return a.price - b.price;
    return new Date(b.reportedAt).getTime() - new Date(a.reportedAt).getTime();
  });

  const itemEmoji = getItemEmoji(item?.name ?? "", item?.category ?? "");

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
        <div className="flex items-center gap-2.5">
          <div className="w-11 h-11 rounded-full bg-white/15 flex items-center justify-center shrink-0">
            <span className="text-[22px] leading-none" role="img" aria-label={item?.name ?? ""}>
              {itemEmoji}
            </span>
          </div>
          <div>
            <h1 className="font-display text-white text-xl leading-tight">{item?.name ?? "Loading..."}</h1>
            {item && <p className="text-cream/70 text-xs mt-0.5">Prices reported per {item.unit}</p>}
          </div>
        </div>
      </header>

      <div className="app-content px-5 pt-4 pb-6">
        {!loading && rows.length > 0 && (
          <div className="flex gap-2 mb-4">
            {(["price", "recent"] as SortMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => setSort(mode)}
                className={`px-3.5 py-2 rounded-pill text-sm font-medium min-h-[36px] ${
                  sort === mode ? "bg-palengke-green text-white" : "bg-white text-ink-soft shadow-card"
                }`}
              >
                {mode === "price" ? "Lowest price" : "Most recent"}
              </button>
            ))}
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
            onAction={() => navigate(`/report?item=${itemId}`)}
          />
        ) : (
          <div className="flex flex-col gap-3">
            {sortedRows.map((row) => (
              <PriceRow key={row.id} row={row} />
            ))}
          </div>
        )}

        {!loading && rows.length > 0 && (
          <Link
            to={`/report?item=${itemId}`}
            className="mt-5 flex items-center justify-center gap-2 w-full py-3.5 rounded-pill border-2 border-dashed border-palengke-green/30 text-palengke-green font-medium text-sm min-h-[48px]"
          >
            <CirclePlus size={18} strokeWidth={2} />
            Report a price here
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-palengke-gold-dark bg-palengke-gold/15 rounded-pill px-2 py-0.5 ml-1">
              <Award size={12} strokeWidth={2.4} />+{POINTS_FOR_REPORT}
            </span>
          </Link>
        )}
      </div>
    </div>
  );
}