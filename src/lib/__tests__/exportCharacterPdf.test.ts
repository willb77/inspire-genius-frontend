import { exportProfilePdf } from "@/lib/exportCharacterPdf"
import type { ProfileExportPayload } from "@/lib/exportCharacterProfile"
import type { Rubric } from "@/types/character-lab"

const downloadBlob = jest.fn()
jest.mock("@/lib/exportTranscript", () => ({
  downloadBlob: (...args: unknown[]) => downloadBlob(...args),
}))

/**
 * jsPDF is stubbed rather than run: the assertions here are about WHAT the
 * export puts in the document, and a real jsPDF in jsdom would only let us
 * check that a blob came back — which is exactly the kind of test that passes
 * while the page is blank.
 */
const written: string[] = []
const addPage = jest.fn()
const setPage = jest.fn()

jest.mock("jspdf", () => ({
  jsPDF: class {
    setFont = jest.fn()
    setFontSize = jest.fn()
    setTextColor = jest.fn()
    setDrawColor = jest.fn()
    setFillColor = jest.fn()
    rect = jest.fn()
    line = jest.fn()
    addPage = addPage
    setPage = setPage
    getNumberOfPages = () => 1
    splitTextToSize = (t: string) => [t]
    text = (t: string) => {
      written.push(t)
    }
    output = () => new Blob(["pdf"])
  },
}))

const RUBRIC: Rubric = {
  notice: "FICTIONAL CHARACTER — synthetic profile, not an assessment.",
  score_types: { Adapted: "a", Underlying: "u", Consistent: "c" },
  bands: [],
  groups: [
    {
      group: "Behavior Preferences",
      definition: "The eight behaviour preferences.",
      per_score_type: true,
      parts: 1,
      dimensions: [
        {
          key: "initiating",
          label: "Initiating",
          measures: "Starting things without being asked.",
          high: "Starts.",
          low: "Waits.",
          is_trait: true,
        },
      ],
    },
  ],
}

function payload(over: Partial<ProfileExportPayload> = {}): ProfileExportPayload {
  return {
    name: "Sonny Corleone",
    source: "The Godfather",
    notice: RUBRIC.notice,
    reading: "Acts first, reflects later.",
    analysis: "## The shape of this profile\n\n- **Red 85** drives everything.",
    colours: [
      { quadrant_id: 1, name: "Green", value: 71.5, band: "High" },
      { quadrant_id: 4, name: "Gold", value: 19, band: "Very low" },
    ],
    scores: { initiating: { Underlying: 88, Adapted: 82 } },
    evidence: { initiating: "Speaks out of turn." },
    rubric: RUBRIC,
    scoreType: "Underlying",
    ...over,
  }
}

beforeEach(() => {
  written.length = 0
  downloadBlob.mockClear()
  addPage.mockClear()
})

it("prints the synthetic notice in full", async () => {
  // A PDF travels further than the tab it came from, and this is the only
  // thing that follows it.
  await exportProfilePdf(payload())
  expect(written).toContain(RUBRIC.notice)
})

it("names the file after the character", async () => {
  await exportProfilePdf(payload())
  expect(downloadBlob).toHaveBeenCalledWith(
    "PRISM_Character_Sonny_Corleone.pdf",
    expect.any(Blob),
  )
})

it("prints what each colour measures, not just its name", async () => {
  // "Gold" reads as discipline and "Green" as patience; neither is what the
  // pairing measures. Printing the number without the definition reproduces
  // the exact error this surface exists to demonstrate.
  await exportProfilePdf(payload())
  expect(written.some((t) => t.includes("Finishing + Evaluating"))).toBe(true)
  expect(written.some((t) => t.includes("Innovating + Initiating"))).toBe(true)
})

it("carries each scale's definition beside its score", async () => {
  await exportProfilePdf(payload())
  expect(written).toContain("Starting things without being asked.")
  expect(written).toContain("Why: Speaks out of turn.")
})

it("renders markdown as formatted text rather than printing the marks", async () => {
  await exportProfilePdf(payload())
  expect(written).toContain("The shape of this profile")
  expect(written).toContain("•  Red 85 drives everything.")
  // The raw marks never reach the page.
  expect(written.some((t) => t.includes("##") || t.includes("**"))).toBe(false)
})

it("uses the score type the caller asked for", async () => {
  await exportProfilePdf(payload({ scoreType: "Adapted" }))
  expect(written).toContain("82")
  expect(written).not.toContain("88")
})

it("prints a dash for a scale with no value on the selected score type", async () => {
  // Not a zero. A missing score and a score of zero are different claims.
  await exportProfilePdf(
    payload({ scores: { initiating: { Consistent: 50 } }, scoreType: "Adapted" }),
  )
  expect(written).toContain("—")
})
