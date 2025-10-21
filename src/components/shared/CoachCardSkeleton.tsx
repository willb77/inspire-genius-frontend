import { Skeleton } from "@/components/ui/skeleton";

type CoachCardSkeletonProps = {
  className?: string;
  actions?: 'dual' | 'single';
};

export default function CoachCardSkeleton({ className, actions = 'dual' }: CoachCardSkeletonProps) {
  return (
    <div className={["bg-white rounded-2xl shadow-[4px_4px_20px_4px_rgba(0,0,0,0.1)] p-5", className].filter(Boolean).join(" ")}> 
      <div className="flex items-start justify-between">
        <Skeleton className="h-6 w-40 rounded-lg" />
        <Skeleton className="h-6 w-6 rounded-full" />
      </div>

      <div className="mt-4 space-y-3 text-sm">
        <div>
          <Skeleton className="mx-auto h-4 w-20 mb-2" />
          <Skeleton className="mx-auto h-8 w-full rounded-xl" />
        </div>
        <div>
          <Skeleton className="mx-auto h-4 w-28 mb-2" />
          <Skeleton className="mx-auto h-8 w-full rounded-xl" />
        </div>
        <div>
          <Skeleton className="mx-auto h-4 w-24 mb-2" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-full rounded-xl" />
          </div>
        </div>
      </div>

      {actions === 'dual' ? (
        <div className="mt-6 flex items-center gap-3">
          <Skeleton className="h-8 w-10 rounded-xl" />
          <Skeleton className="h-12 flex-1 rounded-xl" />
        </div>
      ) : (
        <div className="mt-6">
          <Skeleton className="h-11 w-full rounded-xl" />
        </div>
      )}
    </div>
  );
}
