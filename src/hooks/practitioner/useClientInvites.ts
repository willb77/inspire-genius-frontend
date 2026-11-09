import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  claimClientInvite,
  createClientInvite,
  listClientInvites,
  revokeClientInvite,
  rotateClientInvite,
} from "@/services/practitioner-invites/clientInvites.service"
import { clearStoredInvite } from "@/lib/practitionerInvite"

export const clientInvitesKey = ["practitioner", "client-invites"] as const

/** S5 — the practitioner's own invites, or `off` when the routes do not apply. */
export function useClientInvites() {
  return useQuery({
    queryKey: clientInvitesKey,
    queryFn: listClientInvites,
    staleTime: 30_000,
    retry: false,
  })
}

/** S4 — issue a link for one client. The result carries the one-time link. */
export function useCreateClientInvite() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (clientId: string) => createClientInvite(clientId),
    onSettled: () => qc.invalidateQueries({ queryKey: clientInvitesKey }),
  })
}

export function useRevokeClientInvite() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (inviteId: string) => revokeClientInvite(inviteId),
    onSettled: () => qc.invalidateQueries({ queryKey: clientInvitesKey }),
  })
}

/** S5 "Copy new link" — rotates; the old link stops working. */
export function useRotateClientInvite() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (inviteId: string) => rotateClientInvite(inviteId),
    onSettled: () => qc.invalidateQueries({ queryKey: clientInvitesKey }),
  })
}

/**
 * S7 — the signed-in claim. Resolves to an outcome; never rejects. The stored
 * token is cleared when the claim settles, whatever it came to — inside the
 * mutation itself, so it happens even if the page unmounts mid-flight.
 */
export function useClaimClientInvite() {
  return useMutation({
    mutationFn: async (token: string) => {
      try {
        return await claimClientInvite(token)
      } finally {
        clearStoredInvite()
      }
    },
  })
}
