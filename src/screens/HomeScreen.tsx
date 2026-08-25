import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import TopBar from "../components/TopBar";
import ItemCard from "../components/ItemCard";
import EmptyState from "../components/EmptyState";
import HomeSkeleton from "../components/HomeSkeleton";
import { listItems, listLowestPrices, type LowestPriceInfo } from "../lib/dataClient";
import { getLeaderboard } from "../lib/leaderboard";
import { useAuth } from "../lib/authContext";
import type { Item } from "../types";

export default function HomeScreen() {
  const navigate = useNavigate();
  const { user, openAuthModal } = useAuth();
  const [items, setItems] = useState<Item[]>([]);
  const [lowestPrices, setLowestPrices] = useState<Record<string, LowestPriceInfo | null>>({});
  const [topScoutIds, setTopScoutIds] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadHome = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [itemList, lowest, board] = await Promise.all([
        listItems(),
        listLowestPrices(),
        getLeaderboard("week"),
      ]);
      setItems(itemList);
      setLowestPrices(lowest);
      setTopScoutIds(new Set(board.slice(0, 3).map((e) => e.userId)));
    } catch {
      setLoadError("Couldn't load items right now. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHome();
  }, [loadHome]);

  const categories = useMemo(() => {
    return Array.from(new Set(items.map((i) => i.category))).sort();
  }, [items]);

  const filtered = useMemo(() => {
    let list = items;
    if (selectedCategory) {
      list = list.filter((i) => i.category === selectedCategory);
    }
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter((i) => i.name.toLowerCase().includes(q) || i.category.toLowerCase().includes(q));
    }
    return list;
  }, [items, query, selectedCategory]);

  const grouped = useMemo(() => {
    const map = new Map<string, Item[]>();
    for (const item of filtered) {
      const list = map.get(item.category) ?? [];
      list.push(item);
      map.set(item.category, list);
    }
    return Array.from(map.entries());
  }, [filtered]);

  function handleReportAction() {
    if (!user) {
      openAuthModal();
      return;
    }
    navigate("/report");
  }

  return (
    <div className="app-shell bg-cream">
      <TopBar showWordmark subtitle="Check before you go." />

      <div className="app-content px-5 pt-4 pb-6">
        <label htmlFor="search" className="sr-only">
          Search for an item
        </label>
        <div className="relative mb-4">
          <svg
            className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
          >
            <circle cx="11" cy="11" r="7" stroke="#8A968D" strokeWidth="2" />
            <path d="m20 20-3.5-3.5" stroke="#8A968D" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <input
            id="search"
            type="text"
            inputMode="search"
            placeholder="Search tomato, onion, rice..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-white rounded-pill shadow-card pl-11 pr-4 py-3.5 text-[15px] placeholder:text-ink-faint outline-none min-h-[48px]"
          />
        </div>

        {!loading && !loadError && categories.length > 0 && (
          <div className="flex gap-2 overflow-x-auto -mx-5 px-5 mb-5" style={{ scrollbarWidth: "none" }}>
            <button
              onClick={() => setSelectedCategory(null)}
              className={`shrink-0 px-3.5 py-2 rounded-pill text-sm font-medium whitespace-nowrap min-h-[36px] ${
                selectedCategory === null
                  ? "bg-palengke-green text-white"
                  : "bg-white text-ink-soft shadow-card"
              }`}
            >
              All
            </button>
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`shrink-0 px-3.5 py-2 rounded-pill text-sm font-medium whitespace-nowrap min-h-[36px] ${
                  selectedCategory === category
                    ? "bg-palengke-green text-white"
                    : "bg-white text-ink-soft shadow-card"
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        )}

        {loading ? (
          <HomeSkeleton />
        ) : loadError ? (
          <EmptyState
            title="Couldn't load items"
            description={loadError}
            actionLabel="Try again"
            onAction={loadHome}
          />
        ) : grouped.length === 0 ? (
          <EmptyState
            title="No matching items"
            description="Try a different search or category, or be the first to add a price report for something new."
            actionLabel="Report a price"
            onAction={handleReportAction}
          />
        ) : (
          <div className="flex flex-col gap-6">
            {grouped.map(([category, categoryItems]) => (
              <section key={category}>
                <h2 className="text-sm font-semibold text-ink-soft mb-2.5 px-0.5">{category}</h2>
                <div className="grid grid-cols-2 gap-3">
                  {categoryItems.map((item) => {
                    const lowest = lowestPrices[item.id] ?? null;
                    const isTopScout = Boolean(lowest?.reporterId && topScoutIds.has(lowest.reporterId));
                    return (
                      <ItemCard
                        key={item.id}
                        item={item}
                        lowestPrice={lowest?.price ?? null}
                        isTopScout={isTopScout}
                      />
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}