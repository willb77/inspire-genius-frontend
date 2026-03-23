import { cn } from "@/lib/utils"

export default function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn("bg-white border border-[#e5e7eb] rounded-lg p-4 animate-pulse", className)}>
      <div className="h-3 bg-[#e5e7eb] rounded w-1/3 mb-3" />
      <div className="h-6 bg-[#e5e7eb] rounded w-1/2 mb-2" />
      <div className="h-2 bg-[#f3f4f6] rounded w-2/3" />
    </div>
  )
}
