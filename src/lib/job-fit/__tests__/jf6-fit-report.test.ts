/**
 * JF-6 — the job page's PDF.
 *
 * - Off: with no `v2` input `buildFitReportHtml` is today's report BYTE FOR
 *   BYTE. The goldens under `__golden__/jf6-off-*.html` were written by the
 *   BASE sha's fitReport.ts (origin/development 39b92988) from the fixtures in
 *   `src/test/jf6Fixtures.ts`, before this package changed the file.
 * - On: the PDF carries the v2 page's sections, in the page's order, with the
 *   same words the page shows (one set of helpers feeds both).
 * - Local pay and education name their area (D13) and say plainly when empty.
 */
import fs from "fs"
import path from "path"
import {
  EDUCATION_AREA_LABEL,
  FIT_V2_SECTION_TITLES,
  NO_GROWTH_AREA_TEXT,
  NO_PROFILE_LOCATION_TEXT,
  buildFitReportHtml,
  educationSection,
  localPaySection,
  occupationCode,
  rankedGrowthAreas,
  readJobReference,
  referenceSection,
  skillsSection,
  type FitV2Report,
} from "@/lib/job-fit/fitReport"
import { fitCardGroups } from "@/components/fit/FitCardsModel"
import type { OccupationDetail, OccupationPay, OccupationRead } from "@/types/job-fit/occupations"
import { JF6_FIXTURES, JF6_PRIORITY, JF6_TODAY } from "@/test/jf6Fixtures"

const GOLDEN = path.join(__dirname, "__golden__")

const OCC_READY: OccupationRead<OccupationDetail> = {
  state: "ready",
  reason: null,
  release: "29.1",
  attribution: "O*NET 29.1 Database, U.S. Department of Labor (CC BY 4.0).",
  data: {
    code: "11-1021.00",
    socCode: "11-1021",
    title: "General and Operations Managers",
    description: "Plan, direct, or coordinate the operations.",
    skills: [
      { elementId: "2.A.1.a", name: "Coordination", importance: 4.1, level: 4.5 },
      { elementId: "2.A.1.b", name: "Monitoring", importance: 3.9, level: 4.0 },
    ],
    education: [
      { category: 6, label: "Bachelor's degree", percent: 52.4 },
      { category: 4, label: "Associate's degree", percent: 11 },
      { category: 2, label: "High school diploma", percent: 20.1 },
      { category: 7, label: "Post-baccalaureate certificate", percent: 3 },
    ],
    missing: [],
  },
}

const PAY_READY: OccupationRead<OccupationPay> = {
  state: "ready",
  reason: null,
  data: {
    socCode: "11-1021",
    title: "General and Operations Managers",
    level: "national",
    requestedLevel: "national",
    areaLabel: "United States",
    fallbackReason: null,
    median: 101280,
    pct10: 48150,
    pct90: 208000,
    source: "U.S. BLS OEWS, May 2024 (United States)",
  },
}

const PAY_EMPTY: OccupationRead<OccupationPay> = {
  state: "empty",
  reason: "no published national median for 11-1021 in OEWS May 2024",
  data: null,
}

const done = <T>(read: OccupationRead<T>) => ({ loading: false, failed: false, read })
const REF = { socCode: "11-1021", onetSocCode: "11-1021.00" }

function report(pay = PAY_READY): FitV2Report {
  const code = occupationCode(REF)
  return {
    groups: fitCardGroups(JF6_PRIORITY) ?? [],
    growth: rankedGrowthAreas(JF6_PRIORITY),
    reference: referenceSection(REF, { loading: false, failed: false }, done(OCC_READY)),
    skills: skillsSection(code, done(OCC_READY)),
    pay: localPaySection(code, done(pay)),
    education: educationSection(code, done(OCC_READY)),
  }
}

const h2s = (html: string) => [...html.matchAll(/<h2>([^<]*)<\/h2>/g)].map((m) => m[1])

describe("switch off — today's report, byte for byte", () => {
  test.each(Object.keys(JF6_FIXTURES))("%s matches the base golden", (name) => {
    const golden = fs.readFileSync(path.join(GOLDEN, `jf6-off-${name}.html`), "utf8")
    expect(buildFitReportHtml(JF6_FIXTURES[name])).toBe(golden)
  })
})

