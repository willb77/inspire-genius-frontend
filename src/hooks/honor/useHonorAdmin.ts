// The Honor Foundation — Coach Workbench: Administration React Query hooks.
//
// Queries + mutations over admin.service. Mutations invalidate the affected list
// key(s) on success so tables re-read. Reads are resilient: `retry: false` so a
// pre-deploy 404 fails fast into the console's inline "backend not available"
// state instead of hammering the route.

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryOptions,
} from "@tanstack/react-query"
import type { AxiosError } from "axios"
import {
  assignCoach,
  assignFellow,
  createCareerArea,
  createCoach,
  createCohort,
  deleteCareerArea,
  deleteCoach,
  deleteCohort,
  deleteFellow,
  getCohort,
  importCoaches,
  importFellows,
  listCareerAreas,
  listCoaches,
  listCohorts,
  listFellows,
  unassignCoach,
  unassignFellow,
  updateCareerArea,
  updateCohort,
  updateFellow,
} from "@/services/honor/admin.service"
import type {
  AdminCoach,
  AdminCoachCreate,
  AdminFellow,
  AdminFellowUpdate,
  CareerArea,
  CareerAreaCreate,
  CareerAreaUpdate,
  CohortCreate,
  CohortDetail,
  CohortSummary,
  CohortUpdate,
} from "@/types/honor/admin"

const HK = "honor-admin"

export const HONOR_ADMIN_KEYS = {
  cohorts: [HK, "cohorts"] as const,
  cohort: (id: string) => [HK, "cohort", id] as const,
  careerAreas: [HK, "career-areas"] as const,
  coaches: [HK, "coaches"] as const,
  fellows: [HK, "fellows"] as const,
}

// ── Cohorts ──────────────────────────────────────────────────────────────────

export function useCohorts(options?: Partial<UseQueryOptions<CohortSummary[], AxiosError>>) {
  return useQuery<CohortSummary[], AxiosError>({
    queryKey: HONOR_ADMIN_KEYS.cohorts,
    queryFn: listCohorts,
    retry: false,
    ...options,
  })
}

export function useCohort(
  id: string | undefined,
  options?: Partial<UseQueryOptions<CohortDetail, AxiosError>>,
) {
  return useQuery<CohortDetail, AxiosError>({
    queryKey: HONOR_ADMIN_KEYS.cohort(id ?? "none"),
    queryFn: () => getCohort(id as string),
    enabled: !!id,
    retry: false,
    ...options,
  })
}

export function useCreateCohort() {
  const qc = useQueryClient()
  return useMutation<CohortSummary, AxiosError, CohortCreate>({
    mutationFn: createCohort,
    onSuccess: () => qc.invalidateQueries({ queryKey: HONOR_ADMIN_KEYS.cohorts }),
  })
}

export function useUpdateCohort() {
  const qc = useQueryClient()
  return useMutation<CohortSummary, AxiosError, { id: string; input: CohortUpdate }>({
    mutationFn: ({ id, input }) => updateCohort(id, input),
    onSuccess: (_r, { id }) => {
      qc.invalidateQueries({ queryKey: HONOR_ADMIN_KEYS.cohorts })
      qc.invalidateQueries({ queryKey: HONOR_ADMIN_KEYS.cohort(id) })
    },
  })
}

export function useDeleteCohort() {
  const qc = useQueryClient()
  return useMutation<void, AxiosError, string>({
    mutationFn: deleteCohort,
    onSuccess: () => qc.invalidateQueries({ queryKey: HONOR_ADMIN_KEYS.cohorts }),
  })
}

// ── Career areas ─────────────────────────────────────────────────────────────

export function useCareerAreas(options?: Partial<UseQueryOptions<CareerArea[], AxiosError>>) {
  return useQuery<CareerArea[], AxiosError>({
    queryKey: HONOR_ADMIN_KEYS.careerAreas,
    queryFn: listCareerAreas,
    retry: false,
    ...options,
  })
}

export function useCreateCareerArea() {
  const qc = useQueryClient()
  return useMutation<CareerArea, AxiosError, CareerAreaCreate>({
    mutationFn: createCareerArea,
    onSuccess: () => qc.invalidateQueries({ queryKey: HONOR_ADMIN_KEYS.careerAreas }),
  })
}

export function useUpdateCareerArea() {
  const qc = useQueryClient()
  return useMutation<CareerArea, AxiosError, { id: string; input: CareerAreaUpdate }>({
    mutationFn: ({ id, input }) => updateCareerArea(id, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: HONOR_ADMIN_KEYS.careerAreas }),
  })
}

