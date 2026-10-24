import { ROUTES } from "@/constants/routes"
import type { CurriculumReport, RequirementGroup } from "@/types/curriculum"
import type { ImportValues } from "./curriculum.schemas"

/** Small pure helpers shared by the Curriculum admin components. */

export type DryRun = { coursesCsv: string; programsCsv: string; report: CurriculumReport }

/**
 * May a real import be sent? Only after a dry run of EXACTLY these two texts
 * came back clean, and only into a draft. The server refuses a dirty import
 * on its own (409 with the report); this keeps the button honest so nobody
 * clicks "Import" to find out what a dry run would have told them.
 */
export function canImport(editable: boolean, dryRun: DryRun | null, current: ImportValues): boolean {
  return (
    editable &&
    dryRun !== null &&
    dryRun.report.ok &&
    dryRun.coursesCsv === current.coursesCsv &&
    dryRun.programsCsv === current.programsCsv
  )
}

export function catalogPath(catalogId: string): string {
  return ROUTES.SUPER_ADMIN.CURRICULUM_CATALOG.replace(":catalogId", encodeURIComponent(catalogId))
}

/** A cycle as the server names it: `ENG 112 → ENG 111 → ENG 112`. */
export function formatCycle(chain: string[]): string {
  return chain.join(" → ")
}

/** `Core: choose 2 — MAT 121, MAT 122, MAT 171`. */
export function describeGroup(g: RequirementGroup): string {
  const rule =
    g.rule === "choose_n" ? `choose ${g.n}` : g.rule === "min_credits" ? `at least ${g.minCredits} credits` : "all of"
  return `${g.groupName}: ${rule} — ${g.courses.join(", ") || "no courses"}`
}
