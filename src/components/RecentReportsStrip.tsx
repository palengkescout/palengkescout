import { Link } from "react-router-dom";
import type { RecentReportInfo } from "../lib/dataClient";
import { getItemEmoji } from "../lib/categoryIcons";
import { formatPeso } from "../lib/format";

function timeAgo(isoString: string): string {
  const diffMs = Date.now() - new Date(isoString).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

interface RecentReportsStripProps {
  reports: RecentReportInfo[];
}

export default function RecentReportsStrip({ reports }: RecentReportsStripProps) {
  if (reports.length === 0) return null;

  return (
    <div className="mb-5">
      <h2 className="text-sm font-semibold text-ink-soft mb-2.5 px-0.5">Recent reports</h2>
      <div className="flex gap-2.5 overflow-x-auto -mx-5 px-5" style={{ scrollbarWidth: "none" }}>
        {reports.map((r) => (
          <Link
            key={r.id}
            to={`/item/${r.itemId}`}
            className="shrink-0 w-[130px] bg-white rounded-card shadow-card p-2.5 flex flex-col gap-1"
          >
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-base leading-none shrink-0" role="img" aria-label={r.itemName}>
                {getItemEmoji(r.itemName, r.itemCategory)}
              </span>
              <span className="text-xs font-semibold text-ink truncate">{r.itemName}</span>
            </div>
            <p className="font-display text-palengke-green text-sm">{formatPeso(r.price)}</p>
            <p className="text-ink-faint text-[10px]">{timeAgo(r.reportedAt)}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}