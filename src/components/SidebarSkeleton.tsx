import { Skeleton } from "@/components/ui/skeleton";

export function SidebarSkeleton() {
  return (
    <div className="w-64 bg-sidebar-bg border-r border-border-light flex flex-col animate-fade-in">
      {/* Header skeleton */}
      <div className="h-14 border-b border-border-light px-4 flex items-center gap-2">
        <Skeleton className="h-8 w-8 rounded-md" />
        <Skeleton className="h-4 w-32" />
      </div>

      {/* Search skeleton */}
      <div className="p-3">
        <Skeleton className="h-8 w-full rounded-md" />
      </div>

      {/* Pages list skeleton */}
      <div className="flex-1 px-2 space-y-1">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-center gap-2 px-2 py-1.5">
            <Skeleton className="h-4 w-4 rounded-sm" />
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="h-4 w-4 rounded-sm" />
          </div>
        ))}
      </div>

      {/* New page button skeleton */}
      <div className="p-3 border-t border-border-light">
        <Skeleton className="h-9 w-full rounded-md" />
      </div>
    </div>
  );
}
