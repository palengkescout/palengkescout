import { useEffect, useMemo, useState } from "react";
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [itemList, lowest, board] = await Promise.all([
        listItems(),
        listLowestPrices(),
        getLeaderboard("week"),
      ]);
      if (!cancelled) {
        setItems(itemList);
        setLowestPrices(lowest);
        setTopScoutIds(new Set(board.slice(0, 3).map((e) => e.userId)));
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    if (!query.trim()) return items;
    const q = query.trim().toLowerCase();
    return items.filter((i) => i.name.toLowerCase().includes(q) || i.category.toLowerCase().includes(q));
  }, [items, query]);

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
        <div className="relative mb-5">
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

        {loading ? (
          <HomeSkeleton />
        ) : grouped.length === 0 ? (
          <EmptyState
            title="No matching items"
            description="Try a different search, or be the first to add a price report for something new."
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