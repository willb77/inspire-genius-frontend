import { agentApi } from "@/lib/agentApi"
import type { VerticalApiResponse } from "@/verticals/core"
import type {
  Catalog,
  CatalogDetail,
  Course,
  CourseInput,
  CurriculumStatus,
  ImportInput,
  ImportResult,
  Institution,
  InstitutionInput,
  Program,
  ProgramInput,
} from "@/types/curriculum"

/**
 * Administration → Curriculum (CUR-2) — the CUR-1 admin API.
 *
 * Served by the Agent Engine under the Career & Education Discovery prefix
 * (`/v1/agents/career-discovery`, the only prefix API Gateway routes to the
 * engine), so every call goes through `agentApi`. Super-admin only, enforced
 * server-side on every route; the switch `curriculum` keeps all of it dark
 * except `/admin/status`.
 */
const ADMIN = "/v1/agents/career-discovery/curriculum/admin"

function unwrap<T>(body: VerticalApiResponse<T>): T {
  return body.data as T
}

const enc = encodeURIComponent

export async function getCurriculumStatus(): Promise<CurriculumStatus> {
  const { data } = await agentApi.get<VerticalApiResponse<CurriculumStatus>>(`${ADMIN}/status`)
  return unwrap(data)
}

export async function listInstitutions(): Promise<Institution[]> {
  const { data } = await agentApi.get<VerticalApiResponse<{ institutions: Institution[] }>>(
    `${ADMIN}/institutions`
  )
  return unwrap(data).institutions
}

export async function createInstitution(body: InstitutionInput): Promise<Institution> {
  const { data } = await agentApi.post<VerticalApiResponse<{ institution: Institution }>>(
    `${ADMIN}/institutions`,
    body
  )
  return unwrap(data).institution
}

export async function updateInstitution(id: string, body: InstitutionInput): Promise<Institution> {
  const { data } = await agentApi.patch<VerticalApiResponse<{ institution: Institution }>>(
    `${ADMIN}/institutions/${enc(id)}`,
    body
  )
  return unwrap(data).institution
}

export async function listCatalogs(institutionId: string): Promise<Catalog[]> {
  const { data } = await agentApi.get<VerticalApiResponse<{ catalogs: Catalog[] }>>(
    `${ADMIN}/institutions/${enc(institutionId)}/catalogs`
  )
  return unwrap(data).catalogs
}

/** A new DRAFT catalog; with `fromCatalogId` it starts as a copy (a new version). */
export async function createCatalog(
  institutionId: string,
  body: { catalogYear: string; fromCatalogId?: string | null }
): Promise<Catalog> {
  const { data } = await agentApi.post<VerticalApiResponse<{ catalog: Catalog }>>(
    `${ADMIN}/institutions/${enc(institutionId)}/catalogs`,
    body
  )
  return unwrap(data).catalog
}

export async function getCatalog(catalogId: string): Promise<CatalogDetail> {
  const { data } = await agentApi.get<VerticalApiResponse<CatalogDetail>>(
    `${ADMIN}/catalogs/${enc(catalogId)}`
  )
  return unwrap(data)
}

export async function deleteCatalog(catalogId: string): Promise<void> {
  await agentApi.delete(`${ADMIN}/catalogs/${enc(catalogId)}`)
}

export async function upsertCourse(catalogId: string, body: CourseInput): Promise<Course> {
  const { data } = await agentApi.put<VerticalApiResponse<{ course: Course }>>(
    `${ADMIN}/catalogs/${enc(catalogId)}/courses`,
    body
  )
  return unwrap(data).course
}

export async function deleteCourse(catalogId: string, code: string): Promise<void> {
  await agentApi.delete(`${ADMIN}/catalogs/${enc(catalogId)}/courses`, { params: { code } })
}

export async function upsertProgram(catalogId: string, body: ProgramInput): Promise<Program> {
  const { data } = await agentApi.put<VerticalApiResponse<{ program: Program }>>(
    `${ADMIN}/catalogs/${enc(catalogId)}/programs`,
    body
  )
  return unwrap(data).program
}

export async function deleteProgram(catalogId: string, code: string): Promise<void> {
  await agentApi.delete(`${ADMIN}/catalogs/${enc(catalogId)}/programs`, { params: { code } })
}

/** `dryRun` is always sent explicitly: the server defaults it to true, and so does every caller here. */
export async function importCatalog(catalogId: string, body: ImportInput): Promise<ImportResult> {
  const { data } = await agentApi.post<VerticalApiResponse<ImportResult>>(
    `${ADMIN}/catalogs/${enc(catalogId)}/import`,
    { coursesCsv: body.coursesCsv, programsCsv: body.programsCsv, dryRun: body.dryRun }
  )
  return unwrap(data)
}

export async function publishCatalog(catalogId: string): Promise<Catalog> {
  const { data } = await agentApi.post<VerticalApiResponse<{ catalog: Catalog }>>(
    `${ADMIN}/catalogs/${enc(catalogId)}/publish`
  )
  return unwrap(data).catalog
}
