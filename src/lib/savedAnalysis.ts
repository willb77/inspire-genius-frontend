import type { SavedAnalysis } from "@/services/manager/development/growthService"
import type { SavedScenario } from "@/types/character-lab"

/**
 * Reading `growth.team_studio_analyses.inputs`, which is opaque JSONB.
 *
 * The server stores whatever the client that wrote the row put in `inputs` and
 * validates none of it (`AnalysisCreate.inputs: Optional[dict]`). So every
 * reader is reading untrusted shape, and the only safe posture is to narrow
 * each field and degrade visibly when it is not there. Getting this wrong is
 * cheap to do and expensive to notice: a `String(undefined)` puts the literal
 * "undefined" into a manager's exported document.
 *
 * The table is empty on both tiers (0 rows on dev and 0 on staging-b,
 * 2026-09-30), so every row that will ever exist is one this client wrote —
 * but that is true only until something else writes one, which is exactly when
 * a permissive reader starts lying.
 */

/** The fields this client writes into `inputs`, once narrowed. */
export type SavedRun = {
  id: string
  /** Falls back to the document's kind rather than rendering an empty row. */
  title: string
  /** The document exactly as it was on screen when it was kept. */
  body: string
  /** Subject ids, when the run had a cast. Empty for a single write-up. */
  subjectIds: string[]
  /** Names as they were at the time, so a run survives a rename or a leaver. */
  subjectNames: string[]
  /** The server's notice, or "" — never the string "undefined". */
  notice: string
  createdAt: string | null
}

function str(v: unknown): string {
  return typeof v === "string" ? v : ""
}

function strArray(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []
}

function record(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {}
}

/** A string→string map, for a scenario's per-subject sections. */
function strMap(v: unknown): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [k, val] of Object.entries(record(v))) {
    if (typeof val === "string") out[k] = val
  }
  return out
}

/**
 * One stored row as the saved-runs list renders it.
 *
 * `title` falls back to the first line of the body and then to a fixed label.
 * An untitled row must still be clickable — a blank row in a list is
 * indistinguishable from a rendering bug, and the manager cannot tell which of
 * their saved documents it is.
 */
export function toSavedRun(row: SavedAnalysis, fallbackTitle: string): SavedRun {
  const inputs = record(row.inputs)
  const body = str(row.content)
  const firstLine = body.split("\n").find((l) => l.trim().length > 0)?.trim() ?? ""
  return {
    id: row.id,
    title: str(row.title).trim() || firstLine.slice(0, 80) || fallbackTitle,
    body,
    subjectIds: strArray(inputs.subjectIds),
    subjectNames: strArray(inputs.subjectNames),
    notice: str(inputs.notice),
    createdAt: row.createdAt ?? null,
  }
}

/**
 * One stored `scenario` row in the shape the shared ScenarioPanel already
 * replays (`SavedScenario`). Nothing in the panel changes for this.
 *
 * `result` is read back from `inputs.result` so re-opening restores the
 * per-person sections rather than one undifferentiated block. When that is
 * missing — a row written by something other than this client — the whole
 * document is put under the group read instead of dropping the row: the text
 * is exactly what was kept, and a row silently absent from the list is the
 * failure this codebase keeps having to defend against.
 */
export function toSavedScenario(row: SavedAnalysis, fallbackTitle: string): SavedScenario {
  const run = toSavedRun(row, fallbackTitle)
  const inputs = record(row.inputs)
  const result = record(inputs.result)
  const individual = strMap(result.individual)
  const collaborative = str(result.collaborative)

  return {
    id: run.id,
    title: run.title,
    situation: str(inputs.situation),
    character_ids: run.subjectIds,
    character_names: run.subjectNames,
    result:
      Object.keys(individual).length || collaborative
        ? { individual, collaborative }
        : { individual: {}, collaborative: run.body },
    notice: run.notice,
    created_at: run.createdAt,
    updated_at: row.updatedAt ?? null,
  }
}
