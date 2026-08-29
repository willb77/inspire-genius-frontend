import {
  exportNarrativePdf,
  exportNarrativeWord,
  hasNarrative,
  narrativeFileStem,
  type NarrativeDoc,
} from "@/lib/exportNarrative"

const downloadBlob = jest.fn()
jest.mock("@/lib/exportTranscript", () => ({
  downloadBlob: (...a: unknown[]) => downloadBlob(...a),
}))

/**
 * jsPDF is stubbed so the assertions are about WHAT reaches the page. Running
 * the real thing in jsdom would only prove a blob came back — the kind of test
 * that passes while the document is blank.
 */
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

const NOTICE = "FICTIONAL CHARACTER — synthetic profile, not an assessment."

function doc(over: Partial<NarrativeDoc> = {}): NarrativeDoc {
  return {
    title: "Sonny Corleone vs Michael Corleone",
    subtitle: "PRISM character comparison",
    notice: NOTICE,
    meta: [{ label: "Characters", value: "Sonny Corleone, Michael Corleone" }],
    sections: [
      { heading: "Where they differ most", body: "## Evaluating\n\n- **Michael 90** vs Sonny 18." },
    ],
    ...over,
  }
}

beforeEach(() => {
  written.length = 0
  downloadBlob.mockClear()
})

describe("narrativeFileStem", () => {
  it("makes a filesystem-safe stem from the title", () => {
    expect(narrativeFileStem("Sonny Corleone vs Michael Corleone")).toBe(
      "PRISM_Sonny_Corleone_vs_Michael_Corleone",
    )
    expect(narrativeFileStem('Salvatore "Sal" Tessio')).toBe("PRISM_Salvatore_Sal_Tessio")
    expect(narrativeFileStem("")).toBe("PRISM_narrative")
  })
})

describe("hasNarrative", () => {
  it("is false when every section is empty", () => {
    // An export button that produces a title, a notice and nothing else looks
    // like the narrative was generated and came back blank.
    expect(hasNarrative(doc({ sections: [{ body: "" }, { body: "   " }] }))).toBe(false)
    expect(hasNarrative(doc())).toBe(true)
  })
})

describe("exportNarrativePdf", () => {
  it("prints the synthetic notice in full", async () => {
    // A PDF travels further than the tab it came from.
    await exportNarrativePdf(doc())
    expect(written).toContain(NOTICE)
  })

  it("carries the title, the meta and the section heading", async () => {
    await exportNarrativePdf(doc())
    expect(written).toContain("Sonny Corleone vs Michael Corleone")
    expect(written).toContain("Characters: Sonny Corleone, Michael Corleone")
    expect(written).toContain("Where they differ most")
  })

  it("renders markdown rather than printing the marks", async () => {
    await exportNarrativePdf(doc())
    expect(written).toContain("Evaluating")
    expect(written).toContain("•  Michael 90 vs Sonny 18.")
    expect(written.some((t) => t.includes("##") || t.includes("**"))).toBe(false)
  })

  it("names the file after the title", async () => {
    await exportNarrativePdf(doc())
    expect(downloadBlob).toHaveBeenCalledWith(
      "PRISM_Sonny_Corleone_vs_Michael_Corleone.pdf",
      expect.any(Blob),
    )
  })

  it("drops empty sections instead of printing a bare heading", async () => {
    // A heading with nothing under it claims coverage the document does not have.
    await exportNarrativePdf(
      doc({ sections: [{ heading: "Fredo", body: "" }, { heading: "Together", body: "It ends badly." }] }),
    )
    expect(written).not.toContain("Fredo")
    expect(written).toContain("Together")
  })

  it("keeps a failed section's marker rather than hiding it", async () => {
    // "could not be generated" must survive into the export, or the document
    // reads as a complete scene that happened to be shorter.
    await exportNarrativePdf(
      doc({ sections: [{ heading: "Michael", body: "_The read for Michael could not be generated._" }] }),
    )
    expect(written.some((t) => t.includes("could not be generated"))).toBe(true)
  })
})

describe("exportNarrativeWord", () => {
  it("produces a .docx named after the title", async () => {
    await exportNarrativeWord(doc())
    expect(downloadBlob).toHaveBeenCalledWith(
      "PRISM_Sonny_Corleone_vs_Michael_Corleone.docx",
      expect.any(Blob),
    )
  })

  it("refuses nothing — an empty doc is the caller's job to prevent", async () => {
    // hasNarrative is the gate; the exporter itself must not throw.
    await expect(exportNarrativeWord(doc({ sections: [] }))).resolves.toBeUndefined()
  })
})
