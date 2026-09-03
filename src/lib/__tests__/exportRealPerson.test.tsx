/**
 * A document about a real colleague must not call them fictional.
 *
 * The exporters were written for the Character Lab, where every subject is
 * invented, and they hard-coded "— synthetic profile" into the PDF footer and
 * "PRISM_Character_" into the filename. Both are now parameters. This asserts
 * the parameters are actually reaching the file, in both formats.
 *
 * Driven through the real ComparePanel with the real Team Studio copy rather
 * than a hand-authored payload: the payload is what the app has to get right,
 * and a test that authors its own would pass while the panel kept sending the
 * old defaults. The Character Lab case at the end is the discriminator — if
 * the assertion were vacuous, it would pass there too.
 */
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import JSZip from "jszip"
import ComparePanel from "@/components/prism/studio/ComparePanel"
import { TEAM_STUDIO_COMPARE_COPY } from "@/components/manager/development/tabs/studioCopy"
import { CHARACTER_LAB_COMPARE_COPY } from "@/components/super-admin/character-lab/copy"
import type { ComparePort } from "@/components/prism/studio/ports"
import type { ProfileSummary } from "@/types/character-lab"

jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn(), warning: jest.fn() },
}))

// react-markdown ships ESM; the panel only needs to put the text on screen.
jest.mock("@/components/prism/narrative/ProfileMarkdown", () => ({
  __esModule: true,
  default: ({ text }: { text: string }) => <div>{text}</div>,
}))

const saved: { name: string; blob: Blob }[] = []
jest.mock("@/lib/exportTranscript", () => ({
  downloadBlob: (name: string, blob: Blob) => saved.push({ name, blob }),
}))

/** jsPDF is stubbed so the assertions are about what reaches the page. */
const written: string[] = []
jest.mock("jspdf", () => ({
  jsPDF: class {
    setFont = jest.fn(); setFontSize = jest.fn(); setTextColor = jest.fn()
    setDrawColor = jest.fn(); setFillColor = jest.fn(); rect = jest.fn(); line = jest.fn()
    addPage = jest.fn(); setPage = jest.fn(); getNumberOfPages = () => 1
    splitTextToSize = (t: string) => [t]
    text = (t: string) => { written.push(t) }
    output = () => new Blob(["pdf"])
  },
}))

/** The whole point of the change, in one regex. */
const FICTION = /fictional|synthetic/i

const person = (id: string, name: string): ProfileSummary => ({
  id,
  name,
  source: "",
  notes: "",
  scored: 8,
  has_analysis: false,
  created_at: null,
  updated_at: null,
})

/**
 * The server sends no notice here on purpose. That is the case where an export
 * would otherwise leave with no caveat at all — the reader of a PDF never saw
 * whatever was on the screen it came from.
 */
function port(): ComparePort {
  return {
    cast: { subjects: [person("a", "Ann Reyes"), person("b", "Bo Tan")], isLoading: false },
    compare: {
      run: async () => ({
        notice: "",
        part: 0,
        parts: 1,
        sections: [],
        names: [],
        comparison: "Ann closes; Bo opens.",
      }),
      pending: false,
    },
    questions: {
      run: async () => ({ notice: "", names: [], questions: [] }),
      pending: false,
    },
    ask: {
      run: async () => ({ notice: "", question: "", names: [], answer: "" }),
      pending: false,
    },
  }
}

/** jsdom's Blob has no arrayBuffer(); read it the way the other export test does. */
function blobToArrayBuffer(blob: Blob): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as ArrayBuffer)
    reader.onerror = () => reject(reader.error)
    reader.readAsArrayBuffer(blob)
  })
}

async function docxText(blob: Blob): Promise<string> {
  const zip = await JSZip.loadAsync(await blobToArrayBuffer(blob))
  return zip.file("word/document.xml")!.async("string")
}

async function compareThen(copy: typeof TEAM_STUDIO_COMPARE_COPY, format: "PDF" | "Word") {
  render(<ComparePanel port={port()} copy={copy} />)
  fireEvent.click(screen.getByLabelText(/Ann Reyes/))
  fireEvent.click(screen.getByLabelText(/Bo Tan/))
  fireEvent.click(screen.getByRole("button", { name: /Compare them/ }))
  await screen.findByText(/Ann closes/)

  fireEvent.click(screen.getByRole("button", { name: new RegExp(`^${format}$`) }))
  await waitFor(() => expect(saved).toHaveLength(1))
  return saved[0]
}

beforeEach(() => {
  saved.length = 0
  written.length = 0
})

describe("a real person's export", () => {
  it("says nothing about fictional or synthetic profiles, in the PDF", async () => {
    const file = await compareThen(TEAM_STUDIO_COMPARE_COPY, "PDF")
    const page = written.join("\n")

    expect(page).not.toMatch(FICTION)
    expect(file.name).not.toMatch(FICTION)
  })

  it("says nothing about fictional or synthetic profiles, in the Word document", async () => {
    const file = await compareThen(TEAM_STUDIO_COMPARE_COPY, "Word")
    const xml = await docxText(file.blob)

    expect(xml).not.toMatch(FICTION)
    expect(file.name).not.toMatch(FICTION)
    // A document with no notice and no body would also match neither word.
    // These two stop this passing vacuously.
    expect(xml).toContain("Ann closes")
    expect(xml).toContain("REAL PERSON")
  })

  it("is filed as a profile, not as a character", async () => {
    const file = await compareThen(TEAM_STUDIO_COMPARE_COPY, "PDF")
    expect(file.name.startsWith("PRISM_Profile_")).toBe(true)
    expect(file.name).toBe("PRISM_Profile_Ann_Reyes_vs_Bo_Tan.pdf")
  })

  it("footers every page with the people and the date, not a claim about fiction", async () => {
    // A page found on its own months later has to say who it is about and how
    // old it is, or it gets read as current.
    await compareThen(TEAM_STUDIO_COMPARE_COPY, "PDF")
    const footer = written.find((t) => t.includes("PRISM profile,"))
    expect(footer).toMatch(/Ann Reyes vs Bo Tan — PRISM profile, \d{4}-\d{2}-\d{2}/)
  })

  it("leads the PDF with the real-person notice even when the server sends none", async () => {
    // In the position the synthetic notice occupies today: the top of page one,
    // printed in full, before any of the write-up.
    await compareThen(TEAM_STUDIO_COMPARE_COPY, "PDF")
    const noticeIndex = written.findIndex((t) => t.includes("REAL PERSON"))
    const bodyIndex = written.findIndex((t) => t.includes("Ann closes"))
    expect(noticeIndex).toBeGreaterThanOrEqual(0)
    expect(noticeIndex).toBeLessThan(bodyIndex)
  })

  it("leads the Word document with the same notice, in the same place", async () => {
    const file = await compareThen(TEAM_STUDIO_COMPARE_COPY, "Word")
    const xml = await docxText(file.blob)
    expect(xml).toContain("REAL PERSON")
    expect(xml.indexOf("REAL PERSON")).toBeLessThan(xml.indexOf("Ann closes"))
  })
})

describe("the Character Lab's export, for contrast", () => {
  it("still says synthetic — so the assertion above is not vacuous", async () => {
    const file = await compareThen(CHARACTER_LAB_COMPARE_COPY, "PDF")
    expect(written.join("\n")).toMatch(FICTION)
    expect(file.name).toBe("PRISM_Ann_Reyes_vs_Bo_Tan.pdf")
  })
})
