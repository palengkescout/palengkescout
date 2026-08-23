import { useEffect, useState } from "react";
import { LogIn, ShieldAlert, Store, Trash2, Plus } from "lucide-react";
import TopBar from "../components/TopBar";
import Dropdown, { type DropdownOption } from "../components/Dropdown";
import LocationPicker from "../components/LocationPicker";
import { useAuth } from "../lib/authContext";
import { listMarkets } from "../lib/dataClient";
import { checkIsAdmin, createMarket, deleteMarket } from "../lib/adminMarkets";
import { marketTypeLabel } from "../lib/format";
import { getMarketTypeIcon } from "../lib/marketIcons";
import type { Market, MarketType } from "../types";

// Order chosen for how common each type is in a typical Metro Manila
// barangay, so the most likely pick sits at the top of the list.
const MARKET_TYPES: MarketType[] = [
  "wet_market",
  "public_market",
  "supermarket",
  "grocery",
  "sari_sari",
  "farmers_market",
];

const TYPE_DESCRIPTIONS: Record<MarketType, string> = {
  wet_market: "A stall or section selling fresh produce, meat, or fish",
  public_market: "The full municipal/city-run market complex",
  supermarket: "Large chain store — SM, Puregold, Robinsons, etc.",
  grocery: "Smaller standalone grocery or mini mart",
  farmers_market: "Direct-from-farm, often a weekend pop-up",
  sari_sari: "Small neighborhood variety store",
};

const TYPE_OPTIONS: DropdownOption[] = MARKET_TYPES.map((type) => ({
  value: type,
  label: marketTypeLabel(type),
  icon: getMarketTypeIcon(type),
}));

