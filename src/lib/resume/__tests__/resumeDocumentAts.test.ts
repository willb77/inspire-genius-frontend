/**
 * RWO-2 — the ATS-safe résumé document, its Word and text-PDF writers, the Mini
 * card and the format selector. These try to disprove:
 *   - Word, PDF and Copy carry the same sections in the format's order, with the
 *     contact block in the body;
 *   - none of them carries the "Drafted from" line, the AI disclaimer, the
 *     "Target —" line, platform branding, removed lines or talking points (D3, Q3);
 *   - the PDF is TEXT on US Letter, page-broken before a line would overflow;
 *   - a section the format does not list is appended, never dropped;
 *   - the file name is FirstName-LastName-Resume-TargetRole.
 * Synthetic people only.
 */
import type { GeneratedResume } from "@/types/resumeWriter"

const written: string[] = []
jest.mock("docx", () => ({
  HeadingLevel: { HEADING_2: "H2" },
  TextRun: class {
    constructor(o: { text: string }) {
      written.push(o.text)
    }
  },
  Paragraph: class {
    o: unknown
    constructor(o: unknown) {
      this.o = o
    }
  },
  Document: class {},
  Packer: { toBlob: () => Promise.resolve(new Blob(["docx"])) },
}))

const jsPdfArgs: unknown[] = []
jest.mock("jspdf", () => ({
  jsPDF: jest.fn().mockImplementation((o: unknown) => {
    jsPdfArgs.push(o)
    return fakePdf()
  }),
}))

import { buildAtsDocx, buildAtsPdf, LETTER_H, pdfSafe, renderAtsResume, writeAtsPdf, type AtsPdfLike } from "@/lib/resume/exportResumeAts"
import {
  atsFileBase,
  buildResumeDocument,
  contactLine,
  DEFAULT_SECTIONS,
  documentToPlainText,
  type ResumeContact,
} from "@/lib/resume/resumeDocument"
import { buildMiniCard, miniCardDocument, miniCardText, shortBio } from "@/lib/resume/miniCard"
import { inputLabel, recommendFormat } from "@/lib/resume/formatSelector"

type Call = { text: string; x: number; y: number; page: number }
let calls: Call[] = []
let pages = 1
let current = 1
function fakePdf(): AtsPdfLike {
  calls = []
  pages = 1
  current = 1
  return {
    setFont: () => undefined,
    setFontSize: () => undefined,
    setTextColor: () => undefined,
    addPage: () => {
      pages += 1
      current = pages
    },
    setPage: (n: number) => {
      current = n
    },
    getNumberOfPages: () => pages,
    splitTextToSize: (t: string) => [t],
    text: (t: string, x: number, y: number) => {
      calls.push({ text: t, x, y, page: current })
    },
    output: () => new Blob(["pdf"]),
  }
}

const CONTACT: ResumeContact = {
  name: "Casey Example",
  email: "casey@example.com",
  phone: "(555) 555-0100",
  location: "Springfield, IL",
  link: "linkedin.com/in/casey",
}

const DRAFT: GeneratedResume = {
  target: "Operations Manager",
  headline: "Operations Coordinator",
  summary: "Runs store teams. Cuts costs. Keeps shifts covered. Trains new staff.",
  competencies: ["Scheduling", "Vendor evaluation"],
  experience: [
    { title: "Operations Coordinator", organization: "Contoso Retail", dates: "Jan 2019 - Present", bullets: ["Coordinated a 12-person team"] },
  ],
  education: ["Associate's Degree in Business, City College, 2016"],
  certifications: [],
  sources: ["Your résumé"],
  grounded: true,
  disclaimer: "AI-drafted from your own profile and documents.",
  usedToday: 1,
  dailyLimit: 5,
  option: "hybrid",
  bulletStyle: "car",
  selected_achievements: ["Cut supply costs by 18%"],
  talking_points: ["I finished forklift training while working full time"],
  removed: [{ section: "experience", reason: "employer", text: "Globex Corporation" }],
  notEvidenced: ["Manage vendor contracts"],
}

const HYBRID = ["summary", "competencies", "selected_achievements", "experience", "education", "certifications"]

/** Strings that must never reach a file (D3, Q3, page-only keys, removed lines). */
const NEVER = [
  "Drafted from",
  "AI-drafted",
  "Target —",
  "Target -",
  "Inspires Genius",
  "Globex",
  "vendor contracts",
  "forklift training",
]

