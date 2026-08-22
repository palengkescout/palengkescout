import { Link } from "react-router-dom";
import { Award } from "lucide-react";
import type { Item } from "../types";
import { formatPeso } from "../lib/format";
import { getItemEmoji } from "../lib/categoryIcons";
import { POINTS_FOR_REPORT } from "../lib/points";

interface ItemCardProps {
  item: Item;
  lowestPrice: number | null;
}

export default function ItemCard({ item, lowestPrice }: ItemCardProps) {
  const emoji = getItemEmoji(item.name, item.category);
  return (
    <Link
      to={`/item/${item.id}`}
      className="bg-white rounded-card shadow-card p-3.5 flex flex-col gap-2 active:scale-[0.97] transition-transform"
    >
      <div className="w-11 h-11 rounded-full bg-cream-soft flex items-center justify-center">
        <span className="text-[22px] leading-none" role="img" aria-label={item.name}>
          {emoji}
        </span>
      </div>
      <div>
        <p className="font-semibold text-ink text-sm leading-tight">{item.name}</p>
        <p className="text-ink-faint text-xs">per {item.unit}</p>
      </div>
      <div className="flex items-center justify-between mt-auto gap-1">
        <p className="font-display text-palengke-green text-base">
          {lowestPrice !== null ? `from ${formatPeso(lowestPrice)}` : "No reports yet"}
        </p>
        <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-palengke-gold-dark bg-palengke-gold/15 rounded-pill px-1.5 py-0.5 shrink-0">
          <Award size={10} strokeWidth={2.6} />+{POINTS_FOR_REPORT}
        </span>
      </div>
    </Link>
  );
}