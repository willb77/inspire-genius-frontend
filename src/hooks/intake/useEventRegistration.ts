import { useMutation, useQuery } from "@tanstack/react-query"
import {
  fetchEventOptions,
  submitEventRegistration,
} from "@/services/intake/eventRegistration.service"
import type { EventOption, EventRegistrationPayload } from "@/types/eventRegistration"
import type { PublicRegistrationReceived } from "@/types/intake"

export const EVENT_OPTIONS_QUERY_KEY = ["intake", "event-options"] as const

/**
 * The events a visitor may register for. `enabled` is false until the events
 * list has shown at least one event, so a switched-off tier makes no extra
 * request. Never retried and never an error state: failing to load it only means
 * no Register buttons.
 */
export function useEventOptions(enabled: boolean) {
  return useQuery<EventOption[]>({
    queryKey: EVENT_OPTIONS_QUERY_KEY,
    queryFn: fetchEventOptions,
    enabled,
    staleTime: 30_000,
    retry: false,
  })
}

/** No retry: a resubmit is the visitor's call, and a Turnstile token is single-use. */
export function useEventRegistration() {
  return useMutation<PublicRegistrationReceived, unknown, EventRegistrationPayload>({
    mutationFn: submitEventRegistration,
    retry: false,
  })
}
