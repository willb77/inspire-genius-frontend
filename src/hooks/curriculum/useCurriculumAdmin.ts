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
  importCatalog,
  listCatalogs,
  listInstitutions,
  publishCatalog,
  updateInstitution,
  upsertCourse,
  upsertProgram,
} from "@/services/curriculum/curriculum.service"
import type {
  Catalog,
  CourseInput,
  ImportInput,
  ImportResult,
  Institution,
  InstitutionInput,
  ProgramInput,
} from "@/types/curriculum"

const ROOT = ["curriculum-admin"] as const
export const curriculumKeys = {
  status: [...ROOT, "status"] as const,
  institutions: [...ROOT, "institutions"] as const,
  catalogs: (institutionId: string) => [...ROOT, "catalogs", institutionId] as const,
  catalog: (catalogId: string) => [...ROOT, "catalog", catalogId] as const,
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
