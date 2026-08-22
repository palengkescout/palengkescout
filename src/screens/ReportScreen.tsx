import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { CheckCircle2, Camera, X, Award, LogIn, Flame } from "lucide-react";
import TopBar from "../components/TopBar";
import Dropdown from "../components/Dropdown";
import { listItems, listMarkets, reportPrice } from "../lib/dataClient";
import { getItemEmoji } from "../lib/categoryIcons";
import { POINTS_FOR_PHOTO, POINTS_FOR_REPORT } from "../lib/points";
import { useAuth } from "../lib/authContext";
import type { Item, Market, PriceStatus } from "../types";

export default function ReportScreen() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, loading: authLoading, openAuthModal } = useAuth();

  const [items, setItems] = useState<Item[]>([]);
  const [markets, setMarkets] = useState<Market[]>([]);
  const [itemId, setItemId] = useState(searchParams.get("item") ?? "");
  const [marketId, setMarketId] = useState("");
  const [price, setPrice] = useState("");
  const [reporterName, setReporterName] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{
    pointsAwarded: number;
    totalPoints: number;
    status: PriceStatus;
    multiplierApplied: boolean;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    (async () => {
      const [itemList, marketList] = await Promise.all([listItems(), listMarkets()]);
      setItems(itemList);
      setMarkets(marketList);
      if (!itemId && itemList.length) setItemId(itemList[0].id);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const itemOptions = useMemo(
    () =>
      items.map((item) => ({
        value: item.id,
        label: `${item.name} (per ${item.unit})`,
        icon: getItemEmoji(item.name, item.category),
      })),
    [items]
  );

  const marketOptions = useMemo(
    () =>
      markets.map((market) => ({
        value: market.id,
        label: market.name,
        description: market.barangay,
      })),
    [markets]
  );

  const selectedItem = items.find((i) => i.id === itemId);
  const priceValue = Number(price);
  const isValidPrice = price.trim() !== "" && !Number.isNaN(priceValue) && priceValue > 0;
  const canSubmit = itemId && marketId && isValidPrice && !submitting;

  function handlePhotoSelect(file: File | null) {
    setPhotoFile(file);
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoPreview(file ? URL.createObjectURL(file) : null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) {
      if (!isValidPrice) setError("Enter a valid price greater than ₱0.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const { report, pointsAwarded, totalPoints, multiplierApplied } = await reportPrice({
        itemId,
        marketId,
        price: priceValue,
        reporterName: reporterName.trim() || "Anonymous",
        photoFile: photoFile ?? undefined,
        userId: user?.id,
      });
      setResult({ pointsAwarded, totalPoints, status: report.status, multiplierApplied });
    } catch {
      setError("Something went wrong saving your report. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  function resetForm() {
    setResult(null);
    setPrice("");
    handlePhotoSelect(null);
  }

  if (!authLoading && !user) {
    return (
      <div className="app-shell bg-cream">
        <TopBar title="Report a Price" subtitle="Help your neighbors shop smarter." />
        <div className="app-content flex flex-col items-center justify-center px-8 text-center">
          <div className="w-16 h-16 rounded-full bg-palengke-green/10 flex items-center justify-center mb-4">
            <LogIn size={26} className="text-palengke-green" strokeWidth={2} />
          </div>
          <p className="font-display text-lg text-ink mb-1.5">Log in to report a price</p>
          <p className="text-ink-soft text-sm max-w-[30ch] mb-6">
            Reporting prices earns you points and builds your contributor profile — log in or create an
            account to continue.
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

  if (result) {
    return (
      <div className="app-shell bg-cream">
        <TopBar title="Report a Price" subtitle="Thank you for contributing." />
        <div className="app-content flex flex-col items-center justify-center px-8 text-center">
          <div className="w-16 h-16 rounded-full bg-fresh-green/10 flex items-center justify-center mb-4">
            <CheckCircle2 size={30} className="text-fresh-green" strokeWidth={2} />
          </div>
          <p className="font-display text-lg text-ink mb-1.5">Price reported!</p>

          {result.status === "verified" && (
            <p className="text-ink-soft text-sm max-w-[30ch] mb-4">
              Your report for {selectedItem?.name ?? "this item"} matched other nearby prices, so it's
              marked <span className="font-medium text-ink">Verified</span> already.
            </p>
          )}
          {result.status === "pending" && (
            <p className="text-ink-soft text-sm max-w-[30ch] mb-4">
              Your report for {selectedItem?.name ?? "this item"} is marked{" "}
              <span className="font-medium text-ink">Unverified</span> until more nearby reports confirm
              it.
            </p>
          )}
          {result.status === "flagged" && (
            <p className="text-ink-soft text-sm max-w-[30ch] mb-4">
              Your report for {selectedItem?.name ?? "this item"} differs a lot from other prices at this
              market, so it's been <span className="font-medium text-ink">flagged for review</span>.
              Thanks for reporting — we'll take a closer look.
            </p>
          )}

          {result.multiplierApplied && (
            <div className="flex items-center gap-1.5 text-xs font-semibold text-palengke-gold-dark bg-palengke-gold/15 rounded-pill px-3 py-1.5 mb-3">
              <Flame size={13} strokeWidth={2.4} />
              1.5x bonus — you were in last week's Top 3!
            </div>
          )}

          <div className="flex items-center gap-2 bg-palengke-gold/15 text-palengke-gold-dark rounded-pill px-4 py-2 mb-6">
            <Award size={18} strokeWidth={2} />
            <span className="text-sm font-semibold">
              +{result.pointsAwarded} points · {result.totalPoints} total
            </span>
          </div>

          <div className="flex gap-3 w-full">
            <button
              onClick={() => navigate(`/item/${itemId}`)}
              className="flex-1 py-3 rounded-pill bg-palengke-green text-white font-medium text-sm min-h-[48px]"
            >
              View prices
            </button>
            <button
              onClick={resetForm}
              className="flex-1 py-3 rounded-pill bg-white shadow-card text-ink font-medium text-sm min-h-[48px]"
            >
              Report another
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell bg-cream">
      <TopBar title="Report a Price" subtitle="Help your neighbors shop smarter." />

      <form onSubmit={handleSubmit} className="app-content px-5 pt-5 pb-8 flex flex-col gap-5">
        <Dropdown
          id="item"
          label="Item"
          value={itemId}
          options={itemOptions}
          onChange={setItemId}
          placeholder="Select an item"
          searchable
          searchPlaceholder="Search items..."
        />

        <Dropdown
          id="market"
          label="Where did you see this price?"
          value={marketId}
          options={marketOptions}
          onChange={setMarketId}
          placeholder="Select a market or store"
        />

        <div>
          <label htmlFor="price" className="block text-sm font-semibold text-ink mb-2">
            Price {selectedItem ? `(per ${selectedItem.unit})` : ""}
          </label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-faint text-[15px]">₱</span>
            <input
              id="price"
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              placeholder="0.00"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="w-full bg-white rounded-card shadow-card pl-9 pr-4 py-3.5 text-[15px] outline-none min-h-[48px]"
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-semibold text-ink">
              Add a photo <span className="text-ink-faint font-normal">(optional)</span>
            </label>
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-palengke-gold-dark">
              <Award size={13} strokeWidth={2.2} />+{POINTS_FOR_PHOTO} pts
            </span>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={(e) => handlePhotoSelect(e.target.files?.[0] ?? null)}
            className="hidden"
          />

          {photoPreview ? (
            <div className="relative w-24 h-24">
              <img src={photoPreview} alt="" className="w-24 h-24 rounded-xl object-cover" />
              <button
                type="button"
                aria-label="Remove photo"
                onClick={() => handlePhotoSelect(null)}
                className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-ink text-white flex items-center justify-center"
              >
                <X size={14} strokeWidth={2.4} />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-24 h-24 rounded-xl border-2 border-dashed border-palengke-green/30 flex flex-col items-center justify-center gap-1 text-palengke-green"
            >
              <Camera size={22} strokeWidth={1.8} />
              <span className="text-[11px] font-medium">Add photo</span>
            </button>
          )}
          <p className="text-ink-faint text-xs mt-2">
            A real photo of the price tag or product helps others trust your report.
          </p>
        </div>

        <div>
          <label htmlFor="name" className="block text-sm font-semibold text-ink mb-2">
            Your name <span className="text-ink-faint font-normal">(optional)</span>
          </label>
          <input
            id="name"
            type="text"
            placeholder="Anonymous"
            value={reporterName}
            onChange={(e) => setReporterName(e.target.value)}
            className="w-full bg-white rounded-card shadow-card px-4 py-3.5 text-[15px] outline-none min-h-[48px]"
          />
          <p className="text-ink-faint text-xs mt-2">
            Adding your name builds your contributor reputation — coming in a later update.
          </p>
        </div>

        {error && (
          <p role="alert" className="text-fresh-red text-sm -mt-1">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={!canSubmit}
          className="mt-1 w-full py-3.5 rounded-pill bg-palengke-green text-white font-semibold text-[15px] min-h-[48px] disabled:opacity-40"
        >
          {submitting ? "Submitting..." : `Submit report · +${POINTS_FOR_REPORT} pts`}
        </button>
      </form>
    </div>
  );
}