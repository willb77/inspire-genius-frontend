import { useMutation } from "@tanstack/react-query"
import { redeemPractitionerCode } from "@/services/practitioner-code/practitionerCode.service"

/** Mutation: enter a practitioner code (PC-1c). */
export function useRedeemPractitionerCode() {
  return useMutation({ mutationFn: redeemPractitionerCode })
}
