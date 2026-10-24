import { useEffect } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type { AxiosError } from "axios"
import {
  advanceDiscovery,
  getDiscoveryAlignment,
  getDiscoveryAlignmentJob,
  getDiscoveryCareers,
  getDiscoveryCost,
  getDiscoveryEducation,
  getDiscoveryGoals,
  getDiscoveryJourney,
  getDiscoveryPays,
  getDiscoveryPlan,
  getDiscoveryPortrait,
  getDiscoverySchools,
  getDiscoveryStatus,
  getProgramSchools,
  getProgramSuggestions,
  recordDiscoveryAge,
  saveDiscoveryAbout,
  saveProgramChoice,
  startDiscoveryAlignment,
} from "@/services/career-discovery/careerDiscovery.service"
import type {
  DiscoveryAlignment,
  CostQuery,
  DiscoveryCareers,
  DiscoveryCost,
  DiscoveryEducation,
  DiscoveryGoals,
  DiscoveryJob,
  DiscoveryJourney,
  DiscoveryPays,
  DiscoveryPlan,
  DiscoveryProgramSchools,
  DiscoveryPrograms,
  DiscoverySchools,
  DiscoveryStatus,
  ProgramChoice,
  SavedProgramChoice,
  SchoolsQuery,
} from "@/types/career-discovery"
import type { SelfPortrait } from "@/types/lumen"

/**
 * Career & Education Discovery (DISC-1) hooks. Every stage hook is disabled
 * until the journey says the person may proceed (an age band of 13+ is on
 * record) — the server refuses those calls anyway, and asking would only
 * produce a 403 to explain.
 */

export const discoveryKeys = {
  all: ["career-discovery"] as const,
  status: ["career-discovery", "status"] as const,
  journey: ["career-discovery", "journey"] as const,
  portrait: ["career-discovery", "portrait"] as const,
  careers: ["career-discovery", "careers"] as const,
  pays: ["career-discovery", "pays"] as const,
  goals: ["career-discovery", "goals"] as const,
  alignment: ["career-discovery", "alignment"] as const,
  job: (id: string) => ["career-discovery", "alignment", "job", id] as const,
  plan: ["career-discovery", "plan"] as const,
  education: ["career-discovery", "education"] as const,
  schools: (q: SchoolsQuery | null) =>
    ["career-discovery", "education", "schools", q?.cip ?? "", q?.level ?? 0, q?.state ?? ""] as const,
  cost: (q: CostQuery | null) =>
    ["career-discovery", "cost", q?.cip ?? "", q?.level ?? 0, q?.school ?? 0] as const,
  programSchools: ["career-discovery", "programs", "schools"] as const,
  programs: (school: string | null) => ["career-discovery", "programs", "list", school ?? ""] as const,
}

/** The server's message for a failed call, or a plain fallback. */
export function discoveryErrorMessage(error: unknown): string {
  const detail = (error as AxiosError<{ detail?: unknown }>)?.response?.data?.detail
  if (typeof detail === "string" && detail.trim()) return detail
  return "Something went wrong loading this. Refresh to try again."
}

export function useDiscoveryStatus() {
  return useQuery<DiscoveryStatus | undefined, AxiosError>({
    queryKey: discoveryKeys.status,
    queryFn: async () => (await getDiscoveryStatus()).data,
    retry: false,
  })
}

export function useDiscoveryJourney(enabled = true) {
  return useQuery<DiscoveryJourney | undefined, AxiosError>({
    queryKey: discoveryKeys.journey,
    queryFn: async () => (await getDiscoveryJourney()).data,
    enabled,
    retry: false,
  })
}

function useStageQuery<T>(key: readonly unknown[], fn: () => Promise<{ data?: T }>, enabled: boolean) {
  const qc = useQueryClient()
  const query = useQuery<T | undefined, AxiosError>({
    queryKey: key,
    queryFn: async () => (await fn()).data,
    enabled,
    retry: false,
  })
  // A stage read can record the stage server-side; refresh the map after it.
  const settled = query.isSuccess
  useEffect(() => {
    if (settled) void qc.invalidateQueries({ queryKey: discoveryKeys.journey })
  }, [settled, qc])
  return query
}

export const useDiscoveryPortrait = (enabled: boolean) =>
  useStageQuery<SelfPortrait>(discoveryKeys.portrait, getDiscoveryPortrait, enabled)
export const useDiscoveryCareers = (enabled: boolean) =>
  useStageQuery<DiscoveryCareers>(discoveryKeys.careers, getDiscoveryCareers, enabled)
export const useDiscoveryPays = (enabled: boolean) =>
  useStageQuery<DiscoveryPays>(discoveryKeys.pays, getDiscoveryPays, enabled)
export const useDiscoveryGoals = (enabled: boolean) =>
  useStageQuery<DiscoveryGoals>(discoveryKeys.goals, getDiscoveryGoals, enabled)
export const useDiscoveryPlan = (enabled: boolean) =>
  useStageQuery<DiscoveryPlan>(discoveryKeys.plan, getDiscoveryPlan, enabled)
