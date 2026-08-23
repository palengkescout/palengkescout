export type FreshnessTier = "fresh" | "aging" | "stale";

export function getFreshnessTier(reportedAt: string): FreshnessTier {
  const minutes = (Date.now() - new Date(reportedAt).getTime()) / 60_000;
  if (minutes < 60) return "fresh"; // 🟢 under 1 hour
  if (minutes < 24 * 60) return "aging"; // 🟡 under 24 hours
  return "stale"; // 🔴 older
}

export function formatRelativeTime(reportedAt: string): string {
  const minutes = Math.max(0, Math.round((Date.now() - new Date(reportedAt).getTime()) / 60_000));
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

export function formatPeso(amount: number): string {
  return `₱${amount.toLocaleString("en-PH", { maximumFractionDigits: 2 })}`;
}

export function marketTypeLabel(type: string): string {
  switch (type) {
    case "wet_market":
      return "Wet Market";
    case "public_market":
      return "Public Market";
    case "supermarket":
      return "Supermarket";
    case "grocery":
      return "Grocery / Mini Mart";
    case "farmers_market":
      return "Farmer's Market";
    case "sari_sari":
      return "Sari-Sari Store";
    default:
      return type;
  }
}