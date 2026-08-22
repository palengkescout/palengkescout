import { formatRelativeTime, getFreshnessTier } from "../lib/format";

const tierStyles: Record<string, { dot: string; text: string; bg: string }> = {
  fresh: { dot: "bg-fresh-green", text: "text-fresh-green", bg: "bg-fresh-green/10" },
  aging: { dot: "bg-fresh-amber", text: "text-fresh-amber", bg: "bg-fresh-amber/10" },
  stale: { dot: "bg-fresh-red", text: "text-fresh-red", bg: "bg-fresh-red/10" },
};

export default function FreshnessBadge({ reportedAt }: { reportedAt: string }) {
  const tier = getFreshnessTier(reportedAt);
  const style = tierStyles[tier];
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-pill text-xs font-medium ${style.bg} ${style.text}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
      {formatRelativeTime(reportedAt)}
    </span>
  );
}
