import ItemCardSkeleton from "./ItemCardSkeleton";
import Skeleton from "./Skeleton";

// Two uneven "category" groups reads more like real content settling in
// than one big uniform grid would.
const SECTION_SIZES = [4, 6];

export default function HomeSkeleton() {
  return (
    <div role="status" aria-label="Loading items" className="flex flex-col gap-6">
      <span className="sr-only">Loading items…</span>
      {SECTION_SIZES.map((count, sectionIndex) => (
        <section key={sectionIndex}>
          <Skeleton className="h-3.5 w-24 rounded-md mb-2.5 ml-0.5" />
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: count }).map((_, i) => (
              <ItemCardSkeleton key={i} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}