/**
 * @jest-environment jsdom
 *
 * TDS Meridian conversation export. The real `docx` and `xlsx` builders run and
 * the files are read back, because what is worth guaranteeing is what the
 * manager opens: the member-data notice heads every artefact, and every turn
 * survives. Email must be a `mailto:` draft — never a server send — and must
 * not carry the conversation in its body.
 */
import JSZip from "jszip"
import * as XLSX from "xlsx"
import {
  buildDevelopmentChatHtml,
  buildDevelopmentChatMailto,
  developmentChatFileStem,
  developmentNotice,
  emailDevelopmentChat,
  exportDevelopmentChatExcel,
  exportDevelopmentChatPdf,
  exportDevelopmentChatWord,
  printDevelopmentChat,
  type DevelopmentChatExportPayload,
} from "@/lib/exportDevelopmentChat"

const saved: { name: string; blob: Blob }[] = []
jest.mock("@/lib/exportTranscript", () => ({
  downloadBlob: (name: string, blob: Blob) => saved.push({ name, blob }),
}))

// The HTML is asserted through the mock's calls; the blob only has to exist.
const mockRenderPdf = jest.fn((html: string) => Promise.resolve(new Blob([`%PDF ${html.length}`], { type: "application/pdf" })))
jest.mock("@/lib/exportTranscript/renderPdf", () => ({
  renderHtmlToPdf: (html: string) => mockRenderPdf(html),
}))

const mockPrintHtml = jest.fn()
jest.mock("@/lib/exportTranscript/printTurn", () => ({
  printHtml: (html: string) => mockPrintHtml(html),
}))

const NOTICE = "Contains Ben B's development information — share only with people entitled to see it."

function payload(over: Partial<DevelopmentChatExportPayload> = {}): DevelopmentChatExportPayload {
  return {
    memberName: "Ben B",
    managerName: "Dana Manager",
    generatedAt: new Date("2026-10-13T05:00:00Z"),
    turns: [
      { role: "user", content: "What should I lead with?" },
      { role: "assistant", content: "## Lead with\n- Their **recent** release\n- A question" },
    ],
    ...over,
  }
}

function blobToArrayBuffer(blob: Blob): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as ArrayBuffer)
    reader.onerror = () => reject(reader.error)
    reader.readAsArrayBuffer(blob)
  })
}

beforeEach(() => {
  saved.length = 0
  mockRenderPdf.mockClear()
  mockPrintHtml.mockClear()
})

