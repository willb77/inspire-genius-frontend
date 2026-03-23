import { ThumbsUp, ThumbsDown, Pencil } from "lucide-react"
import { cn } from "@/lib/utils"

type FeedbackType = "positive" | "negative" | "correction"

type FeedbackIndicatorProps = {
  type: FeedbackType
  className?: string
}

const CONFIG: Record<FeedbackType, { icon: typeof ThumbsUp; color: string; label: string }> = {
  positive: { icon: ThumbsUp, color: "text-[#10B981]", label: "Positive" },
  negative: { icon: ThumbsDown, color: "text-[#EF4444]", label: "Negative" },
  correction: { icon: Pencil, color: "text-[#3B5BFF]", label: "Correction" },
}

export default function FeedbackIndicator({ type, className }: FeedbackIndicatorProps) {
  const { icon: Icon, color, label } = CONFIG[type]
  return (
    <span className={cn("inline-flex items-center gap-1 text-[11px] font-medium", color, className)} title={label}>
      <Icon className="w-3 h-3" />
      {label}
    </span>
  )
}