export function useDeleteCareerArea() {
  const qc = useQueryClient()
  return useMutation<void, AxiosError, string>({
    mutationFn: deleteCareerArea,
    onSuccess: () => qc.invalidateQueries({ queryKey: HONOR_ADMIN_KEYS.careerAreas }),
  })
}

// ── Coaches ──────────────────────────────────────────────────────────────────

export function useAdminCoaches(options?: Partial<UseQueryOptions<AdminCoach[], AxiosError>>) {
  return useQuery<AdminCoach[], AxiosError>({
    queryKey: HONOR_ADMIN_KEYS.coaches,
    queryFn: listCoaches,
    retry: false,
    ...options,
  })
}

export function useCreateCoach() {
  const qc = useQueryClient()
  return useMutation<AdminCoach, AxiosError, AdminCoachCreate>({
    mutationFn: createCoach,
    onSuccess: () => qc.invalidateQueries({ queryKey: HONOR_ADMIN_KEYS.coaches }),
  })
}

export function useImportCoaches() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (rows: Array<Record<string, string>>) => importCoaches(rows),
    onSuccess: () => qc.invalidateQueries({ queryKey: HONOR_ADMIN_KEYS.coaches }),
  })
}

export function useDeleteCoach() {
  const qc = useQueryClient()
  return useMutation<void, AxiosError, string>({
    mutationFn: deleteCoach,
    onSuccess: () => qc.invalidateQueries({ queryKey: HONOR_ADMIN_KEYS.coaches }),
  })
}

// ── Fellows ──────────────────────────────────────────────────────────────────

export function useAdminFellows(options?: Partial<UseQueryOptions<AdminFellow[], AxiosError>>) {
  return useQuery<AdminFellow[], AxiosError>({
    queryKey: HONOR_ADMIN_KEYS.fellows,
    queryFn: listFellows,
    retry: false,
    ...options,
  })
}

export function useUpdateFellow() {
  const qc = useQueryClient()
  return useMutation<AdminFellow, AxiosError, { id: string; input: AdminFellowUpdate }>({
    mutationFn: ({ id, input }) => updateFellow(id, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: HONOR_ADMIN_KEYS.fellows }),
  })
}

export function useDeleteFellow() {
  const qc = useQueryClient()
  return useMutation<void, AxiosError, string>({
    mutationFn: deleteFellow,
    onSuccess: () => qc.invalidateQueries({ queryKey: HONOR_ADMIN_KEYS.fellows }),
  })
}

export function useImportFellows() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (rows: Array<Record<string, string>>) => importFellows(rows),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: HONOR_ADMIN_KEYS.fellows })
      qc.invalidateQueries({ queryKey: ["honor", "caseload"] })
    },
  })
}

// ── Assignments ──────────────────────────────────────────────────────────────

export function useAssignFellow() {
  const qc = useQueryClient()
  return useMutation<void, AxiosError, { cohortId: string; fellowId: string }>({
    mutationFn: ({ cohortId, fellowId }) => assignFellow(cohortId, fellowId),
    onSuccess: (_r, { cohortId }) => invalidateCohort(qc, cohortId),
  })
}

export function useUnassignFellow() {
  const qc = useQueryClient()
  return useMutation<void, AxiosError, { cohortId: string; fellowId: string }>({
    mutationFn: ({ cohortId, fellowId }) => unassignFellow(cohortId, fellowId),
    onSuccess: (_r, { cohortId }) => invalidateCohort(qc, cohortId),
  })
}

export function useAssignCoach() {
  const qc = useQueryClient()
  return useMutation<void, AxiosError, { cohortId: string; coachSub: string }>({
    mutationFn: ({ cohortId, coachSub }) => assignCoach(cohortId, coachSub),
    onSuccess: (_r, { cohortId }) => invalidateCohort(qc, cohortId),
  })
}

export function useUnassignCoach() {
  const qc = useQueryClient()
  return useMutation<void, AxiosError, { cohortId: string; coachSub: string }>({
    mutationFn: ({ cohortId, coachSub }) => unassignCoach(cohortId, coachSub),
    onSuccess: (_r, { cohortId }) => invalidateCohort(qc, cohortId),
  })
}

function invalidateCohort(qc: ReturnType<typeof useQueryClient>, cohortId: string) {
  qc.invalidateQueries({ queryKey: HONOR_ADMIN_KEYS.cohort(cohortId) })
  qc.invalidateQueries({ queryKey: HONOR_ADMIN_KEYS.cohorts })
}
