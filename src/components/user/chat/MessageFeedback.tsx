import { useState } from "react"
import { Star } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { useSubmitFeedback } from "@/hooks/feedback/useFeedback"

type MessageFeedbackProps = {
  messageId: string
  conversationId: string
  coachId: string
  sessionId?: string
}

export default function MessageFeedback({ messageId, conversationId, coachId, sessionId }: MessageFeedbackProps) {
  const [expanded, setExpanded] = useState(false)
  const [rating, setRating] = useState(0)
  const [hovered, setHovered] = useState(0)
  const [correction, setCorrection] = useState("")
  const [submitted, setSubmitted] = useState(false)

  const mutation = useSubmitFeedback()

  const handleSubmit = async () => {
    if (rating < 1 || rating > 5) return
    await mutation.mutateAsync({
      session_id: sessionId || conversationId,
      agent_id: coachId,
      message_id: messageId,
      feedback_type: "rating",
      value: rating,
      text: correction.trim() || undefined,
    })
    setSubmitted(true)
    setExpanded(false)
  }

  if (submitted) {
    return (
      <div className="flex items-center gap-1.5 mt-1 px-1">
        {[1, 2, 3, 4, 5].map((i) => (
          <Star
            key={i}
            className={cn(
              "size-3.5",
              i <= rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
            )}
          />
        ))}
        <span className="text-[11px] text-muted-foreground ml-1">Thank you</span>
      </div>
    )
  }

  if (!expanded) {
    return (
      <button
        type="button"
        onClick={() => setExpanded(true)}
        className="text-sm font-bold text-blue-600 hover:text-blue-800 mt-1.5 px-1 cursor-pointer underline underline-offset-2"
      >
        Rate this response
      </button>
    )
  }

  return (
    <div className="mt-2 px-1 space-y-2 max-w-[70%]">
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((i) => (
          <button
            key={i}
            type="button"
            className="cursor-pointer p-0.5"
            onMouseEnter={() => setHovered(i)}
            onMouseLeave={() => setHovered(0)}
            onClick={() => setRating(i)}
          >
            <Star
              className={cn(
                "size-5 transition-colors",
                i <= (hovered || rating)
                  ? "fill-yellow-400 text-yellow-400"
                  : "text-gray-300 hover:text-yellow-300"
              )}
            />
          </button>
        ))}
      </div>
      <Textarea
        placeholder="Optional: suggest a better response (max 2000 chars)"
        value={correction}
        onChange={(e) => setCorrection(e.target.value.slice(0, 2000))}
        rows={3}
        className="text-sm resize-none"
      />
      <div className="flex gap-2">
        <Button
          size="sm"
          onClick={handleSubmit}
          disabled={rating === 0 || mutation.isPending}
        >
          {mutation.isPending ? "Submitting..." : "Submit"}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => {
            setExpanded(false)
            setRating(0)
            setCorrection("")
          }}
        >
          Cancel
        </Button>
      </div>
    </div>
  )
}
