import { useState } from "react"
import { ThumbsUp, ThumbsDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { useSubmitFeedback } from "@/hooks/feedback/useFeedback"

type FeedbackButtonsProps = {
  responseId: string
  conversationId: string
  coachId: string
  onFeedback?: (type: "positive" | "negative") => void
  onCorrectionRequest?: () => void
}

export default function FeedbackButtons({
  responseId,
  conversationId,
  coachId,
  onFeedback,
  onCorrectionRequest,
}: FeedbackButtonsProps) {
  const [selected, setSelected] = useState<"positive" | "negative" | null>(null)
  const submitFeedback = useSubmitFeedback()

  async function handleClick(type: "positive" | "negative") {
    if (selected === type) return
    setSelected(type)
    try {
      await submitFeedback.mutateAsync({
        message_id: responseId,
        conversation_id: conversationId,
        coach_id: coachId,
        rating: type === "positive" ? 5 : 1,
        correction_text: undefined,
      })
      onFeedback?.(type)
      if (type === "negative" && onCorrectionRequest) {
        onCorrectionRequest()
      }
    } catch {
      toast.error("Failed to submit feedback")
      setSelected(null)
    }
  }

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={() => handleClick("positive")}
        disabled={submitFeedback.isPending}
        className={cn(
          "p-1 rounded hover:bg-[#ECFDF5] transition-colors",
          selected === "positive" && "bg-[#ECFDF5]"
        )}
        aria-label="Thumbs up"
      >
        <ThumbsUp className={cn("w-3.5 h-3.5", selected === "positive" ? "text-[#10B981] fill-[#10B981]" : "text-[#9ca3af]")} />
      </button>
      <button
        onClick={() => handleClick("negative")}
        disabled={submitFeedback.isPending}
        className={cn(
          "p-1 rounded hover:bg-[#FEF2F2] transition-colors",
          selected === "negative" && "bg-[#FEF2F2]"
        )}
        aria-label="Thumbs down"
      >
        <ThumbsDown className={cn("w-3.5 h-3.5", selected === "negative" ? "text-[#EF4444] fill-[#EF4444]" : "text-[#9ca3af]")} />
      </button>
    </div>
  )
}
