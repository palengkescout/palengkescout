import Skeleton from "./Skeleton";

// Mirrors ItemCard's exact structure and spacing (round avatar, two text
// lines, price row with a small pill on the right) so swapping the real
// card in once data loads causes zero layout shift.
export default function ItemCardSkeleton() {
  return (
    <div className="bg-white rounded-card shadow-card p-3.5 flex flex-col gap-2">
      <Skeleton className="w-11 h-11 rounded-full" />
      <div className="flex flex-col gap-1.5">
        <Skeleton className="h-3.5 w-4/5 rounded-md" />
        <Skeleton className="h-2.5 w-2/5 rounded-md" />
      </div>
      <div className="flex items-center justify-between mt-auto gap-1 pt-1">
        <Skeleton className="h-4 w-16 rounded-md" />
        <Skeleton className="h-4 w-10 rounded-pill" />
      </div>
    </div>
  );
}