// Not linked from BottomNav or anywhere else in the app — reachable only by
// typing this exact URL. Harmless even if someone stumbles onto it: the
// screen itself checks is_admin below, and the database's RLS policies (see
// migration 006) refuse any write from a non-admin account regardless.
export default function AdminMarketsScreen() {
  const { user, loading: authLoading, openAuthModal } = useAuth();
  const [checkingAdmin, setCheckingAdmin] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  const [markets, setMarkets] = useState<Market[]>([]);
  const [loadingMarkets, setLoadingMarkets] = useState(true);

  const [name, setName] = useState("");
  const [barangay, setBarangay] = useState("");
  const [type, setType] = useState<MarketType>("wet_market");
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setCheckingAdmin(false);
      return;
    }
    let cancelled = false;
    checkIsAdmin(user.id)
      .then((result) => {
        if (!cancelled) setIsAdmin(result);
      })
      .finally(() => {
        if (!cancelled) setCheckingAdmin(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    if (!isAdmin) return;
    let cancelled = false;
    (async () => {
      setLoadingMarkets(true);
      const list = await listMarkets();
      if (!cancelled) {
        setMarkets(list);
        setLoadingMarkets(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isAdmin]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !barangay.trim() || lat === null || lng === null) {
      setError("Fill in a name, barangay, and drop a pin on the map.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const created = await createMarket({
        name: name.trim(),
        barangay: barangay.trim(),
        type,
        latitude: lat,
        longitude: lng,
      });
      setMarkets((prev) => [...prev, created]);
      setName("");
      setBarangay("");
      setType("wet_market");
      setLat(null);
      setLng(null);
    } catch (err: any) {
      setError(err?.message ?? "Something went wrong saving this market.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(marketId: string) {
    try {
      await deleteMarket(marketId);
      setMarkets((prev) => prev.filter((m) => m.id !== marketId));
    } catch (err: any) {
      setError(
        err?.message?.toLowerCase().includes("foreign key")
          ? "Can't delete this market — it already has price reports linked to it."
          : err?.message ?? "Couldn't delete this market."
      );
    }
  }

  if (!authLoading && !user) {
    return (
      <div className="app-shell bg-cream">
        <TopBar title="Admin" subtitle="Manage markets" />
        <div className="app-content flex flex-col items-center justify-center px-8 text-center">
          <div className="w-16 h-16 rounded-full bg-palengke-green/10 flex items-center justify-center mb-4">
            <LogIn size={26} className="text-palengke-green" strokeWidth={2} />
          </div>
          <p className="font-display text-lg text-ink mb-1.5">Log in with your admin account</p>
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

  if (!checkingAdmin && user && !isAdmin) {
    return (
      <div className="app-shell bg-cream">
        <TopBar title="Admin" subtitle="Manage markets" />
        <div className="app-content flex flex-col items-center justify-center px-8 text-center">
          <div className="w-16 h-16 rounded-full bg-fresh-red/10 flex items-center justify-center mb-4">
            <ShieldAlert size={26} className="text-fresh-red" strokeWidth={2} />
          </div>
          <p className="font-display text-lg text-ink mb-1.5">Not authorized</p>
          <p className="text-ink-soft text-sm max-w-[30ch]">
            This account doesn't have admin access. Log in with a designated admin account instead.
          </p>
        </div>
      </div>
    );
  }

  const selectedTypeDescription = TYPE_DESCRIPTIONS[type];

  return (
    <div className="app-shell bg-cream">
      <TopBar title="Admin" subtitle="Manage markets" />

      <div className="app-content px-5 pt-4 pb-8 flex flex-col gap-5">
        <form onSubmit={handleSubmit} className="bg-white rounded-card shadow-card p-4 flex flex-col gap-3.5">
          <p className="font-semibold text-ink text-sm">Add a new market</p>

          <div>
            <label htmlFor="market-name" className="block text-sm font-semibold text-ink mb-1.5">
              Market name
            </label>
            <input
              id="market-name"
              type="text"
              placeholder="e.g. Poblacion Public Market"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-cream-soft rounded-card px-4 py-3 text-[15px] outline-none min-h-[46px]"
            />
          </div>

          <div>
            <label htmlFor="market-barangay" className="block text-sm font-semibold text-ink mb-1.5">
              Barangay
            </label>
            <input
              id="market-barangay"
              type="text"
              placeholder="e.g. Poblacion"
              value={barangay}
              onChange={(e) => setBarangay(e.target.value)}
              className="w-full bg-cream-soft rounded-card px-4 py-3 text-[15px] outline-none min-h-[46px]"
            />
          </div>

          <div>
            <Dropdown
              id="market-type"
              label="Market type"
              value={type}
              options={TYPE_OPTIONS}
              onChange={(v) => setType(v as MarketType)}
              placeholder="Market type"
            />
            {selectedTypeDescription && (
              <p className="text-ink-faint text-xs mt-1.5">{selectedTypeDescription}</p>
            )}
          </div>

          <div>
            <p className="text-sm font-semibold text-ink mb-1.5">Pin the exact location</p>
            <LocationPicker
              latitude={lat}
              longitude={lng}
              onChange={(newLat, newLng) => {
                setLat(newLat);
                setLng(newLng);
              }}
            />
          </div>

          {error && (
            <p role="alert" className="text-fresh-red text-sm">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="flex items-center justify-center gap-2 w-full py-3.5 rounded-pill bg-palengke-green text-white font-semibold text-[15px] min-h-[48px] disabled:opacity-50"
          >
            <Plus size={16} strokeWidth={2.4} />
            {submitting ? "Saving..." : "Add market"}
          </button>
        </form>

        <div className="bg-white rounded-card shadow-card p-4">
          <div className="flex items-center gap-1.5 mb-3">
            <Store size={16} className="text-palengke-green" strokeWidth={2.2} />
            <p className="font-semibold text-ink text-sm">Existing markets ({markets.length})</p>
          </div>

          {loadingMarkets ? (
            <p className="text-ink-faint text-xs">Loading...</p>
          ) : markets.length === 0 ? (
            <p className="text-ink-faint text-xs py-2">No markets added yet.</p>
          ) : (
            <ul className="flex flex-col gap-1">
              {markets.map((m) => {
                const TypeIcon = getMarketTypeIcon(m.type);
                return (
                  <li
                    key={m.id}
                    className="flex items-center gap-3 py-2.5 border-b border-black/5 last:border-0"
                  >
                    <div className="w-9 h-9 rounded-full bg-cream-soft flex items-center justify-center shrink-0">
                      <TypeIcon size={16} className="text-palengke-green" strokeWidth={2} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-ink truncate">{m.name}</p>
                      <p className="text-ink-faint text-xs">
                        {m.barangay} · {marketTypeLabel(m.type)}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDelete(m.id)}
                      aria-label={`Delete ${m.name}`}
                      className="w-11 h-11 rounded-full flex items-center justify-center shrink-0 active:bg-fresh-red/10"
                    >
                      <Trash2 size={16} className="text-fresh-red" strokeWidth={2} />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}