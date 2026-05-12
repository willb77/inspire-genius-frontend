import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

type LoadingSkeletonProps = {
  height?: number
  className?: string
}

export default function LoadingSkeleton({ height = 200, className }: LoadingSkeletonProps) {
  return (
    <div
      data-testid="chartkit-loading-skeleton"
      role="status"
      aria-busy="true"
      aria-live="polite"
      className={cn("w-full", className)}
      style={{ height }}
    >
      <Skeleton className="h-full w-full" />
    </div>
  )
}
