import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Star } from "lucide-react"
import { cn } from "@/lib/utils"
import type { FeedbackEntry } from "@/types/feedback"

type RlhfFeedbackDetailModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  entry: FeedbackEntry | null
}

export default function RlhfFeedbackDetailModal({
  open,
  onOpenChange,
  entry,
}: RlhfFeedbackDetailModalProps) {
  if (!entry) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Feedback Detail</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <span className="text-sm text-muted-foreground">Rating</span>
            <div className="flex items-center gap-1 mt-1">
              {[1, 2, 3, 4, 5].map((i) => (
                <Star
                  key={i}
                  className={cn(
                    "size-5",
                    i <= (entry.rating ?? 0)
                      ? "fill-yellow-400 text-yellow-400"
                      : "text-gray-300"
                  )}
                />
              ))}
            </div>
          </div>
          <div>
            <span className="text-sm text-muted-foreground">Correction / Comment</span>
            <p className="mt-1 text-sm whitespace-pre-wrap">
              {entry.correction_text || "No correction provided"}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Coach ID</span>
              <p className="font-mono text-xs mt-1">{entry.coach_id}</p>
            </div>
            <div>
              <span className="text-muted-foreground">User ID</span>
              <p className="font-mono text-xs mt-1">{entry.user_id}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Message ID</span>
              <p className="font-mono text-xs mt-1">{entry.message_id}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Date</span>
              <p className="mt-1">{new Date(entry.created_at).toLocaleString()}</p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
