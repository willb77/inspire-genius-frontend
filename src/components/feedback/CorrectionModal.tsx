import { useForm } from "react-hook-form"
import { z } from "zod"
import { toast } from "sonner"
import { useSubmitFeedback } from "@/hooks/feedback/useFeedback"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

const correctionSchema = z.object({
  correctedText: z.string().min(1, "Corrected response is required"),
  reason: z.string().min(1, "Please select a reason"),
})

type CorrectionForm = z.infer<typeof correctionSchema>

type CorrectionModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  responseId: string
  conversationId: string
  coachId: string
  originalText: string
}

const REASONS = [
  "Factually incorrect",
  "Off-topic response",
  "Tone inappropriate",
  "Missing context",
  "Too verbose",
  "Other",
]

export default function CorrectionModal({
  open,
  onOpenChange,
  responseId,
  conversationId,
  coachId,
  originalText,
}: CorrectionModalProps) {
  const submitFeedback = useSubmitFeedback()
  const { register, handleSubmit, reset, formState: { errors } } = useForm<CorrectionForm>()

  async function onSubmit(data: CorrectionForm) {
    try {
      await submitFeedback.mutateAsync({
        message_id: responseId,
        conversation_id: conversationId,
        coach_id: coachId,
        rating: 1,
        correction_text: `[${data.reason}] ${data.correctedText}`,
      })
      toast.success("Correction submitted. Thank you!")
      reset()
      onOpenChange(false)
    } catch {
      toast.error("Failed to submit correction")
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Submit Correction</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-[#6b7280] block mb-1">Original Response</label>
            <div className="text-[13px] text-[#374151] bg-[#f9fafb] border border-[#e5e7eb] rounded-lg p-3 max-h-24 overflow-y-auto">
              {originalText}
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-[#6b7280] block mb-1">Reason</label>
            <select
              {...register("reason")}
              className="w-full border border-[#e5e7eb] rounded-lg px-3 py-2 text-[13px] outline-none focus:border-[#3B5BFF]"
            >
              <option value="">Select a reason...</option>
              {REASONS.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
            {errors.reason && <p className="text-xs text-[#EF4444] mt-1">{errors.reason.message}</p>}
          </div>
          <div>
            <label className="text-xs font-semibold text-[#6b7280] block mb-1">Corrected Response</label>
            <textarea
              {...register("correctedText")}
              rows={4}
              placeholder="Enter the corrected response..."
              className="w-full border border-[#e5e7eb] rounded-lg px-3 py-2 text-[13px] outline-none focus:border-[#3B5BFF] resize-y"
            />
            {errors.correctedText && <p className="text-xs text-[#EF4444] mt-1">{errors.correctedText.message}</p>}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={submitFeedback.isPending}>
              {submitFeedback.isPending ? "Submitting..." : "Submit Correction"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
