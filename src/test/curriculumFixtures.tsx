import type { ReactElement } from "react"
import { render } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { MemoryRouter, Route, Routes } from "react-router-dom"
import type { CatalogDetail, Course, CurriculumReport, Program } from "@/types/curriculum"

/** Shared fixtures for the Curriculum admin tests (CUR-2). Fictional data only. */

export const CLEAN_REPORT: CurriculumReport = {
  ok: true,
  counts: { courses: 2, programs: 1, requirementGroups: 1, prerequisiteLinks: 1 },
  errors: [],
  unknownCodes: [],
  cycles: [],
  credits: [{ program: "P1", declared: 6, requiredCredits: 6, minimumToComplete: 6, matches: true }],
  warnings: [],
}

export const CYCLE_REPORT: CurriculumReport = {
  ...CLEAN_REPORT,
  ok: false,
  cycles: [["ENG 112", "ENG 111", "ENG 112"]],
  unknownCodes: [{ code: "XYZ 999", row: 4, file: "courses", referencedBy: "course ENG 112 (prereq)" }],
  errors: [{ file: "courses", row: 3, message: "course ENG 113: no title" }],
  credits: [{ program: "P1", declared: 60, requiredCredits: 6, minimumToComplete: 6, matches: false }],
  warnings: ["program P1: declares 60 credits; its requirement groups add up to at least 6"],
}

export const COURSES: Course[] = [
  { code: "MAT 121", title: "Algebra I", credits: 3, description: null, termsOffered: ["fall"], prerequisites: [] },
  {
    code: "MAT 122",
    title: "Algebra II",
    credits: 3,
    description: null,
    termsOffered: [],
    prerequisites: [{ code: "MAT 121", kind: "prereq", altGroup: 1, minGrade: "C" }],
  },
]

export const PROGRAMS: Program[] = [
  {
    code: "P1",
    title: "Example Program",
    credential: "AAS",
    totalCredits: 6,
    cipCode: null,
    description: null,
    requirements: [
      { groupName: "Core", rule: "required", n: null, minCredits: null, courses: ["MAT 122"], position: 0 },
    ],
  },
]

export function catalogDetail(overrides: Partial<CatalogDetail["catalog"]> = {}, report = CLEAN_REPORT): CatalogDetail {
  return {
    catalog: {
      id: "cat-1",
      institutionId: "inst-1",
      catalogYear: "2026-2027",
      version: 1,
      status: "draft",
      publishedAt: null,
      ...overrides,
    },
    courses: COURSES,
    programs: PROGRAMS,
    publishCheck: report,
  }
}

export const http = (status: number, detail: unknown) =>
  Object.assign(new Error(`HTTP ${status}`), { response: { status, data: { detail } } })

/** Render inside a fresh QueryClient and a router at `path` (matched by `pattern`). */
export function renderCurriculum(ui: ReactElement, path = "/", pattern = "*") {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path={pattern} element={ui} />
          <Route path="/super-admin/curriculum/catalogs/:catalogId" element={<p>catalog page</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  )
}
