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
const docArgs: unknown[] = []
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
  Document: class {
    constructor(o: unknown) {
      docArgs.push(o)
    }
  },
  Packer: { toBlob: () => Promise.resolve(new Blob(["docx"])) },
}))

const jsPdfArgs: unknown[] = []
jest.mock("jspdf", () => ({
  jsPDF: jest.fn().mockImplementation((o: unknown) => {
    jsPdfArgs.push(o)
    return fakePdf()
  }),
}))

import { buildAtsDocx, buildAtsPdf, LAYOUTS, layoutAtsPdf, LETTER_H, pdfSafe, renderAtsResume, writeAtsPdf, type AtsPdfLike } from "@/lib/resume/exportResumeAts"
import {
  atsFileBase,
  buildResumeDocument,
  federalDatesLine,
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

describe("bullet wrapping in the PDF (dev, 2026-11-04)", () => {
  /** A width-honest fake: wraps at width/5 characters, like a real font would at some size. */
  function widthPdf(): AtsPdfLike {
    const pdf = fakePdf()
    pdf.splitTextToSize = (t: string, w: number) => {
      const per = Math.floor(w / 5)
      const out: string[] = []
      let line = ""
      for (const word of t.split(" ")) {
        if (line && (line + " " + word).length > per) {
          out.push(line)
          line = word
        } else line = line ? `${line} ${word}` : word
      }
      if (line) out.push(line)
      return out
    }
    return pdf
  }

  test("a long bullet is wrapped once: one marker, every line at the text column, no stranded word", () => {
    const long = "Built a Python and SQL inventory tracker that cut stock counts from 2 hours to 20 minutes across every stockroom in the region"
    const doc = buildResumeDocument({ ...DRAFT, selected_achievements: [long] }, CONTACT, ["selected_achievements"])
    writeAtsPdf(widthPdf(), { ...doc, sections: doc.sections.filter((s) => s.key === "selected_achievements") })
    const body = calls.filter((c) => c.text !== "SELECTED ACHIEVEMENTS" && !c.text.startsWith("Casey") && !c.text.startsWith("Operations") && !c.text.startsWith("Springfield"))
    const markers = body.filter((c) => c.text === "-")
    const lines = body.filter((c) => c.text !== "-")
    expect(markers).toHaveLength(1)
    expect(new Set(lines.map((c) => c.x)).size).toBe(1)
    expect(lines.map((c) => c.text).join(" ")).toBe(long)
    expect(lines.length).toBeGreaterThan(1)
    expect(lines.every((c) => c.text.split(" ").length > 1)).toBe(true)
  })
})


describe("RWO-3 Federal", () => {
  const FED: GeneratedResume = {
    ...DRAFT,
    option: "federal",
    experience: [
      { title: "Program Assistant", organization: "Department of Veterans Affairs", dates: "05/2015 - 12/2018", bullets: ["Scheduled 40 appointments a day"] },
      { title: "Coordinator", organization: "Contoso Retail", dates: "01/2019 - Present", bullets: ["Coordinated a 12-person team"] },
    ],
    federal_roles: [
      { title: "program assistant", organization: "Department of  Veterans Affairs", hours_per_week: "40", series_grade: "GS-0303-05" },
      { title: "Coordinator", organization: "Contoso Retail", hours_per_week: "40 hours per week", series_grade: "" },
    ],
    federal_optional: ["Secret clearance"],
    qualifications_crosswalk: [{ requirement: "scheduling appointments", evidence: "Scheduled 40 appointments a day" }],
  }
  const FED_SECTIONS = ["summary", "experience", "education", "certifications", "training", "federal_optional"]

  test("each job carries MM/YYYY dates, hours per week and series/grade, matched by title and organization", () => {
    const doc = buildResumeDocument(FED, CONTACT, FED_SECTIONS, "federal")
    const text = documentToPlainText(doc)
    expect(text).toContain("05/2015 - 12/2018 | 40 hours per week | GS-0303-05")
    expect(text).toContain("01/2019 - Present | 40 hours per week")
    // A grade belongs to its own job only.
    expect(text).not.toContain("01/2019 - Present | 40 hours per week | GS")
    expect(text).not.toContain("hours per week hours per week")
    expect(text).toContain("ADDITIONAL INFORMATION")
    expect(doc.layout).toBe("federal")
  })

  test("a job with no matching federal row keeps its dates alone", () => {
    expect(federalDatesLine("2019", "Other", "Elsewhere", FED)).toBe("2019")
  })

  test("the crosswalk never reaches a file", async () => {
    const doc = buildResumeDocument(FED, CONTACT, [...FED_SECTIONS, "qualifications_crosswalk"], "federal")
    await buildAtsDocx(doc)
    const pdf = fakePdf()
    writeAtsPdf(pdf, doc)
    for (const t of [written.join("\n"), calls.map((c) => c.text).join("\n"), documentToPlainText(doc)])
      expect(t).not.toContain("scheduling appointments")
  })

  test("the federal PDF uses 0.5-inch margins and 10-pt text; the standard one is unchanged", () => {
    expect(LAYOUTS.standard).toEqual({ margin: 54, body: 10.5, name: 16, docxBody: 21, docxName: 32, footerFromBottom: 28 })
    const sizes: number[] = []
    const pdf = fakePdf()
    pdf.setFontSize = (n: number) => {
      sizes.push(n)
    }
    writeAtsPdf(pdf, buildResumeDocument(FED, CONTACT, FED_SECTIONS, "federal"))
    expect(Math.min(...calls.map((c) => c.x))).toBe(36)
    expect(sizes).toContain(10)
    expect(sizes).not.toContain(10.5)
    const std = fakePdf()
    writeAtsPdf(std, buildResumeDocument(DRAFT, CONTACT))
    expect(Math.min(...calls.map((c) => c.x))).toBe(54)
  })

  test("the federal Word file sets 0.5-inch margins; a standard one sets none", async () => {
    docArgs.length = 0
    await buildAtsDocx(buildResumeDocument(FED, CONTACT, FED_SECTIONS, "federal"))
    await buildAtsDocx(buildResumeDocument(DRAFT, CONTACT))
    const [fed, std] = docArgs as { sections: { properties?: { page: { margin: Record<string, number> } } }[] }[]
    expect(fed.sections[0].properties?.page.margin).toEqual({ top: 720, right: 720, bottom: 720, left: 720 })
    expect(std.sections[0].properties).toBeUndefined()
  })

  test("a standard document has no layout key at all", () => {
    expect(buildResumeDocument(DRAFT, CONTACT)).not.toHaveProperty("layout")
  })

  test("layoutAtsPdf reports the page count", () => {
    const long = { ...FED, experience: Array.from({ length: 40 }, (_, i) => ({ title: `Role ${i}`, organization: "Contoso", dates: "2019", bullets: ["One", "Two", "Three"] })) }
    expect(layoutAtsPdf(fakePdf(), buildResumeDocument(long, CONTACT, FED_SECTIONS, "federal"))).toBe(pages)
    expect(pages).toBeGreaterThan(2)
  })

  test("the selector recommends Federal when offered, and says so when it is not", () => {
    expect(recommendFormat("federal", "online", true, ["reverse_chrono", "federal"], "reverse_chrono").optionId).toBe("federal")
    const off = recommendFormat("federal", "online", true, ["reverse_chrono", "hybrid"], "reverse_chrono")
    expect(off.optionId).toBe("reverse_chrono")
    expect(off.notes.join(" ")).toMatch(/isn't switched on yet/)
    expect(inputLabel("series_grade")).toMatch(/GS-0343-09/)
  })
})

describe("situationsFor (Coord2 gate on FE #659)", () => {
  test("federal is listed only when the server offers the federal format", async () => {
    const { situationsFor } = await import("@/lib/resume/formatSelector")
    expect(situationsFor(["reverse_chrono", "hybrid"]).map((s) => s.id)).not.toContain("federal")
    expect(situationsFor(["reverse_chrono", "federal"]).map((s) => s.id)).toContain("federal")
    expect(situationsFor([]).map((s) => s.id)).toContain("same_field")
  })
})
