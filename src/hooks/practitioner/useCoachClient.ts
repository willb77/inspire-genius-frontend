import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import * as coachClient from "@/services/practitioner/coachClient.service"
import type {
  BulkScheduleInput,
  ClientImportFramework,
  ClientImportScore,
  ResourceKey,
} from "@/types/practitioner/coachClient"

/**
 * React Query hooks over the coachClient stub seam. Server state only — the
 * pages consume these, never the service directly (Service → Hook → Component).
 */

const KEYS = {
  clients: ["practitioner", "clients"] as const,
  client: (id: string) => ["practitioner", "client", id] as const,
  clientPrism: (id: string) => ["practitioner", "client", id, "prism"] as const,
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

/** The client's PRISM as the reader states it — shared, or why not. */
export function useClientPrism(id: string | undefined) {
  return useQuery({
    queryKey: KEYS.clientPrism(id ?? ""),
    queryFn: () => coachClient.getClientPrism(id ?? ""),
    enabled: !!id,
  })
}

/**
 * TDS U12: import a linked client's PRISM report CSV onto their own profile.
 * On success the client's record and PRISM reader are refreshed.
 */
export function useImportClientPrism() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (args: { clientId: string; file: File }) =>
      coachClient.importClientPrismCsv(args.clientId, args.file),
    onSuccess: (_data, args) => {
      void qc.invalidateQueries({ queryKey: KEYS.clientPrism(args.clientId) })
      void qc.invalidateQueries({ queryKey: KEYS.client(args.clientId) })
    },
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

/** TDS A4: parse a client's DISC / CliftonStrengths file. Saves nothing. */
export function usePreviewClientAssessmentImport() {
  return useMutation({
    mutationFn: (args: { clientId: string; framework: ClientImportFramework; file: File }) =>
      coachClient.previewClientAssessmentImport(args.clientId, args.framework, args.file),
  })
}

/** TDS A4: send the reviewed result to the client, held until they accept it. */
export function useSendClientAssessmentImport() {
  return useMutation({
    mutationFn: (args: { clientId: string; framework: ClientImportFramework; scores: ClientImportScore[] }) =>
      coachClient.sendClientAssessmentImport(args.clientId, { framework: args.framework, scores: args.scores }),
  })
}

/** Whether the import is offered here (only where the coach backend is deployed). */
export const clientImportAvailable = coachClient.clientImportAvailable
