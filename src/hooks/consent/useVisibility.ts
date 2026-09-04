import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type { AxiosError } from "axios"
import {
  extendGrant,
  getMyGrants,
  getPeople,
  lookupPerson,
  offerAccess,
  respondToRequest,
  revokeGrant,
} from "@/services/consent/visibility.service"
import type {
  ExtendResult,
  LookupResult,
  MyGrantRow,
  OfferResult,
  PeopleResponse,
  VisibilityCategories,
} from "@/types/consent"

/**
 * The sharing panel's hooks (Goals offering, Phase 3).
 *
 * Every mutation invalidates both reads — the people list carries each
 * person's grant state and the grants list carries the pending requests, and
 * an offer, a revoke or an answer changes both. No hook here shows a toast;
 * the panel decides what to say, and only after the mutation has settled.
 */
export const consentKeys = {
  people: ["consent", "people"] as const,
  myGrants: ["consent", "my-grants"] as const,
}

export function usePeople() {
  return useQuery<PeopleResponse, AxiosError>({
    queryKey: consentKeys.people,
    queryFn: getPeople,
    staleTime: 15 * 1000,
  })
}

export function useMyGrants() {
  return useQuery<MyGrantRow[], AxiosError>({
    queryKey: consentKeys.myGrants,
    queryFn: getMyGrants,
    staleTime: 15 * 1000,
  })
}

function useInvalidateConsent() {
  const qc = useQueryClient()
  return () =>
    Promise.all([
      qc.invalidateQueries({ queryKey: consentKeys.people }),
      qc.invalidateQueries({ queryKey: consentKeys.myGrants }),
    ])
}

export function useOfferAccess() {
  const invalidate = useInvalidateConsent()
  return useMutation<
    OfferResult,
    AxiosError,
    { granteeUserId: string; categories: VisibilityCategories; termDays?: number }
  >({
    mutationFn: offerAccess,
    onSuccess: () => invalidate(),
  })
}

export function useRevokeGrant() {
  const invalidate = useInvalidateConsent()
  return useMutation<{ id: string; status: "revoked" }, AxiosError, string>({
    mutationFn: revokeGrant,
    onSuccess: () => invalidate(),
  })
}

export function useExtendGrant() {
  const invalidate = useInvalidateConsent()
  return useMutation<ExtendResult, AxiosError, { grantId: string; days?: number }>({
    mutationFn: ({ grantId, days }) => extendGrant(grantId, days),
    onSuccess: () => invalidate(),
  })
}

export function useRespondToRequest() {
  const invalidate = useInvalidateConsent()
  return useMutation<
    { id: string; status: "granted" | "declined" },
    AxiosError,
    { grantId: string; approve: boolean; categories?: VisibilityCategories }
  >({
    mutationFn: ({ grantId, approve, categories }) => respondToRequest(grantId, approve, categories),
    onSuccess: () => invalidate(),
  })
}

/** A lookup is a mutation, not a query: it runs when the person presses the button, never on keystrokes. */
export function useLookupPerson() {
  return useMutation<LookupResult, AxiosError, string>({ mutationFn: lookupPerson })
}
