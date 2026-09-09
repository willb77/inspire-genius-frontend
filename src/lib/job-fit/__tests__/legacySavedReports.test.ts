/**
 * @jest-environment jsdom
 */
import {
  LEGACY_SAVED_KEY,
  clearLegacySavedReports,
  legacyEntryToSaveBody,
  readLegacySavedReports,
} from "../legacySavedReports"

beforeEach(() => localStorage.clear())

test("reads the old entries oldest-first and shapes them as saves that keep their date", () => {
  localStorage.setItem(
    LEGACY_SAVED_KEY,
    JSON.stringify([
      { jobId: "j2", roleTitle: "Newer", fitScore: 71.4, overview: "later", savedAt: "2026-08-02T00:00:00Z", url: "u2" },
      { jobId: "j1", roleTitle: "Older", fitScore: 60, savedAt: "2026-08-01T00:00:00Z" },
    ])
  )
  const entries = readLegacySavedReports()
  expect(entries.map((e) => e.roleTitle)).toEqual(["Older", "Newer"])
  expect(legacyEntryToSaveBody(entries[1])).toEqual({
    jobId: "j2",
    roleTitle: "Newer",
    fitScore: 71,
    payload: { overview: "later", url: "u2", legacy: true },
    computedAt: "2026-08-02T00:00:00Z",
  })
})

test("garbage in storage reads as nothing, and clearing removes the key", () => {
  localStorage.setItem(LEGACY_SAVED_KEY, "{not json")
  expect(readLegacySavedReports()).toEqual([])
  localStorage.setItem(LEGACY_SAVED_KEY, JSON.stringify({ not: "a list" }))
  expect(readLegacySavedReports()).toEqual([])
  clearLegacySavedReports()
  expect(localStorage.getItem(LEGACY_SAVED_KEY)).toBeNull()
})
