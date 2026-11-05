import { useMutation } from "@tanstack/react-query"
import { submitPublicRegistration } from "@/services/intake/publicIntake.service"
import type { PublicRegistrationPayload, PublicRegistrationReceived } from "@/types/intake"

/** IN-2c — submit the public `/join` form. No retry: a resubmit is the visitor's call. */
export function usePublicRegistration() {
  return useMutation<PublicRegistrationReceived, unknown, PublicRegistrationPayload>({
    mutationFn: submitPublicRegistration,
    retry: false,
  })
}
