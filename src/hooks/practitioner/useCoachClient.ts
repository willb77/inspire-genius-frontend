import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import * as coachClient from "@/services/practitioner/coachClient.service"
import type { BulkScheduleInput, ResourceKey } from "@/types/practitioner/coachClient"

/**
 * React Query hooks over the coachClient stub seam. Server state only — the
 * pages consume these, never the service directly (Service → Hook → Component).
 */

const KEYS = {
  clients: ["practitioner", "clients"] as const,
  client: (id: string) => ["practitioner", "client", id] as const,
  schedule: ["practitioner", "schedule"] as const,
  credits: ["practitioner", "credits"] as const,
  usage: ["practitioner", "client-usage"] as const,
}

export function useCoachClients() {
  return useQuery({ queryKey: KEYS.clients, queryFn: coachClient.listClients })
}

export function useCoachClient(id: string | undefined) {
  return useQuery({
    queryKey: KEYS.client(id ?? ""),
    queryFn: () => coachClient.getClient(id ?? ""),
    enabled: !!id,
  })
}

export function useAddCoachClient() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: coachClient.addClient,
    onSuccess: () => void qc.invalidateQueries({ queryKey: KEYS.clients }),
  })
}

export function useBulkImportCoachClients() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: coachClient.bulkImportClients,
    onSuccess: () => void qc.invalidateQueries({ queryKey: KEYS.clients }),
  })
}

export function useUploadClientResource() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (args: { clientId: string; resource: ResourceKey; file?: File }) =>
      coachClient.uploadClientResource(args.clientId, args.resource, args.file),
    onSuccess: (_r, args) => void qc.invalidateQueries({ queryKey: KEYS.client(args.clientId) }),
  })
}

export function useCoachSchedule() {
  return useQuery({ queryKey: KEYS.schedule, queryFn: coachClient.listSchedule })
}

export function useCreateSessionsBulk() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: BulkScheduleInput) => coachClient.createSessionsBulk(input),
    onSuccess: () => void qc.invalidateQueries({ queryKey: KEYS.schedule }),
  })
}

export function useCoachCredits() {
  return useQuery({ queryKey: KEYS.credits, queryFn: coachClient.getCreditsSummary })
}

export function useClientUsage() {
  return useQuery({ queryKey: KEYS.usage, queryFn: coachClient.getClientUsage })
}