beforeEach(() => {
  written.length = 0
  jsPdfArgs.length = 0
})

describe("the document", () => {
  test("sections follow the format's order and the contact line is in the body", () => {
    const doc = buildResumeDocument(DRAFT, CONTACT, HYBRID)
    expect(doc.sections.map((s) => s.key)).toEqual(["summary", "competencies", "selected_achievements", "experience", "education"])
    expect(doc.contactLine).toBe("Springfield, IL | (555) 555-0100 | casey@example.com | linkedin.com/in/casey")
    expect(doc.sections.map((s) => s.heading)).toEqual(["Summary", "Skills", "Selected Achievements", "Experience", "Education"])
  })

  test("a section the format does not list is appended, never dropped", () => {
    const doc = buildResumeDocument({ ...DRAFT, training: ["Forklift Operator Certificate, 2015"] }, CONTACT, DEFAULT_SECTIONS)
    expect(doc.sections.map((s) => s.key)).toContain("selected_achievements")
    expect(doc.sections.map((s) => s.key)).toContain("training")
  })

  test("talking points are never a section, whatever the format lists", () => {
    const doc = buildResumeDocument(DRAFT, CONTACT, [...HYBRID, "talking_points"])
    expect(doc.sections.map((s) => s.key)).not.toContain("talking_points")
    expect(documentToPlainText(doc)).not.toContain("forklift training")
  })

  test("projects and technical skills render as plain lines", () => {
    const doc = buildResumeDocument(
      {
        ...DRAFT,
        projects: [{ name: "Inventory tracker", problem: "Stock counts", stack: "Python, SQL", role: "Builder", outcome: "Used daily" }],
        technical_skills: [{ category: "Languages", skills: ["Python", "SQL"] }, { category: "", skills: [] }],
      },
      CONTACT,
      ["summary", "technical_skills", "experience", "projects"],
    )
    const text = documentToPlainText(doc)
    expect(text).toContain("Languages: Python, SQL")
    expect(text).toContain("Inventory tracker, Python, SQL")
    expect(text).toContain("• Used daily")
  })

  test("empty contact fields and an empty name are left out, not printed as placeholders", () => {
    const doc = buildResumeDocument(DRAFT, { name: "", email: "", phone: "", location: "", link: "" })
    expect(doc.name).toBe("")
    expect(doc.contactLine).toBe("")
    expect(documentToPlainText(doc).split("\n")[0]).toBe("Operations Coordinator")
    expect(contactLine({ ...CONTACT, phone: "  ", link: "" })).toBe("Springfield, IL | casey@example.com")
  })

  test("the file name is FirstName-LastName-Resume-TargetRole", () => {
    expect(atsFileBase("Casey Example", "Operations Manager")).toBe("Casey-Example-Resume-Operations-Manager")
    expect(atsFileBase("Zoë O'Test", null)).toBe("Zoe-O-Test-Resume")
    expect(atsFileBase("", "")).toBe("My-Resume")
    expect(atsFileBase("Casey Example", null, "Profile-Card")).toBe("Casey-Example-Profile-Card")
  })
})

