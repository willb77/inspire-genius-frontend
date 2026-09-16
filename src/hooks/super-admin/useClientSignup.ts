/**
 * React Query hooks for the Client Sign-Up surface (super-admin).
 *
 * Service → Hook → Component. Components never call the service directly.
 *
 * The one thing worth reading closely is {@link refusalMessages}. The server
 * refuses a stage change, a SOW send or an invoicing hand-off with HTTP 409 and
 * a body listing EVERYTHING outstanding. A hook that surfaced only
 * `error.message` would render "Request failed with status code 409", which
 * tells the user nothing and makes a correct gate look like a broken app —
 * the same shape as the chat panels that parsed an error frame and rendered it
 * nowhere (agents.md §6). These hooks turn the body into readable lines, and
 * the pages render them.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type { AxiosError } from "axios"

import {
  addActivity,
  canAdvance,
  changeStage,
  confirmInvoicingSummary,
  createChangeOrder,
  createEngagement,
  draftInvoicingSummary,
  getClientSignupAccess,
  getEngagement,
  getInvoicingSummary,
  getProcessReference,
  getSow,
  listActivities,
  listChangeOrders,
  listEngagements,
  listSowVersions,
  saveInvoicingSummary,
  saveSow,
  sendInvoicingSummary,
  sendSow,
  signChangeOrder,
  signSow,
  updateEngagement,
} from "@/services/super-admin/client-signup.service"
import { useAuth } from "@/context/useAuth"
import type {
  ActivityCreatePayload,
  EngagementCreatePayload,
  EngagementUpdatePayload,
  InvoicingDocument,
  SowDocument,
  StageChangePayload,
} from "@/types/client-signup"

const ACCESS_KEY = ["client-signup", "access"] as const
const PROCESS_KEY = ["client-signup", "process"] as const
const pipelineKey = (filters?: unknown) => ["client-signup", "pipeline", filters ?? null]
const engagementKey = (id: string) => ["client-signup", "engagement", id]
const activitiesKey = (id: string) => ["client-signup", "activities", id]
const sowKey = (id: string) => ["client-signup", "sow", id]
const sowVersionsKey = (id: string) => ["client-signup", "sow-versions", id]
const invoicingKey = (id: string) => ["client-signup", "invoicing", id]
const changeOrdersKey = (id: string) => ["client-signup", "change-orders", id]

/**
 * Turn a refusal into lines a person can act on.
 *
 * Handles all four bodies the service returns — a gate result, a SOW
 * validation, an invoicing validation, and the bare `{errors: [...]}` shape —
 * plus the case where the failure was not a 409 at all (network, 500, 403), in
 * which case it says so rather than pretending the gate spoke.
 */
export function refusalMessages(error: unknown): string[] {
  const axiosError = error as AxiosError<Record<string, unknown>> | undefined
  const detail = axiosError?.response?.data?.detail as Record<string, unknown> | undefined

  if (!detail || typeof detail !== "object") {
    if (axiosError?.response?.status === 403) {
      return ["You do not have access to the client sign-up process."]
    }
    return [axiosError?.message || "Something went wrong. Nothing was saved."]
  }

  const out: string[] = []

  // A move that is illegal in itself (backwards, skipping, terminal).
  if (typeof detail.error === "string" && detail.error) out.push(detail.error)

  for (const gate of (detail.failed_gates as { label?: string }[] | undefined) ?? []) {
    if (gate?.label) out.push(gate.label)
  }
  for (const field of (detail.missing_fields as { label?: string }[] | undefined) ?? []) {
    if (field?.label) out.push(`${field.label} is required`)
  }
  for (const n of (detail.empty_sections as number[] | undefined) ?? []) {
    out.push(`SOW section ${n} is empty — write "Not applicable" if it does not apply`)
  }
  for (const h of (detail.missing_header as string[] | undefined) ?? []) {
    out.push(`${h} is required`)
  }
  for (const e of (detail.errors as string[] | undefined) ?? []) out.push(e)

  // A 409 whose body we could not read is still a refusal — say so plainly
  // rather than returning an empty list, which renders as silent success.
  return out.length > 0 ? out : ["The change was refused, and nothing was saved."]
}

