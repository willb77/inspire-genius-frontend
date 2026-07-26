// Credit-write mutations — React Query wrappers around the credits service.
//
// On success each mutation invalidates the existing credit query keys so the
// balance tiles + transaction tables refetch. Errors surface as Sonner toasts;
// a 503 is mapped to a friendly "not enabled yet" message because the frontend
// flag (`VITE_CREDITS_WRITE`) can be on while the backend flag is still off.

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import type { AxiosError } from "axios"
import {
  allocateCredits,
  purchaseCredits,
  refundCredits,
  useCredits,
} from "@/services/credits/credits.service"
import type { BaseApiResponse } from "@/types/api"
import type {
  AllocateCreditsBody,
  CreditTransaction,
  PurchaseCreditsBody,
  RefundCreditsBody,
  UseCreditsBody,
} from "@/types/credits"

/** Existing credit-related query keys (see hooks/{distributor,practitioner}). */
export const DISTRIBUTOR_CREDIT_KEYS = [
  ["distributor-credits"],
  ["distributor-transactions"],
  ["distributor-practitioners"],
] as const

export const PRACTITIONER_CREDIT_KEYS = [["practitioner-credits"]] as const

const BACKEND_DISABLED_MESSAGE = "Credit writes aren't enabled yet."

/** Extract a human message from an axios error, mapping 503 to the flag-off copy. */
function messageFor(error: unknown): string {
  const axErr = error as AxiosError<BaseApiResponse<unknown>> | undefined
  if (axErr?.response?.status === 503) return BACKEND_DISABLED_MESSAGE
  const data = axErr?.response?.data
  return data?.message || data?.error_status?.description || "Something went wrong. Please try again."
}

function useInvalidate(keys: ReadonlyArray<ReadonlyArray<string>>) {
  const qc = useQueryClient()
  return () => {
    keys.forEach((key) => void qc.invalidateQueries({ queryKey: [...key] }))
  }
}

/** Distributor: buy credits into the available pool. */
export function usePurchaseCredits() {
  const invalidate = useInvalidate(DISTRIBUTOR_CREDIT_KEYS)
  return useMutation<CreditTransaction | undefined, AxiosError, PurchaseCreditsBody>({
    mutationFn: purchaseCredits,
    onSuccess: (data) => {
      invalidate()
      toast.success(
        data?.idempotent_replay
          ? "That purchase was already recorded."
          : "Credits purchased.",
      )
    },
    onError: (error) => toast.error(messageFor(error)),
  })
}

/** Distributor: allocate pool credits to a practitioner. */
export function useAllocateCredits() {
  const invalidate = useInvalidate(DISTRIBUTOR_CREDIT_KEYS)
  return useMutation<CreditTransaction | undefined, AxiosError, AllocateCreditsBody>({
    mutationFn: allocateCredits,
    onSuccess: (data) => {
      invalidate()
      toast.success(
        data?.idempotent_replay
          ? "That allocation was already recorded."
          : "Credits allocated.",
      )
    },
    onError: (error) => toast.error(messageFor(error)),
  })
}

/** Practitioner: consume credits for an assessment/session. */
export function useUseCredits() {
  const invalidate = useInvalidate(PRACTITIONER_CREDIT_KEYS)
  return useMutation<CreditTransaction | undefined, AxiosError, UseCreditsBody>({
    mutationFn: useCredits,
    onSuccess: (data) => {
      invalidate()
      toast.success(
        data?.idempotent_replay
          ? "That usage was already recorded."
          : "Credit used.",
      )
    },
    onError: (error) => toast.error(messageFor(error)),
  })
}

/** Distributor: refund/reverse a prior transaction. */
export function useRefundCredits() {
  const invalidate = useInvalidate(DISTRIBUTOR_CREDIT_KEYS)
  return useMutation<CreditTransaction | undefined, AxiosError, RefundCreditsBody>({
    mutationFn: refundCredits,
    onSuccess: (data) => {
      invalidate()
      toast.success(
        data?.idempotent_replay
          ? "That refund was already recorded."
          : "Credits refunded.",
      )
    },
    onError: (error) => toast.error(messageFor(error)),
  })
}