/** DISC-2: Education paths. Reading them records the stage, so the map refreshes after. */
export const useDiscoveryEducation = (enabled: boolean) =>
  useStageQuery<DiscoveryEducation>(discoveryKeys.education, getDiscoveryEducation, enabled)

/** DISC-2: schools for one path, fetched only once a field, level and state are chosen. */
export function useDiscoverySchools(query: SchoolsQuery | null) {
  return useQuery<DiscoverySchools | undefined, AxiosError>({
    queryKey: discoveryKeys.schools(query),
    queryFn: async () => (await getDiscoverySchools(query as SchoolsQuery)).data,
    enabled: query !== null,
    retry: false,
    staleTime: 60 * 60 * 1000,
  })
}

/** DISC-3: Cost and payback for one school's program. Reading it can record the stage. */
export function useDiscoveryCost(query: CostQuery | null, enabled: boolean) {
  const qc = useQueryClient()
  const q = useQuery<DiscoveryCost | undefined, AxiosError>({
    queryKey: discoveryKeys.cost(query),
    queryFn: async () => (await getDiscoveryCost(query as CostQuery)).data,
    enabled: enabled && query !== null,
    retry: false,
    staleTime: 60 * 60 * 1000,
  })
  const settled = q.isSuccess
  useEffect(() => {
    if (settled) void qc.invalidateQueries({ queryKey: discoveryKeys.journey })
  }, [settled, qc])
  return q
}

/** DISC-4: schools with a published catalog. Only asked for when the server offers programs. */
export function useProgramSchools(enabled: boolean) {
  return useQuery<DiscoveryProgramSchools | undefined, AxiosError>({
    queryKey: discoveryKeys.programSchools,
    queryFn: async () => (await getProgramSchools()).data,
    enabled,
    retry: false,
  })
}

/** DISC-4: one school's programs, ranked and explained by the server. Reading writes nothing. */
export function useProgramSuggestions(school: string | null, enabled: boolean) {
  return useQuery<DiscoveryPrograms | undefined, AxiosError>({
    queryKey: discoveryKeys.programs(school),
    queryFn: async () => (await getProgramSuggestions(school)).data,
    enabled,
    retry: false,
  })
}

/** DISC-4: save the chosen school and program (ids only), then re-read both lists. */
export function useSaveProgramChoice() {
  const qc = useQueryClient()
  return useMutation<SavedProgramChoice | undefined, AxiosError, ProgramChoice>({
    mutationFn: async (body) => (await saveProgramChoice(body)).data,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["career-discovery", "programs"] })
      void qc.invalidateQueries({ queryKey: discoveryKeys.journey })
    },
  })
}

function useJourneyMutation<V>(fn: (v: V) => Promise<{ data?: DiscoveryJourney }>) {
  const qc = useQueryClient()
  return useMutation<DiscoveryJourney | undefined, AxiosError, V>({
    mutationFn: async (v) => (await fn(v)).data,
    onSuccess: (journey) => {
      if (journey) qc.setQueryData(discoveryKeys.journey, journey)
      void qc.invalidateQueries({ queryKey: discoveryKeys.all })
    },
  })
}

export const useRecordAge = () => useJourneyMutation<number>(recordDiscoveryAge)
export const useSaveAbout = () =>
  useJourneyMutation<{ schoolLevel: string | null; interests: string[] }>(saveDiscoveryAbout)
export const useAdvanceDiscovery = () =>
  useJourneyMutation<{ stageId: string; state?: string }>(advanceDiscovery)

export const ALIGNMENT_POLL_MS = 2500

/** Goals vs wiring: the stored result, a running job, and a way to start one. */
export function useDiscoveryAlignment(enabled: boolean) {
  const qc = useQueryClient()
  const stored = useQuery<DiscoveryAlignment | undefined, AxiosError>({
    queryKey: discoveryKeys.alignment,
    queryFn: async () => (await getDiscoveryAlignment()).data,
    enabled,
    retry: false,
  })
  const liveId =
    stored.data?.job && ["queued", "running"].includes(stored.data.job.status)
      ? stored.data.job.jobId
      : null
  const job = useQuery<DiscoveryJob | undefined, AxiosError>({
    queryKey: discoveryKeys.job(liveId ?? "none"),
    queryFn: async () => (await getDiscoveryAlignmentJob(liveId as string)).data,
    enabled: enabled && Boolean(liveId),
    retry: false,
    refetchInterval: (q) =>
      q.state.data && ["complete", "error"].includes(q.state.data.status) ? false : ALIGNMENT_POLL_MS,
  })
  const finished = job.data && ["complete", "error"].includes(job.data.status)
  useEffect(() => {
    if (finished) {
      void qc.invalidateQueries({ queryKey: discoveryKeys.alignment })
      void qc.invalidateQueries({ queryKey: discoveryKeys.journey })
    }
  }, [finished, qc])
  const start = useMutation<DiscoveryJob | undefined, AxiosError, void>({
    mutationFn: async () => (await startDiscoveryAlignment()).data,
    onSuccess: () => void qc.invalidateQueries({ queryKey: discoveryKeys.alignment }),
  })
  return { stored, job, start, running: Boolean(liveId) }
}