/** Non-blocking advisories (e.g. a recurring line with no start date). */
export function refusalWarnings(error: unknown): string[] {
  const axiosError = error as AxiosError<Record<string, unknown>> | undefined
  const detail = axiosError?.response?.data?.detail as Record<string, unknown> | undefined
  return ((detail?.warnings as string[] | undefined) ?? []).filter(Boolean)
}

// ─── Access + process ────────────────────────────────────────────

export function useClientSignupAccess() {
  const { user } = useAuth()
  const isSuperAdmin = user?.role === "super-admin"
  return useQuery({
    queryKey: ACCESS_KEY,
    queryFn: getClientSignupAccess,
    enabled: isSuperAdmin,
    staleTime: 5 * 60 * 1000,
  })
}

/**
 * The process reference. Cached for the session — it changes only when the
 * document does, and every surface reads its labels from it.
 */
export function useProcessReference(enabled = true) {
  return useQuery({
    queryKey: PROCESS_KEY,
    queryFn: getProcessReference,
    enabled,
    staleTime: Infinity,
    gcTime: Infinity,
  })
}

// ─── Pipeline ────────────────────────────────────────────────────

export function usePipeline(filters?: {
  stage?: string
  ownerEmail?: string
  includeClosed?: boolean
}) {
  return useQuery({
    queryKey: pipelineKey(filters),
    queryFn: () => listEngagements(filters),
    staleTime: 30 * 1000,
  })
}

export function useEngagement(id: string | undefined) {
  return useQuery({
    queryKey: engagementKey(id ?? ""),
    queryFn: () => getEngagement(id as string),
    enabled: Boolean(id),
  })
}

export function useCreateEngagement() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: EngagementCreatePayload) => createEngagement(payload),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["client-signup", "pipeline"] })
    },
  })
}

export function useUpdateEngagement(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: EngagementUpdatePayload) => updateEngagement(id, payload),
    onSuccess: (engagement) => {
      qc.setQueryData(engagementKey(id), engagement)
      void qc.invalidateQueries({ queryKey: ["client-signup", "pipeline"] })
      // The activity log gained an entry for this edit (§4).
      void qc.invalidateQueries({ queryKey: activitiesKey(id) })
    },
  })
}

/**
 * Move a stage.
 *
 * On refusal NOTHING was written server-side, so there is nothing to roll back
 * here — the caller renders `refusalMessages(error)` and the cached engagement
 * is still accurate. This is why there is no optimistic update: an optimistic
 * stage change would show a move that the gate is about to refuse.
 */
export function useChangeStage(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: StageChangePayload) => changeStage(id, payload),
    onSuccess: (engagement) => {
      qc.setQueryData(engagementKey(id), engagement)
      void qc.invalidateQueries({ queryKey: ["client-signup", "pipeline"] })
      void qc.invalidateQueries({ queryKey: activitiesKey(id) })
    },
  })
}

export function useCanAdvance(id: string | undefined, targetStage: string | null) {
  return useQuery({
    queryKey: ["client-signup", "can-advance", id, targetStage],
    queryFn: () => canAdvance(id as string, targetStage as string),
    enabled: Boolean(id && targetStage),
  })
}

// ─── Activities ──────────────────────────────────────────────────

export function useActivities(id: string | undefined) {
  return useQuery({
    queryKey: activitiesKey(id ?? ""),
    queryFn: () => listActivities(id as string),
    enabled: Boolean(id),
  })
}

export function useAddActivity(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: ActivityCreatePayload) => addActivity(id, payload),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: activitiesKey(id) })
      // Logging activity clears the ten-business-day At Risk flag, which the
      // engagement and the pipeline both render.
      void qc.invalidateQueries({ queryKey: engagementKey(id) })
      void qc.invalidateQueries({ queryKey: ["client-signup", "pipeline"] })
    },
  })
}

// ─── SOW ─────────────────────────────────────────────────────────

export function useSow(id: string | undefined) {
  return useQuery({
    queryKey: sowKey(id ?? ""),
    queryFn: () => getSow(id as string),
    enabled: Boolean(id),
  })
}

