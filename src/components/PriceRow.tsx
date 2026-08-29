import { Store } from "lucide-react";
import type { PriceRowData } from "../types";
import { formatPeso, marketTypeLabel } from "../lib/format";
import FreshnessBadge from "./FreshnessBadge";
import StatusBadge from "./StatusBadge";

export default function PriceRow({ row }: { row: PriceRowData }) {
  return (
    <div className="bg-white rounded-card shadow-card p-3.5 flex items-center gap-3">
      {/* Square photo container — shows the reporter's photo if they added one,
          otherwise a neutral placeholder. Photos earn the reporter bonus points. */}
      <div className="w-14 h-14 shrink-0 rounded-xl overflow-hidden bg-cream-soft flex items-center justify-center">
        {row.photoUrl ? (
          <img src={row.photoUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          <Store size={20} className="text-ink-faint" strokeWidth={1.8} />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="font-semibold text-ink truncate">{row.market.name}</p>

        {/* Product name — the specific brand/variant this price is for.
            Sits directly under the market name since it's the most
            report-specific detail; weight (not color) sets it apart from
            the market metadata line below. */}
        {row.productName && (
          <p className="text-ink-soft text-[13px] font-medium truncate mt-0.5">{row.productName}</p>
        )}

        <p className="text-ink-faint text-xs mt-0.5 truncate">
          {marketTypeLabel(row.market.type)} · {row.market.barangay}
        </p>

        <div className="flex items-center justify-between gap-2 mt-2">
          <div className="flex items-center gap-1.5 flex-wrap min-w-0">
            <FreshnessBadge reportedAt={row.reportedAt} />
            <StatusBadge status={row.status} />
          </div>

          {/* Reporter attribution — lowest priority in the hierarchy, so it
              stays small and muted rather than competing with the badges. */}
          <p className="text-ink-faint text-[11px] truncate shrink-0 max-w-[38%]">
            by {row.reporterName}
          </p>
        </div>
      </div>

      <p className="font-display text-xl text-palengke-green shrink-0">
        {formatPeso(row.price)}
      </p>
    </div>
  );
}