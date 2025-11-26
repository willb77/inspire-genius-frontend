"use client";

import { Skeleton } from "@/components/ui/skeleton";

type LoadingSkeletonProps = {
  columns?: number;
  rows?: number;
  className?: string;
};

export default function LoadingSkeleton({
  columns = 5,
  rows = 10,
  className = "",
}: LoadingSkeletonProps) {
  return (
    <div className={`space-y-2 p-4 ${className}`}>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div
          key={rowIndex}
          className={`grid grid-cols-${columns} gap-4 items-center`}
        >
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Skeleton key={colIndex} className="h-5" />
          ))}
        </div>
      ))}
    </div>
  );
}
