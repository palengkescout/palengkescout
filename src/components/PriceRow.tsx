import { useState } from "react";
import { Store, Flag } from "lucide-react";
import type { PriceRowData } from "../types";
import { formatPeso, marketTypeLabel } from "../lib/format";
import FreshnessBadge from "./FreshnessBadge";
import StatusBadge from "./StatusBadge";
import { useAuth } from "../lib/authContext";
import { flagPriceReport } from "../lib/dataClient";

export default function PriceRow({ row }: { row: PriceRowData }) {
  const { user, openAuthModal } = useAuth();
  const [flagged, setFlagged] = useState(false);
  const [flagging, setFlagging] = useState(false);

  const isOwnReport = user?.id != null && row.userId === user.id;

  async function handleFlag() {
    if (!user) {
      openAuthModal();
      return;
    }
    if (flagged || flagging) return;
    setFlagging(true);
    try {
      await flagPriceReport(row.id, user.id);
      setFlagged(true);
    } catch (err) {
      console.error("Could not flag report:", err);
    } finally {
      setFlagging(false);
    }
  }

  return (
    <div className="bg-white rounded-card shadow-card p-3.5 flex items-start">
      <div className="w-14 h-14 shrink-0 mr-3 rounded-xl overflow-hidden bg-cream-soft flex items-center justify-center">
        {row.photoUrl ? (
          <img src={row.photoUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          <Store size={20} className="text-ink-faint" strokeWidth={1.8} />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="font-semibold text-ink leading-snug line-clamp-2">{row.market.name}</p>

        {row.productName && (
          <p className="text-ink-soft text-[13px] font-medium truncate mt-0.5">{row.productName}</p>
        )}

        <p className="text-ink-faint text-xs mt-0.5 truncate">
          {marketTypeLabel(row.market.type)} · {row.market.barangay}
        </p>

        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center flex-wrap min-w-0">
            <div className="mr-1.5">
              <FreshnessBadge reportedAt={row.reportedAt} />
            </div>
            <StatusBadge status={row.status} />
          </div>

          <div className="flex items-center shrink-0">
            <p className="text-ink-faint text-[11px] truncate max-w-[80px] mr-0.5">by {row.reporterName}</p>
            {!isOwnReport && (
              <button
                type="button"
                onClick={handleFlag}
                disabled={flagging || flagged}
                aria-label={flagged ? "Reported" : "Report this price"}
                className="w-6 h-6 -mr-1 rounded-full flex items-center justify-center active:bg-cream-soft"
              >
                <Flag
                  size={12}
                  strokeWidth={2.2}
                  className={flagged ? "text-fresh-red" : "text-ink-faint"}
                  fill={flagged ? "currentColor" : "none"}
                />
              </button>
            )}
          </div>
        </div>
      </div>

      <p className="font-display text-xl text-palengke-green shrink-0 ml-3">
        {formatPeso(row.price)}
      </p>
    </div>
  );
}