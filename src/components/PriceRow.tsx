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
        <p className="text-ink-faint text-xs mt-0.5">
          {marketTypeLabel(row.market.type)} · {row.market.barangay}
        </p>
        <div className="flex items-center gap-1.5 mt-2 flex-wrap">
          <FreshnessBadge reportedAt={row.reportedAt} />
          <StatusBadge status={row.status} />
        </div>
      </div>

      <p className="font-display text-xl text-palengke-green shrink-0">
        {formatPeso(row.price)}
      </p>
    </div>
  );
}