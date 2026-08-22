import { ShoppingBasket } from "lucide-react";

interface EmptyStateProps {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export default function EmptyState({ title, description, actionLabel, onAction }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center text-center px-8 py-14">
      <div className="w-16 h-16 rounded-full bg-palengke-green/10 flex items-center justify-center mb-4">
        <ShoppingBasket size={28} className="text-palengke-green" strokeWidth={1.8} />
      </div>
      <p className="font-display text-lg text-ink mb-1.5">{title}</p>
      <p className="text-ink-soft text-sm max-w-[26ch]">{description}</p>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="mt-5 px-5 py-2.5 rounded-pill bg-palengke-green text-white font-medium text-sm min-h-[44px]"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}