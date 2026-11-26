import { useMutation, useQueryClient } from "@tanstack/react-query"
import type { AxiosError } from "axios"
import { toast } from "sonner"
import { kceErrorMessage, kceErrorStatus } from "@/services/knowledge-continuity/authz"
import { submitValidation } from "@/services/knowledge-continuity/continuity.service"
import {
  KCE_AWAITING_DEEPER_PROBE,
  type ValidationRequest,
  type ValidationResponse,
} from "@/types/knowledge-continuity"

const VERDICT_LABEL: Record<ValidationRequest["verdict"], string> = {
  confirm: "approved",
  amend: "sent back for amendment",
  reject: "rejected",
}

/** Shown when the server refuses a verdict on a retired (deprecated) unit (409). */
export const KCE_VERDICT_RETIRED_MESSAGE =
  "This unit has been retired, so a review can't change it. The list has been refreshed."

type SubmitValidationVars = {
  unitId: string
  body: ValidationRequest
}

/**
 * What the reviewer is told after a verdict, from the band the server
 * actually set (D-10), not from the button that was pressed: a confirm can
 * leave a shallow capture held for a deeper probe, and a reject retires the
 * unit rather than leaving it where it was.
 */
export function verdictOutcomeMessage(
  verdict: ValidationRequest["verdict"],
  data: Pick<ValidationResponse, "validity_band" | "review_state">
): string {
  if (verdict === "confirm" && data.review_state === KCE_AWAITING_DEEPER_PROBE) {
    return "Unit approved. It needs a deeper interview before it can be cited, so it stays in review and leaves your queue."
  }
  switch (data.validity_band) {
    case "deprecated":
      return "Unit rejected and retired. It will not be cited."
    case "amend_requested":
      return "Unit sent back for amendment. It will not be cited until it is captured again."
    case "validated":
      return "Unit approved and validated."
    case "provisional":
      return "Unit approved. It is provisional and can be cited."
    default:
      return `Unit ${VERDICT_LABEL[verdict]}`
  }
}

/**
 * Record a reviewer's verdict on a captured knowledge unit
 * (POST /v1/trainer/continuity/units/{unitId}/validations). On success the
 * review queue AND the Program-Health analytics are invalidated (the unit
 * leaves the queue and the backlog tile and band counts move), and a toast
 * says what the verdict did. Any `note` the backend returns (e.g. a
 * high-criticality confirm held at `provisional` pending a second
 * practitioner) is surfaced too.
 */
export function useSubmitValidation() {
  const qc = useQueryClient()
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["knowledge-continuity", "review-queue"] })
    qc.invalidateQueries({ queryKey: ["knowledge-continuity", "analytics"] })
  }
  return useMutation<ValidationResponse, AxiosError, SubmitValidationVars>({
    mutationFn: async ({ unitId, body }) => {
      const res = await submitValidation(unitId, body)
      if (!res.data) throw new Error("No validation response from the server")
      return res.data
    },
    onSuccess: (data, variables) => {
      refresh()
      toast.success(verdictOutcomeMessage(variables.body.verdict, data))
      if (data.note) toast.info(data.note)
    },
    onError: (error) => {
      if (kceErrorStatus(error) === 409) {
        // The unit was retired (decayed or superseded) after the queue loaded.
        refresh()
        toast.error(KCE_VERDICT_RETIRED_MESSAGE)
        return
      }
      toast.error(kceErrorMessage(error, "Couldn't submit the review. Please try again."))
    },
  })
}