describe("the files", () => {
  test("Word, PDF and Copy carry the same lines and never the D3 / page-only strings", async () => {
    const doc = buildResumeDocument(DRAFT, CONTACT, HYBRID)
    await buildAtsDocx(doc)
    const pdf = fakePdf()
    writeAtsPdf(pdf, doc)
    const files = { word: written.join("\n"), pdf: calls.map((c) => c.text).join("\n"), copy: documentToPlainText(doc) }
    for (const [kind, text] of Object.entries(files)) {
      for (const bad of NEVER) expect({ kind, has: text.includes(bad) }).toEqual({ kind, has: false })
      for (const good of ["Casey Example", "Springfield, IL", "casey@example.com", "Coordinated a 12-person team", "Cut supply costs by 18%"])
        expect({ kind, good, has: text.includes(good) }).toEqual({ kind, good, has: true })
    }
  })

  test("the PDF is text on US Letter, built with jsPDF's text calls", async () => {
    const blob = await buildAtsPdf(buildResumeDocument(DRAFT, CONTACT, HYBRID))
    expect(jsPdfArgs[0]).toEqual({ unit: "pt", format: "letter" })
    expect(calls.length).toBeGreaterThan(5)
    expect(blob).toBeInstanceOf(Blob)
  })

  test("a long résumé breaks pages before a line would overflow, and numbers the pages", () => {
    const long = { ...DRAFT, experience: Array.from({ length: 30 }, (_, i) => ({ title: `Role ${i}`, organization: "Contoso", dates: "2019", bullets: ["One", "Two", "Three"] })) }
    const pdf = fakePdf()
    writeAtsPdf(pdf, buildResumeDocument(long, CONTACT))
    expect(pages).toBeGreaterThan(1)
    for (const c of calls) expect(c.y).toBeLessThanOrEqual(LETTER_H - 28)
    expect(calls.filter((c) => /^Page \d+ of \d+$/.test(c.text))).toHaveLength(pages)
  })

  test("a one-page résumé carries no footer at all", () => {
    const pdf = fakePdf()
    writeAtsPdf(pdf, buildResumeDocument(DRAFT, CONTACT))
    expect(calls.some((c) => c.text.startsWith("Page "))).toBe(false)
  })

  test("typographic punctuation is printed in plain forms the PDF font has", () => {
    expect(pdfSafe("Jan 2019 – Present — “led” ’s • … ")).toBe('Jan 2019 - Present - "led" \'s - ... ')
    expect(pdfSafe("Zoë Résumé")).toBe("Zoë Résumé")
  })

  test("renderAtsResume names both files from the document", async () => {
    const doc = buildResumeDocument(DRAFT, CONTACT)
    expect((await renderAtsResume(doc, "docx", "Operations Manager")).fileName).toBe("Casey-Example-Resume-Operations-Manager.docx")
    expect((await renderAtsResume(doc, "pdf", null)).fileName).toBe("Casey-Example-Resume.pdf")
  })
})

describe("the Mini card", () => {
  test("three highlights, six skills, a three-sentence bio, from the draft only", () => {
    const card = buildMiniCard(
      { ...DRAFT, technical_skills: [{ category: "Tools", skills: ["Excel", "SQL", "Python", "Tableau", "Power BI"] }] },
      CONTACT,
    )
    expect(card.highlights).toEqual(["Cut supply costs by 18%", "Coordinated a 12-person team"])
    expect(card.skills).toEqual(["Excel", "SQL", "Python", "Tableau", "Power BI", "Scheduling"])
    expect(card.bio).toBe("Runs store teams. Cuts costs. Keeps shifts covered.")
    const text = miniCardText(card)
    for (const bad of NEVER) expect(text).not.toContain(bad)
    expect(miniCardDocument(card).sections.map((s) => s.heading)).toEqual(["Highlights", "Key Skills", "Bio"])
  })

  test("shortBio keeps a summary with no full stop", () => {
    expect(shortBio("Builds dashboards for store leaders")).toBe("Builds dashboards for store leaders")
    expect(shortBio("")).toBe("")
  })
})

describe("the format selector", () => {
  const ALL = ["reverse_chrono", "hybrid", "reentry", "entry_level", "technical"]

  test.each([
    ["same_field", "reverse_chrono"],
    ["changing", "hybrid"],
    ["returning", "reentry"],
    ["student", "entry_level"],
    ["technical", "technical"],
    ["senior", "hybrid"],
    ["creative", "hybrid"],
  ] as const)("%s → %s", (situation, want) => {
    expect(recommendFormat(situation, "online", false, ALL, "reverse_chrono").optionId).toBe(want)
  })

  test("never recommends a format the server does not offer", () => {
    const r = recommendFormat("returning", "online", false, ["reverse_chrono"], "reverse_chrono")
    expect(r.optionId).toBe("reverse_chrono")
    expect(r.alternativeId).toBeUndefined()
  })

  test("networking suggests the Mini card; a posting is nudged into Job description", () => {
    const r = recommendFormat("same_field", "networking", true, ALL, "reverse_chrono")
    expect(r.notes.join(" ")).toMatch(/Mini card/)
    expect(r.notes.join(" ")).toMatch(/Paste the job posting/)
  })

  test("input labels are friendly, with a readable fallback", () => {
    expect(inputLabel("work_history")).toBe("Every job with title, employer and dates")
    expect(inputLabel("some_new_input")).toBe("Some new input")
  })
})
