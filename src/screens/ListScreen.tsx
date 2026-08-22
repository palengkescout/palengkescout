import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { LogIn, MapPin, Minus, Plus, Trash2, Trophy, Sparkles } from "lucide-react";
import TopBar from "../components/TopBar";
import Dropdown from "../components/Dropdown";
import EmptyState from "../components/EmptyState";
import { useAuth } from "../lib/authContext";
import { listMarkets } from "../lib/dataClient";
import {
  listMyShoppingList,
  removeFromShoppingList,
  updateShoppingListQuantity,
  getUserBarangay,
  setUserBarangay,
  type ShoppingListRow,
} from "../lib/shoppingList";
import { getMarketRecommendation, type RecommendationResult } from "../lib/marketRecommendation";
import { getItemEmoji } from "../lib/categoryIcons";
import { formatPeso } from "../lib/format";
import type { Market } from "../types";

export default function ListScreen() {
  const navigate = useNavigate();
  const { user, loading: authLoading, openAuthModal } = useAuth();

  const [rows, setRows] = useState<ShoppingListRow[]>([]);
  const [markets, setMarkets] = useState<Market[]>([]);
  const [barangay, setBarangay] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [recommendation, setRecommendation] = useState<RecommendationResult | null>(null);
  const [computing, setComputing] = useState(false);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const [listRows, marketList, savedBarangay] = await Promise.all([
        listMyShoppingList(user.id),
        listMarkets(),
        getUserBarangay(user.id),
      ]);
      if (!cancelled) {
        setRows(listRows);
        setMarkets(marketList);
        setBarangay(savedBarangay ?? "");
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const barangayOptions = useMemo(() => {
    const unique = Array.from(new Set(markets.map((m) => m.barangay)));
    return unique.map((b) => ({ value: b, label: b }));
  }, [markets]);

  async function handleBarangayChange(value: string) {
    setBarangay(value);
    setRecommendation(null);
    if (user) await setUserBarangay(user.id, value);
  }

  async function handleRemove(rowId: string) {
    await removeFromShoppingList(rowId);
    setRows((prev) => prev.filter((r) => r.id !== rowId));
    setRecommendation(null);
  }

  async function handleQuantity(rowId: string, delta: number) {
    const row = rows.find((r) => r.id === rowId);
    if (!row) return;
    const nextQuantity = Math.max(1, row.quantity + delta);
    setRows((prev) => prev.map((r) => (r.id === rowId ? { ...r, quantity: nextQuantity } : r)));
    await updateShoppingListQuantity(rowId, nextQuantity);
    setRecommendation(null);
  }

  async function handleFindBestMarket() {
    if (!barangay) return;
    setComputing(true);
    try {
      const result = await getMarketRecommendation(rows, markets, barangay);
      setRecommendation(result);
    } finally {
      setComputing(false);
    }
  }

  if (!authLoading && !user) {
    return (
      <div className="app-shell bg-cream">
        <TopBar title="My List" subtitle="Compare a full basket across markets." />
        <div className="app-content flex flex-col items-center justify-center px-8 text-center">
          <div className="w-16 h-16 rounded-full bg-palengke-green/10 flex items-center justify-center mb-4">
            <LogIn size={26} className="text-palengke-green" strokeWidth={2} />
          </div>
          <p className="font-display text-lg text-ink mb-1.5">Log in to build your list</p>
          <p className="text-ink-soft text-sm max-w-[30ch] mb-6">
            Save items you shop for regularly and find the market with the best overall deal.
          </p>
          <button
            onClick={openAuthModal}
            className="w-full py-3.5 rounded-pill bg-palengke-green text-white font-semibold text-[15px] min-h-[48px]"
          >
            Log in / Sign up
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell bg-cream">
      <TopBar title="My List" subtitle="Compare a full basket across markets." />

      <div className="app-content px-5 pt-4 pb-8 flex flex-col gap-5">
        <div className="bg-white rounded-card shadow-card p-4">
          <div className="flex items-center gap-1.5 mb-2">
            <MapPin size={15} className="text-palengke-green" strokeWidth={2.2} />
            <p className="text-sm font-semibold text-ink">Your location</p>
          </div>
          <Dropdown
            value={barangay}
            options={barangayOptions}
            onChange={handleBarangayChange}
            placeholder="Select your barangay"
          />
          <p className="text-ink-faint text-xs mt-2">
            We use this to estimate which market is closest — no GPS needed.
          </p>
        </div>

        {loading ? (
          <div className="flex flex-col gap-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-[72px] rounded-card bg-white/60 animate-pulse" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <EmptyState
            title="Your list is empty"
            description='Open any item&apos;s price page and tap "Add to my list" to start building your basket.'
            actionLabel="Browse items"
            onAction={() => navigate("/")}
          />
        ) : (
          <>
            <div className="flex flex-col gap-2.5">
              {rows.map((row) => (
                <div key={row.id} className="bg-white rounded-card shadow-card p-3 flex items-center gap-3">
                  <span className="text-xl leading-none" role="img" aria-label={row.item.name}>
                    {getItemEmoji(row.item.name, row.item.category)}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-ink text-sm truncate">{row.item.name}</p>
                    <p className="text-ink-faint text-xs">per {row.item.unit}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleQuantity(row.id, -1)}
                      aria-label="Decrease quantity"
                      className="w-7 h-7 rounded-full bg-cream-soft flex items-center justify-center"
                    >
                      <Minus size={14} className="text-ink-soft" strokeWidth={2.2} />
                    </button>
                    <span className="text-sm font-semibold text-ink w-5 text-center">{row.quantity}</span>
                    <button
                      onClick={() => handleQuantity(row.id, 1)}
                      aria-label="Increase quantity"
                      className="w-7 h-7 rounded-full bg-cream-soft flex items-center justify-center"
                    >
                      <Plus size={14} className="text-ink-soft" strokeWidth={2.2} />
                    </button>
                  </div>
                  <button
                    onClick={() => handleRemove(row.id)}
                    aria-label={`Remove ${row.item.name}`}
                    className="w-8 h-8 rounded-full flex items-center justify-center active:bg-fresh-red/10"
                  >
                    <Trash2 size={16} className="text-fresh-red" strokeWidth={2} />
                  </button>
                </div>
              ))}
            </div>

            <button
              onClick={handleFindBestMarket}
              disabled={!barangay || computing}
              className="w-full py-3.5 rounded-pill bg-palengke-green text-white font-semibold text-[15px] min-h-[48px] disabled:opacity-40"
            >
              {computing ? "Comparing markets..." : "Find the best market for this list"}
            </button>

            {recommendation && recommendation.best && (
              <div className="bg-white rounded-card shadow-card p-4">
                <div className="flex items-center gap-1.5 mb-3">
                  <Trophy size={16} className="text-palengke-gold-dark" strokeWidth={2.2} />
                  <p className="font-semibold text-ink text-sm">Best overall pick</p>
                </div>

                <p className="font-display text-lg text-ink mb-0.5">{recommendation.best.market.name}</p>
                <p className="text-ink-faint text-xs mb-3">{recommendation.best.market.barangay}</p>

                <div className="flex items-center gap-4 mb-3">
                  <div>
                    <p className="text-ink-faint text-[11px]">Estimated total</p>
                    <p className="font-display text-palengke-green text-base">
                      {formatPeso(recommendation.best.totalCost)}
                    </p>
                  </div>
                  {recommendation.best.distanceKm !== null && (
                    <div>
                      <p className="text-ink-faint text-[11px]">Distance</p>
                      <p className="font-display text-ink text-base">
                        {recommendation.best.distanceKm.toFixed(1)} km
                      </p>
                    </div>
                  )}
                  <div>
                    <p className="text-ink-faint text-[11px]">Items found</p>
                    <p className="font-display text-ink text-base">
                      {recommendation.best.itemsFound}/{rows.length}
                    </p>
                  </div>
                </div>

                {recommendation.aiExplanation && (
                  <div className="bg-cream-soft rounded-xl p-3 mb-3">
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-palengke-gold-dark bg-palengke-gold/15 rounded-pill px-2 py-0.5 mb-2">
                      <Sparkles size={10} strokeWidth={2.6} />
                      AI Suggestion
                    </span>
                    <p className="text-ink-soft text-xs leading-relaxed">{recommendation.aiExplanation}</p>
                  </div>
                )}

                {recommendation.ranked.length > 1 && (
                  <div className="pt-3 border-t border-black/5">
                    <p className="text-ink-faint text-[11px] font-semibold mb-2">Other options</p>
                    <ul className="flex flex-col gap-1.5">
                      {recommendation.ranked.slice(1, 4).map((r) => (
                        <li key={r.market.id} className="flex items-center justify-between text-xs">
                          <span className="text-ink-soft truncate">{r.market.name}</span>
                          <span className="text-ink-faint shrink-0 ml-2">
                            {formatPeso(r.totalCost)}
                            {r.distanceKm !== null && ` · ${r.distanceKm.toFixed(1)}km`}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {recommendation && !recommendation.best && (
              <p className="text-ink-faint text-xs text-center py-2">
                No market has a verified price for any item on your list yet.
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}