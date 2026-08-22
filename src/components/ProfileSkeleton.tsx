import Skeleton from "./Skeleton";

// Mirrors ProfileScreen's four stacked cards, in the same order, with
// the same shapes: summary card, stats grid, leaderboard, hall of fame.
export default function ProfileSkeleton() {
  return (
    <div role="status" aria-label="Loading profile" className="flex flex-col gap-5">
      <span className="sr-only">Loading profile…</span>

      {/* Summary card: name, email, points pill, tier progress */}
      <div className="bg-white rounded-card shadow-card p-4">
        <Skeleton className="h-5 w-32 rounded-md mb-2" />
        <Skeleton className="h-3 w-40 rounded-md mb-3" />
        <Skeleton className="h-8 w-36 rounded-pill mb-3" />
        <Skeleton className="h-4 w-44 rounded-md mb-1.5" />
        <Skeleton className="h-3 w-56 rounded-md" />
      </div>

      {/* Verified / Pending / Flagged stat tiles */}
      <div className="grid grid-cols-3 gap-2.5">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-white rounded-card shadow-card p-3 flex flex-col items-center gap-1.5">
            <Skeleton className="w-[18px] h-[18px] rounded-full" />
            <Skeleton className="h-4 w-6 rounded-md" />
            <Skeleton className="h-2.5 w-10 rounded-md" />
          </div>
        ))}
      </div>

      {/* Leaderboard card */}
      <div className="bg-white rounded-card shadow-card p-4">
        <div className="flex items-center justify-between mb-3">
          <Skeleton className="h-4 w-28 rounded-md" />
          <div className="flex gap-1">
            <Skeleton className="h-7 w-20 rounded-pill" />
            <Skeleton className="h-7 w-20 rounded-pill" />
          </div>
        </div>
        <div className="flex flex-col gap-2.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-2.5">
              <Skeleton className="w-4 h-3 rounded-md" />
              <Skeleton className="h-3 flex-1 rounded-md" />
              <Skeleton className="h-3 w-10 rounded-md" />
            </div>
          ))}
        </div>
      </div>

      {/* Hall of Fame card */}
      <div className="bg-white rounded-card shadow-card p-4">
        <div className="flex items-center justify-between mb-3">
          <Skeleton className="h-4 w-28 rounded-md" />
          <div className="flex gap-1">
            <Skeleton className="h-7 w-16 rounded-pill" />
            <Skeleton className="h-7 w-16 rounded-pill" />
          </div>
        </div>
        <div className="flex flex-col gap-2.5">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between px-2.5">
              <Skeleton className="h-3 w-20 rounded-md" />
              <Skeleton className="h-3 w-24 rounded-md" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}