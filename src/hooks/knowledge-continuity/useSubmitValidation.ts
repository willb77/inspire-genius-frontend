import { useMutation, useQueryClient } from "@tanstack/react-query"
import type { AxiosError } from "axios"
import { toast } from "sonner"
import { submitValidation } from "@/services/knowledge-continuity/continuity.service"
import type { ValidationRequest, ValidationResponse } from "@/types/knowledge-continuity"

const VERDICT_LABEL: Record<ValidationRequest["verdict"], string> = {
  confirm: "approved",
  amend: "sent back for amendment",
  reject: "rejected",
}

type SubmitValidationVars = {
  unitId: string
  body: ValidationRequest
}

/**
 * Record a reviewer's verdict on a captured knowledge unit
 * (POST /v1/trainer/continuity/units/{unitId}/validations). On success the
 * review queue is invalidated so the unit drops off the list, and a toast
 * surfaces any `note` the backend returns (e.g. a high-criticality confirm
 * held at `provisional` pending a second reviewer).
 */
export function useSubmitValidation() {
  const qc = useQueryClient()
  return useMutation<ValidationResponse, AxiosError, SubmitValidationVars>({
    mutationFn: async ({ unitId, body }) => {
      const res = await submitValidation(unitId, body)
      if (!res.data) throw new Error("No validation response from the server")
      return res.data
    },
    onSuccess: (data, variables) => {
      qc.invalidateQueries({ queryKey: ["knowledge-continuity", "review-queue"] })
      toast.success(`Unit ${VERDICT_LABEL[variables.body.verdict]}`)
      if (data.note) toast.info(data.note)
    },
    onError: () => {
      toast.error("Couldn't submit the review. Please try again.")
    },
  })
}
