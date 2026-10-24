/**
 * React Query hooks for Administration → Curriculum (CUR-2).
 *
 * Service → Hook → Component, as Culture Docs. Every mutation that changes a
 * catalog's content invalidates that catalog's detail, which carries the
 * publish check, so the publish panel never shows a stale verdict.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  createCatalog,
  createInstitution,
  deleteCatalog,
  deleteCourse,
  deleteProgram,
  getCatalog,
  getCurriculumStatus,
  getOutcomeCoverage,
  getProgramOutcomes,
  getRoleFamilies,
  importCatalog,
  listCatalogs,
  listInstitutions,
  publishCatalog,
  replaceProgramOutcomes,
  updateInstitution,
  upsertCourse,
  upsertProgram,
} from "@/services/curriculum/curriculum.service"
import { sameYearDraft } from "@/lib/curriculum/catalogVersions"
import type {
  Catalog,
  CourseInput,
  ImportInput,
  ImportResult,
  Institution,
  InstitutionInput,
  OutcomeInput,
  ProgramInput,
} from "@/types/curriculum"

const ROOT = ["curriculum-admin"] as const
export const curriculumKeys = {
  status: [...ROOT, "status"] as const,
  institutions: [...ROOT, "institutions"] as const,
  catalogs: (institutionId: string) => [...ROOT, "catalogs", institutionId] as const,
  catalog: (catalogId: string) => [...ROOT, "catalog", catalogId] as const,
  roleFamilies: [...ROOT, "role-families"] as const,
  programOutcomes: (programId: string) => [...ROOT, "program-outcomes", programId] as const,
  outcomeCoverage: (catalogId: string) => [...ROOT, "outcome-coverage", catalogId] as const,
}

/** `{enabled, tablesReady}` — the one route that answers while the switch is off. */
export function useCurriculumStatus() {
  return useQuery({
    queryKey: curriculumKeys.status,
    queryFn: getCurriculumStatus,
    retry: false,
  })
}

export function useCurriculumInstitutions(enabled: boolean) {
  return useQuery({
    queryKey: curriculumKeys.institutions,
    queryFn: listInstitutions,
    enabled,
    retry: false,
  })
}

export function useCurriculumCatalogs(institutionId: string | null) {
  return useQuery({
    queryKey: curriculumKeys.catalogs(institutionId ?? ""),
    queryFn: () => listCatalogs(institutionId as string),
    enabled: !!institutionId,
    retry: false,
  })
}

export function useCurriculumCatalog(catalogId: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: curriculumKeys.catalog(catalogId ?? ""),
    queryFn: () => getCatalog(catalogId as string),
    enabled: enabled && !!catalogId,
    retry: false,
  })
}

export function useSaveInstitution() {
  const qc = useQueryClient()
  return useMutation<Institution, unknown, { id?: string; body: InstitutionInput }>({
    mutationFn: ({ id, body }) => (id ? updateInstitution(id, body) : createInstitution(body)),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: curriculumKeys.institutions })
    },
  })
}

export function useCreateCatalog() {
  const qc = useQueryClient()
  return useMutation<
    Catalog,
    unknown,
    { institutionId: string; catalogYear: string; fromCatalogId?: string | null }
  >({
    mutationFn: ({ institutionId, catalogYear, fromCatalogId }) =>
      createCatalog(institutionId, { catalogYear, fromCatalogId: fromCatalogId ?? null }),
    onSuccess: (_c, v) => {
      void qc.invalidateQueries({ queryKey: curriculumKeys.catalogs(v.institutionId) })
    },
  })
}

/**
 * "Edit" on a published catalog (CUR-UNLOCK): open the draft of the same
 * school and year if one is already in progress; otherwise start one as a
 * copy of `source` — the same call "New version" makes. The school's catalog
 * list is re-read first, so a draft started a moment ago is found rather than
 * duplicated. Two admins clicking at the same instant can still race; only a
 * server-side guard would close that.
 */
