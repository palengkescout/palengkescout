import { CircleAlert } from "lucide-react";
import type { PriceStatus } from "../types";

export default function StatusBadge({ status }: { status: PriceStatus }) {
  if (status === "verified") return null; // clean by default, no badge needed

  if (status === "pending") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-pill text-xs font-medium bg-ink-faint/10 text-ink-soft">
        Unverified
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-pill text-xs font-medium bg-fresh-red/10 text-fresh-red">
      <CircleAlert size={13} strokeWidth={2.2} />
      Needs verification
    </span>
  );
}