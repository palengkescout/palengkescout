import Skeleton from "./Skeleton";

// Mirrors the report form's field order: item dropdown, market dropdown,
// price input, photo upload box, name input, submit button.
export default function ReportSkeleton() {
  return (
    <div role="status" aria-label="Loading report form" className="flex flex-col gap-5">
      <span className="sr-only">Loading report form…</span>

      <div>
        <Skeleton className="h-4 w-14 rounded-md mb-2" />
        <Skeleton className="h-[52px] w-full rounded-card" />
      </div>

      <div>
        <Skeleton className="h-4 w-48 rounded-md mb-2" />
        <Skeleton className="h-[52px] w-full rounded-card" />
      </div>

      <div>
        <Skeleton className="h-4 w-24 rounded-md mb-2" />
        <Skeleton className="h-[52px] w-full rounded-card" />
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <Skeleton className="h-4 w-32 rounded-md" />
          <Skeleton className="h-4 w-14 rounded-pill" />
        </div>
        <Skeleton className="w-24 h-24 rounded-xl" />
        <Skeleton className="h-3 w-56 rounded-md mt-2" />
      </div>

      <div>
        <Skeleton className="h-4 w-24 rounded-md mb-2" />
        <Skeleton className="h-[52px] w-full rounded-card" />
        <Skeleton className="h-3 w-64 rounded-md mt-2" />
      </div>

      <Skeleton className="h-[52px] w-full rounded-pill mt-1" />
    </div>
  );
}