export function useSowVersions(id: string | undefined, enabled = true) {
  return useQuery({
    queryKey: sowVersionsKey(id ?? ""),
    queryFn: () => listSowVersions(id as string),
    enabled: Boolean(id) && enabled,
  })
}

export function useSaveSow(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (vars: { document: SowDocument; title?: string; changeSummary?: string }) =>
      saveSow(id, vars.document, {
        title: vars.title,
        changeSummary: vars.changeSummary,
      }),
    onSuccess: (sow) => {
      qc.setQueryData(sowKey(id), sow)
      void qc.invalidateQueries({ queryKey: sowVersionsKey(id) })
      // "SOW drafted" on the §10 checklist is computed from the document.
      void qc.invalidateQueries({ queryKey: engagementKey(id) })
    },
  })
}

export function useSendSow(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => sendSow(id),
    onSuccess: (sow) => {
      qc.setQueryData(sowKey(id), sow)
      void qc.invalidateQueries({ queryKey: sowVersionsKey(id) })
      void qc.invalidateQueries({ queryKey: engagementKey(id) })
      void qc.invalidateQueries({ queryKey: activitiesKey(id) })
    },
  })
}

export function useSignSow(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (vars?: { signedAt?: string; signedDocumentUrl?: string }) =>
      signSow(id, vars),
    onSuccess: (sow) => {
      qc.setQueryData(sowKey(id), sow)
      void qc.invalidateQueries({ queryKey: sowVersionsKey(id) })
      // Signing puts "send the invoicing summary" on Paula's queue (§8).
      void qc.invalidateQueries({ queryKey: engagementKey(id) })
      void qc.invalidateQueries({ queryKey: activitiesKey(id) })
    },
  })
}

// ─── Invoicing ───────────────────────────────────────────────────

export function useInvoicingSummary(id: string | undefined) {
  return useQuery({
    queryKey: invoicingKey(id ?? ""),
    queryFn: () => getInvoicingSummary(id as string),
    enabled: Boolean(id),
  })
}

export function useDraftInvoicingSummary(id: string) {
  return useMutation({ mutationFn: () => draftInvoicingSummary(id) })
}

export function useSaveInvoicingSummary(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (vars: { document: InvoicingDocument; changeNote?: string }) =>
      saveInvoicingSummary(id, vars.document, vars.changeNote),
    onSuccess: (summary) => qc.setQueryData(invoicingKey(id), summary),
  })
}

export function useSendInvoicingSummary(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => sendInvoicingSummary(id),
    onSuccess: (summary) => {
      qc.setQueryData(invoicingKey(id), summary)
      void qc.invalidateQueries({ queryKey: engagementKey(id) })
      void qc.invalidateQueries({ queryKey: activitiesKey(id) })
    },
  })
}

export function useConfirmInvoicingSummary(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (firstInvoiceDate?: string) =>
      confirmInvoicingSummary(id, firstInvoiceDate),
    onSuccess: (summary) => {
      qc.setQueryData(invoicingKey(id), summary)
      void qc.invalidateQueries({ queryKey: engagementKey(id) })
      void qc.invalidateQueries({ queryKey: activitiesKey(id) })
    },
  })
}

// ─── Change orders ───────────────────────────────────────────────

export function useChangeOrders(id: string | undefined) {
  return useQuery({
    queryKey: changeOrdersKey(id ?? ""),
    queryFn: () => listChangeOrders(id as string),
    enabled: Boolean(id),
  })
}

export function useCreateChangeOrder(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: {
      description: string
      schedule_impact?: string
      fee_delta_cents?: number
    }) => createChangeOrder(id, payload),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: changeOrdersKey(id) })
      void qc.invalidateQueries({ queryKey: activitiesKey(id) })
    },
  })
}

export function useSignChangeOrder(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (coId: string) => signChangeOrder(id, coId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: changeOrdersKey(id) })
      // A signed CO reopens Paula's queue — §8 wants a revised summary.
      void qc.invalidateQueries({ queryKey: engagementKey(id) })
      void qc.invalidateQueries({ queryKey: activitiesKey(id) })
    },
  })
}
