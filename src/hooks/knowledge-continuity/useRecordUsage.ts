import { useMutation, useQueryClient } from "@tanstack/react-query"
import type { AxiosError } from "axios"
import { toast } from "sonner"
import { recordUsage } from "@/services/knowledge-continuity/continuity.service"
import type { UsageRequest } from "@/types/knowledge-continuity"

/** Human-friendly confirmation per successor feedback signal. */
const SIGNAL_TOAST: Record<string, string> = {
  still_true: "Marked still accurate",
  no_longer_true: "Flagged as no longer true",
  clarity_flag: "Sent for clarification",
}

type RecordUsageVars = {
  unitId: string
  body: UsageRequest
  /** Optional — the curriculum this unit belongs to, so its cache can refresh. */
  templateId?: string
}

/**
 * Record a successor's feedback signal on a taught knowledge unit
 * (POST /v1/trainer/continuity/units/{unitId}/usage). Confirms with a toast;
 * refreshes the owning curriculum when a template id is supplied.
 */
export function useRecordUsage() {
  const qc = useQueryClient()
  return useMutation<unknown, AxiosError, RecordUsageVars>({
    mutationFn: async ({ unitId, body }) => {
      const res = await recordUsage(unitId, body)
      return res.data
    },
    onSuccess: (_data, variables) => {
      toast.success(SIGNAL_TOAST[variables.body.signal_type] ?? "Feedback recorded")
      if (variables.templateId) {
        qc.invalidateQueries({
          queryKey: ["knowledge-continuity", "curriculum", variables.templateId],
        })
      }
    },
    onError: () => {
      toast.error("Couldn't record your feedback. Please try again.")
    },
  })
}