describe("developmentNotice / file stem", () => {
  it("names the member, and falls back when the name is blank", () => {
    expect(developmentNotice("Ben B")).toBe(NOTICE)
    expect(developmentNotice("  ")).toMatch(/^Contains This member's/)
  })

  it("builds a filesystem-safe stem with the date", () => {
    expect(developmentChatFileStem(payload())).toBe("Meridian_Development_ben-b_2026-10-13")
    expect(developmentChatFileStem(payload({ memberName: "" }))).toBe("Meridian_Development_member_2026-10-13")
  })
})

describe("HTML (PDF + print)", () => {
  it("heads the document with the notice and carries every turn with its speaker", () => {
    const html = buildDevelopmentChatHtml(payload())
    expect(html.indexOf("Contains Ben B")).toBeLessThan(html.indexOf("Meridian conversation"))
    expect(html).toContain("Dana Manager")
    expect(html).toContain("What should I lead with?")
    expect(html).toContain("Their <b>recent</b> release")
  })

  it("escapes names so a member name cannot inject markup", () => {
    const html = buildDevelopmentChatHtml(payload({ memberName: "<img src=x>" }))
    expect(html).not.toContain("<img src=x>")
    expect(html).toContain("&lt;img src=x&gt;")
  })

  it("PDF renders that HTML and downloads a .pdf", async () => {
    await exportDevelopmentChatPdf(payload())
    expect(mockRenderPdf).toHaveBeenCalledWith(expect.stringContaining("Contains Ben B"))
    expect(saved.map((s) => s.name)).toEqual(["Meridian_Development_ben-b_2026-10-13.pdf"])
  })

  it("print sends only the transcript document to the printer", () => {
    printDevelopmentChat(payload())
    expect(mockPrintHtml).toHaveBeenCalledTimes(1)
    const html = mockPrintHtml.mock.calls[0][0] as string
    expect(html).toContain("Contains Ben B")
    expect(html).toContain("What should I lead with?")
    expect(html).not.toMatch(/Ask about this member|Continue session/)
  })
})

describe("empty conversation", () => {
  it.each([
    ["word", () => exportDevelopmentChatWord(payload({ turns: [] }))],
    ["pdf", () => exportDevelopmentChatPdf(payload({ turns: [] }))],
    ["excel", () => exportDevelopmentChatExcel(payload({ turns: [] }))],
  ])("%s refuses and downloads nothing", async (_name, fn) => {
    await expect(fn()).rejects.toThrow(/Nothing to export/)
    expect(saved).toHaveLength(0)
  })

  it("print refuses", () => {
    expect(() => printDevelopmentChat(payload({ turns: [] }))).toThrow(/Nothing to export/)
    expect(mockPrintHtml).not.toHaveBeenCalled()
  })
})

describe("Word", () => {
  it("writes a .docx whose first paragraph is the notice and which carries every turn", async () => {
    await exportDevelopmentChatWord(payload())
    expect(saved[0].name).toBe("Meridian_Development_ben-b_2026-10-13.docx")
    const zip = await JSZip.loadAsync(await blobToArrayBuffer(saved[0].blob))
    const xml = await zip.file("word/document.xml")!.async("string")
    const text = xml.replace(/<[^>]+>/g, "")
    expect(text).toContain("development information — share only with people entitled to see it.")
    expect(text.indexOf("Contains Ben B")).toBeLessThan(text.indexOf("Meridian conversation"))
    expect(text).toContain("Dana Manager")
    expect(text).toContain("What should I lead with?")
    expect(text).toContain("Their recent release")
  })
})

describe("Excel", () => {
  it("writes Summary and Conversation sheets, both headed by the notice, one row per message", async () => {
    await exportDevelopmentChatExcel(payload())
    expect(saved[0].name).toBe("Meridian_Development_ben-b_2026-10-13.xlsx")
    const wb = XLSX.read(new Uint8Array(await blobToArrayBuffer(saved[0].blob)), { type: "array" })
    expect(wb.SheetNames).toEqual(["Summary", "Conversation"])
    const summary = XLSX.utils.sheet_to_json<string[]>(wb.Sheets.Summary, { header: 1 })
    expect(summary[0][0]).toBe(NOTICE)
    const conv = XLSX.utils.sheet_to_json<(string | number)[]>(wb.Sheets.Conversation, { header: 1 })
    expect(conv[0][0]).toBe(NOTICE)
    expect(conv[1]).toEqual(["#", "Speaker", "Message"])
    expect(conv[2]).toEqual([1, "Dana Manager", "What should I lead with?"])
    expect(conv[3][1]).toBe("Meridian")
    expect(conv).toHaveLength(4)
  })
})

describe("Email", () => {
  it("builds a mailto draft with the notice and an attach instruction, not the conversation", () => {
    const url = buildDevelopmentChatMailto(payload())
    expect(url.startsWith("mailto:?subject=")).toBe(true)
    const body = decodeURIComponent(url.split("&body=")[1])
    expect(body).toContain(NOTICE)
    expect(body).toContain("Meridian_Development_ben-b_2026-10-13.docx")
    expect(body).toMatch(/please attach it/)
    expect(body).not.toContain("What should I lead with?")
    expect(decodeURIComponent(url)).toContain("Meridian development conversation — Ben B")
  })

  it("downloads the Word copy before handing the draft to the mail client", async () => {
    // jsdom cannot navigate to a mailto: URL and reports that on console.error;
    // the URL itself is asserted above through buildDevelopmentChatMailto.
    const quiet = jest.spyOn(console, "error").mockImplementation(() => {})
    try {
      await emailDevelopmentChat(payload())
      expect(saved.map((s) => s.name)).toEqual(["Meridian_Development_ben-b_2026-10-13.docx"])
    } finally {
      quiet.mockRestore()
    }
  })
})
