interface SkeletonProps {
  className?: string;
}

/**
 * Base shimmer block — no default rounding on purpose. Always pass the
 * rounding you want (rounded-full, rounded-card, rounded-pill, etc.)
 * via className so each skeleton piece matches the real element it
 * stands in for.
 */
export default function Skeleton({ className = "" }: SkeletonProps) {
  return <div className={`skeleton-shimmer ${className}`} aria-hidden="true" />;
}