describe("switch on — the PDF carries the page's sections in the page's order", () => {
  test("headings are exactly the v2 section titles, in order", () => {
    const html = buildFitReportHtml({ data: JF6_PRIORITY, pct: 64, v2: report() })
    expect(h2s(html)).toEqual([...FIT_V2_SECTION_TITLES])
  })

  test("% fit with no gap score, and every section's words", () => {
    const html = buildFitReportHtml({ data: JF6_PRIORITY, pct: 64, v2: report() })
    expect(html).toContain("64% <span")
    expect(html).not.toMatch(/Overall closeness|Total distance|Where you stand/)
    // headline growth area = the top of the ranked list
    expect(html).toContain("<h2>Headline growth area</h2>\n    <p>Adaptability: you 40, this role 65 (-25).</p>")
    // card graphic as a table, with text status (D5)
    expect(html).toContain("<td>Core traits</td><td>Adaptability</td><td>65</td><td>40</td><td>-25</td><td>Growth area</td>")
    expect(html).toContain("<td>Work aptitudes</td><td>Innovating</td><td>65</td><td>Not measured</td><td>—</td><td>—</td>")
    expect(html).not.toContain("Persuading") // non-priority row stays off the cards
    expect(html).toContain("<li>SOC code: 11-1021</li><li>O*NET-SOC code: 11-1021.00</li>")
    expect(html).toContain("<li>Coordination</li><li>Monitoring</li>")
    expect(html).toContain(`<h3>Pay — United States</h3>`)
    expect(html).toContain("<li>Median pay: $101,280 a year</li>")
    expect(html).toContain(`<li>${NO_PROFILE_LOCATION_TEXT}</li>`)
    expect(html).toContain(`<h3>Education — ${EDUCATION_AREA_LABEL}</h3>`)
    expect(html).toContain("<li>Bachelor's degree: 52% of people in this occupation</li>")
  })

  test("Your profile versus the role: the top three, in rank order, with coaching", () => {
    const html = buildFitReportHtml({ data: JF6_PRIORITY, pct: 64, v2: report() })
    const ol = html.slice(html.indexOf("<ol>"), html.indexOf("</ol>"))
    expect([...ol.matchAll(/<strong>([^:]+):/g)].map((m) => m[1])).toEqual(["Adaptability", "Coordinating", "Relating"])
    expect(ol).toContain("Volunteer for one changed process.")
    expect(ol).not.toContain("Analyzing") // fourth of four
  })

  test("an empty pay read says so and names the area — never a number", () => {
    const html = buildFitReportHtml({ data: JF6_PRIORITY, pct: 64, v2: report(PAY_EMPTY) })
    expect(html).toContain("No published pay figure for this role in United States yet.")
    expect(html).toContain(PAY_EMPTY.reason as string)
    const local = html.slice(html.indexOf("<h3>Pay"), html.indexOf("<h3>Education"))
    expect(local).not.toMatch(/\$\d/)
  })
})

describe("the ranked growth list (D3)", () => {
  test("priority rows below the job, largest shortfall first; none on today's read", () => {
    expect(rankedGrowthAreas(JF6_PRIORITY).map((g) => [g.dimensionName, g.difference])).toEqual([
      ["Adaptability", -25],
      ["Coordinating", -20],
      ["Relating", -20],
      ["Analyzing", -12],
      ["Resilience", -4],
    ])
    expect(rankedGrowthAreas(JF6_TODAY)).toEqual([])
  })

  test("with nothing below the job the headline says so", () => {
    expect(NO_GROWTH_AREA_TEXT).toMatch(/No priority dimension is below/)
  })
})

describe("section text — never blank, never made up", () => {
  const none = { socCode: null, onetSocCode: null }
  const idle = { loading: false, failed: false, read: undefined }

  test("no code on file", () => {
    expect(referenceSection(none, { loading: false, failed: false }, idle).lines).toEqual([
      "No SOC or O*NET code is on file for this role yet.",
    ])
    for (const s of [skillsSection(null, idle), localPaySection(null, idle), educationSection(null, idle)]) {
      expect(s.empty).toBe(true)
      expect(s.lines.join(" ")).toMatch(/No SOC or O\*NET code is on file/)
    }
  })

  test("loading and failed reads are said as such, before the no-code case", () => {
    expect(referenceSection(none, { loading: true, failed: false }, idle).lines[0]).toMatch(/^Loading/)
    expect(referenceSection(none, { loading: false, failed: true }, idle).lines[0]).toMatch(/could not be read/)
    expect(skillsSection(null, { loading: true, failed: false }).lines[0]).toBe("Loading O*NET skills…")
    expect(localPaySection("11-1021", { loading: false, failed: true }).lines[0]).toBe(
      "Pay figures could not be read just now.",
    )
    expect(educationSection("11-1021", { loading: false, failed: false, read: undefined }).lines[0]).toBe(
      "Education data could not be read just now.",
    )
  })

  test("empty / unavailable occupation reads say so with the server's reason", () => {
    const empty = done<OccupationDetail>({ state: "empty", reason: "No O*NET release is loaded on this tier yet.", data: null })
    expect(skillsSection("11-1021", empty).lines[0]).toBe(
      "No O*NET skills are loaded for this occupation yet. No O*NET release is loaded on this tier yet.",
    )
    expect(educationSection("11-1021", empty).lines[0]).toBe("No O*NET education data is loaded for this occupation yet.")
    const unavailable = done<OccupationPay>({ state: "unavailable", reason: "The OEWS pay tables could not be read on this tier.", data: null })
    const pay = localPaySection("11-1021", unavailable)
    expect(pay.empty).toBe(true)
    expect(pay.areaLabel).toBe("United States")
    expect(pay.lines[0]).toContain("The OEWS pay tables could not be read on this tier.")
  })

  test("a fallback names the area answered and why", () => {
    const fb = done<OccupationPay>({
      ...PAY_READY,
      data: { ...(PAY_READY.data as OccupationPay), level: "state", requestedLevel: "local", areaLabel: "North Carolina", fallbackReason: "no published metro median" },
    })
    const pay = localPaySection("11-1021", fb)
    expect(pay.areaLabel).toBe("North Carolina")
    expect(pay.lines).toContain("Shown for North Carolina: no published metro median.")
    expect(pay.lines).not.toContain(NO_PROFILE_LOCATION_TEXT)
  })

  test("reference codes are read from the Job DNA response, anything else is null", () => {
    expect(readJobReference({ socCode: " 11-1021 ", onetSocCode: "" })).toEqual({ socCode: "11-1021", onetSocCode: null })
    expect(readJobReference(undefined)).toEqual({ socCode: null, onetSocCode: null })
    expect(occupationCode({ socCode: "11-1021", onetSocCode: "11-1021.00" })).toBe("11-1021.00")
    expect(occupationCode({ socCode: "11-1021", onetSocCode: null })).toBe("11-1021")
  })
})
