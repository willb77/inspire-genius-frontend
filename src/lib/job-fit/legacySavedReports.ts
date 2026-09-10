import type { FitSnapshotSaveBody } from "@/types/job-fit"

/**
 * The pre-JS-3 "Save to your fit reports" wrote this localStorage key (up to
 * 50 entries, this browser only). Those entries are imported once into the
 * server-side history and the key is removed. Pure helpers; the caller does
 * the posting.
 */
export const LEGACY_SAVED_KEY = "ig.jobfit.savedReports"

type LegacyEntry = {
  jobId?: string
  roleTitle?: string
  fitScore?: number
  overview?: string
  savedAt?: string
  url?: string
}

/** Read the legacy entries, oldest first so the server order matches the saves. Never throws. */
export function readLegacySavedReports(): LegacyEntry[] {
  try {
    const raw = localStorage.getItem(LEGACY_SAVED_KEY)
    if (!raw) return []
    const list = JSON.parse(raw)
    if (!Array.isArray(list)) return []
    return [...list].reverse().filter((e): e is LegacyEntry => Boolean(e) && typeof e === "object")
  } catch {
    return []
  }
}

/** Shape a legacy entry as a save body; the original date is kept. */
export function legacyEntryToSaveBody(e: LegacyEntry): FitSnapshotSaveBody {
  return {
    jobId: e.jobId || null,
    roleTitle: e.roleTitle || "",
    fitScore: typeof e.fitScore === "number" ? Math.round(e.fitScore) : null,
    payload: { overview: e.overview || "", url: e.url || "", legacy: true },
    computedAt: e.savedAt || undefined,
  }
}

/** Drop the key once the import has been posted. Never throws. */
export function clearLegacySavedReports(): void {
  try {
    localStorage.removeItem(LEGACY_SAVED_KEY)
  } catch {
    /* storage unavailable — nothing to clear */
  }
}
