import { Skeleton } from "@/components/ui/skeleton";

export function EditorSkeleton() {
  return (
    <div className="flex-1 bg-editor-bg animate-fade-in">
      <div className="max-w-4xl mx-auto px-8 py-12">
        {/* Title skeleton */}
        <div className="mb-8">
          <Skeleton className="h-14 w-3/4 mb-2" />
        </div>

        {/* Blocks skeleton */}
        <div className="space-y-4">
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-6 w-5/6" />
          <Skeleton className="h-6 w-4/6" />
          <div className="pt-4">
            <Skeleton className="h-8 w-2/6 mb-3" />
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-5/6" />
          </div>
        </div>
      </div>
    </div>
  );
}
