import {
  barPercent,
  hasReportFilters,
  reportFiltersFromView,
  reportViewFromSearch,
  searchFromReportView,
  type ReportView,
} from "../reportView"

const EMPTY: ReportView = {
  segment_status: "",
  segment_context: "",
  role: [],
  prism_accredited: "",
  country: "",
  region: "",
  date_from: "",
  date_to: "",
}

describe("reportViewFromSearch", () => {
  it("reads every filter", () => {
    const view = reportViewFromSearch(
      new URLSearchParams(
        "tab=reports&segment_status=inspiresgenius&segment_context=education&role=hr&role=recruiter" +
          "&prism_accredited=not_sure&country=UK&region=Europe&date_from=2026-11-01&date_to=2026-11-30",
      ),
    )
    expect(view).toEqual({
      segment_status: "inspiresgenius",
      segment_context: "education",
      role: ["hr", "recruiter"],
      prism_accredited: "not_sure",
      country: "UK",
      region: "Europe",
      date_from: "2026-11-01",
      date_to: "2026-11-30",
    })
  })

  it("drops unknown values rather than guessing", () => {
    const view = reportViewFromSearch(
      new URLSearchParams(
        "segment_status=gold&segment_context=space&role=astronaut&role=hr&prism_accredited=maybe" +
          "&date_from=yesterday&date_to=2026-1-1",
      ),
    )
    expect(view).toEqual({ ...EMPTY, role: ["hr"] })
  })

  it("an empty URL is no filter", () => {
    expect(reportViewFromSearch(new URLSearchParams())).toEqual(EMPTY)
    expect(hasReportFilters(EMPTY)).toBe(false)
  })
})

describe("reportFiltersFromView", () => {
  it.each([
    [{ segment_status: "non_inspiresgenius" }, { segment_status: "non_inspiresgenius" }],
    [{ segment_context: "company" }, { segment_context: "company" }],
    [{ role: ["career_coach", "education_coach"] }, { role: ["career_coach", "education_coach"] }],
    [{ prism_accredited: "yes" }, { prism_accredited: "yes" }],
    [{ country: " UK " }, { country: "UK" }],
    [{ region: "Asia " }, { region: "Asia" }],
    [{ date_from: "2026-11-01" }, { date_from: "2026-11-01" }],
    [{ date_to: "2026-11-30" }, { date_to: "2026-11-30" }],
  ] as [Partial<ReportView>, object][])("%p → %p", (patch, expected) => {
    const view = { ...EMPTY, ...patch }
    expect(reportFiltersFromView(view)).toEqual(expected)
    expect(hasReportFilters(view)).toBe(true)
  })

  it("blank text is no filter", () => {
    expect(reportFiltersFromView({ ...EMPTY, country: "   ", region: "" })).toEqual({})
  })

  it("does not share the role array with the view", () => {
    const view = { ...EMPTY, role: ["hr" as const] }
    const f = reportFiltersFromView(view)
    f.role?.push("mentor")
    expect(view.role).toEqual(["hr"])
  })
})

describe("searchFromReportView", () => {
  it("round-trips through the URL and keeps keys it does not own", () => {
    const view: ReportView = {
      segment_status: "inspiresgenius",
      segment_context: "company",
      role: ["career_coach", "education_coach"],
      prism_accredited: "no",
      country: " US ",
      region: "North America",
      date_from: "2026-11-01",
      date_to: "2026-11-30",
    }
    const p = searchFromReportView(view, new URLSearchParams("tab=reports&page=3&q=ada&role=mentor"))
    expect(p.get("tab")).toBe("reports")
    expect(p.get("q")).toBe("ada")
    expect(p.get("page")).toBeNull()
    expect(p.getAll("role")).toEqual(["career_coach", "education_coach"])
    expect(p.get("country")).toBe("US")
    expect(reportViewFromSearch(p)).toEqual({ ...view, country: "US" })
  })

  it("clearing a filter removes its key", () => {
    const base = new URLSearchParams("tab=reports&role=hr&country=UK&date_from=2026-11-01")
    const p = searchFromReportView(EMPTY, base)
    expect(p.toString()).toBe("tab=reports")
  })
})

describe("barPercent", () => {
  it("scales to the largest count, with a visible minimum and zero for zero", () => {
    expect(barPercent(10, 10)).toBe(100)
    expect(barPercent(5, 10)).toBe(50)
    expect(barPercent(1, 1000)).toBe(2)
    expect(barPercent(0, 10)).toBe(0)
    expect(barPercent(0, 0)).toBe(0)
  })
})