export function useOpenOrStartDraft() {
  const qc = useQueryClient()
  return useMutation<{ catalog: Catalog; created: boolean }, unknown, Catalog>({
    mutationFn: async (source) => {
      const catalogs = await qc.fetchQuery({
        queryKey: curriculumKeys.catalogs(source.institutionId),
        queryFn: () => listCatalogs(source.institutionId),
        staleTime: 0,
      })
      const existing = sameYearDraft(catalogs, source)
      if (existing) return { catalog: existing, created: false }
      const catalog = await createCatalog(source.institutionId, {
        catalogYear: source.catalogYear,
        fromCatalogId: source.id,
      })
      return { catalog, created: true }
    },
    onSuccess: (result, source) => {
      if (result.created) void qc.invalidateQueries({ queryKey: curriculumKeys.catalogs(source.institutionId) })
    },
  })
}

export function useDeleteCatalog(institutionId: string) {
  const qc = useQueryClient()
  return useMutation<void, unknown, string>({
    mutationFn: (catalogId) => deleteCatalog(catalogId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: curriculumKeys.catalogs(institutionId) })
    },
  })
}

function useCatalogMutation<V, R>(catalogId: string, fn: (v: V) => Promise<R>) {
  const qc = useQueryClient()
  return useMutation<R, unknown, V>({
    mutationFn: fn,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: curriculumKeys.catalog(catalogId) })
    },
  })
}

export function useSaveCourse(catalogId: string) {
  return useCatalogMutation(catalogId, (body: CourseInput) => upsertCourse(catalogId, body))
}

export function useDeleteCourse(catalogId: string) {
  return useCatalogMutation(catalogId, (code: string) => deleteCourse(catalogId, code))
}

export function useSaveProgram(catalogId: string) {
  return useCatalogMutation(catalogId, (body: ProgramInput) => upsertProgram(catalogId, body))
}

export function useDeleteProgram(catalogId: string) {
  return useCatalogMutation(catalogId, (code: string) => deleteProgram(catalogId, code))
}

/** A dry run writes nothing; the catalog is refetched either way, which is harmless. */
export function useImportCatalog(catalogId: string) {
  return useCatalogMutation<ImportInput, ImportResult>(catalogId, (body) =>
    importCatalog(catalogId, body)
  )
}

/* ─── Program outcomes (CUR-3) ─────────────────────────────────────────── */

/** The nine role families, the per-program cap and the SOC note — static on the server. */
export function useRoleFamilies(enabled = true) {
  return useQuery({
    queryKey: curriculumKeys.roleFamilies,
    queryFn: getRoleFamilies,
    enabled,
    staleTime: Infinity,
    retry: false,
  })
}

export function useProgramOutcomes(programId: string | null) {
  return useQuery({
    queryKey: curriculumKeys.programOutcomes(programId ?? ""),
    queryFn: () => getProgramOutcomes(programId as string),
    enabled: !!programId,
    retry: false,
  })
}

export function useOutcomeCoverage(catalogId: string) {
  return useQuery({
    queryKey: curriculumKeys.outcomeCoverage(catalogId),
    queryFn: () => getOutcomeCoverage(catalogId),
    retry: false,
  })
}

/**
 * Replace a program's outcomes. Refetches that program's outcomes (the admin
 * read carries each link's title and status), the catalog's coverage and the
 * catalog itself (whose programs carry `outcomes`).
 */
export function useSaveProgramOutcomes(catalogId: string, programId: string) {
  const qc = useQueryClient()
  return useMutation<void, unknown, OutcomeInput[]>({
    mutationFn: (outcomes) => replaceProgramOutcomes(programId, outcomes),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: curriculumKeys.programOutcomes(programId) })
      void qc.invalidateQueries({ queryKey: curriculumKeys.outcomeCoverage(catalogId) })
      void qc.invalidateQueries({ queryKey: curriculumKeys.catalog(catalogId) })
    },
  })
}

export function usePublishCatalog(catalogId: string, institutionId: string | undefined) {
  const qc = useQueryClient()
  return useMutation<Catalog, unknown, void>({
    mutationFn: () => publishCatalog(catalogId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: curriculumKeys.catalog(catalogId) })
      if (institutionId) void qc.invalidateQueries({ queryKey: curriculumKeys.catalogs(institutionId) })
    },
  })
}
