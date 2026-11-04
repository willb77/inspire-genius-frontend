import type { Registrant } from "@/types/intake"
import {
  REGISTRATION_CSV_COLUMNS,
  csvCell,
  filtersFromView,
  formatDate,
  formatInZone,
  registrationsCsv,
  roleLabel,
  saveBlob,
  searchFromView,
  segmentSummary,
  timeZoneOptions,
  toZonedInput,
  viewFromSearch,
} from "../intakeView"
import { toWebinarInput, webinarFormSchema } from "../intake.schemas"

describe("viewFromSearch / searchFromView", () => {
  it("reads every filter and drops unknown values rather than guessing", () => {
    const v = viewFromSearch(
      new URLSearchParams(
        "segment_status=inspiresgenius&segment_context=moon&role=hr&role=astronaut&review=needs&days=30&q=ada&page=3",
      ),
    )
    expect(v).toEqual({
      segment_status: "inspiresgenius",
      segment_context: "",
      role: ["hr"],
      review: "needs",
      days: 30,
      q: "ada",
      page: 3,
    })
    expect(viewFromSearch(new URLSearchParams("days=12&page=-1&review=maybe"))).toMatchObject({
      days: null,
      page: 1,
      review: "",
    })
  })

  it("writes the view back, keeping keys it does not own (the tab)", () => {
    const base = new URLSearchParams("tab=webinars&role=mentor")
    const out = searchFromView(
      { segment_status: "", segment_context: "education", role: ["career_coach", "education_coach"], review: "reviewed", days: 7, q: " x ", page: 2 },
      base,
    )
    expect(out.get("tab")).toBe("webinars")
    expect(out.getAll("role")).toEqual(["career_coach", "education_coach"])
    expect(out.get("segment_context")).toBe("education")
    expect(out.get("review")).toBe("reviewed")
    expect(out.get("days")).toBe("7")
    expect(out.get("q")).toBe("x")
    expect(out.get("page")).toBe("2")
    const empty = searchFromView(viewFromSearch(new URLSearchParams()), new URLSearchParams())
    expect(empty.toString()).toBe("")
  })
})

describe("filtersFromView", () => {
  const blank = viewFromSearch(new URLSearchParams())

  it("maps review and the day window", () => {
    const now = new Date("2026-11-04T15:30:00Z")
    expect(filtersFromView({ ...blank, review: "needs", days: 30 }, now)).toEqual({
      needs_review: true,
      created_from: "2026-10-05T00:00:00.000Z",
    })
    expect(filtersFromView({ ...blank, review: "reviewed" }, now)).toEqual({ needs_review: false })
    expect(filtersFromView(blank, now)).toEqual({})
  })
})

describe("segmentSummary", () => {
  it("collapses a whole ticked row", () => {
    const all = ["individual", "company", "education", "other"].map((c) => ({
      segment_status: "inspiresgenius" as const,
      segment_context: c as "individual",
    }))
    expect(segmentSummary([...all, { segment_status: "non_inspiresgenius", segment_context: "company" }])).toEqual([
      "All 4 InspiresGenius segments",
      "Non-InspiresGenius · Company",
    ])
  })
})

describe("time zones", () => {
  it("shows a UTC instant as wall-clock time in the session's zone", () => {
    expect(toZonedInput("2026-07-01T13:00:00+00:00", "America/New_York")).toBe("2026-07-01T09:00")
    expect(toZonedInput("2026-01-15T09:00:00+00:00", "Europe/London")).toBe("2026-01-15T09:00")
    expect(toZonedInput("2026-07-01T23:30:00Z", "Asia/Tokyo")).toBe("2026-07-02T08:30")
  })

  it("formats in the zone, and falls back to the raw value for a zone it cannot use", () => {
    expect(formatInZone("2026-07-01T13:00:00Z", "America/New_York")).toMatch(/09:00/)
    expect(formatInZone("2026-07-01T13:00:00Z", "Not/AZone")).toBe("2026-07-01T13:00:00Z")
  })

  it("offers UTC and the browser's zones", () => {
    const zones = timeZoneOptions()
    expect(zones).toContain("UTC")
    expect(zones).toContain("America/New_York")
  })

  it("formatDate handles null and junk", () => {
    expect(formatDate(null)).toBe("—")
    expect(formatDate("nope")).toBe("nope")
    expect(formatDate("2026-11-04T10:00:00Z")).toMatch(/2026/)
  })
})

describe("CSV", () => {
  it.each([
    ["=1+1", "'=1+1"],
    ["+44 20", "'+44 20"],
    ["-x", "'-x"],
    ["@SUM(A1)", "'@SUM(A1)"],
    ['say "hi", ok', '"say ""hi"", ok"'],
    ["=a,b", `"'=a,b"`],
    [null, ""],
    [true, "yes"],
    [false, "no"],
    ["plain", "plain"],
  ])("cell %p", (value, expected) => {
    expect(csvCell(value)).toBe(expected)
  })

  it("writes a header and one row per registrant", () => {
    const row = Object.fromEntries(REGISTRATION_CSV_COLUMNS.map((c) => [c, null])) as unknown as Registrant
    const csv = registrationsCsv([{ ...row, first_name: "=evil()", email: "a@b.c", needs_review: true }])
    const [header, line] = csv.trim().split("\r\n")
    expect(header.split(",")).toEqual([...REGISTRATION_CSV_COLUMNS])
    expect(line.startsWith("'=evil(),")).toBe(true)
    expect(line).toContain("a@b.c")
    expect(line).toContain("yes")
  })

  it("saveBlob clicks a download link", () => {
    const create = jest.fn(() => "blob:1")
    const revoke = jest.fn()
    Object.assign(URL, { createObjectURL: create, revokeObjectURL: revoke })
    const click = jest.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {})
    saveBlob(new Blob(["x"]), "f.csv")
    expect(click).toHaveBeenCalled()
    expect(revoke).toHaveBeenCalledWith("blob:1")
    click.mockRestore()
  })
})

describe("roleLabel", () => {
  it("labels roles and spells out 'other'", () => {
    expect(roleLabel("hr")).toBe("HR")
    expect(roleLabel("other", "Pastor")).toBe("Other: Pastor")
    expect(roleLabel("other")).toBe("Other")
  })
})

describe("webinar form schema", () => {
  const good = {
    title: " Session ",
    startsAt: "2027-01-02T09:30",
    timeZone: "Europe/London",
    capacity: "25",
    joinLink: "",
    segments: [{ segment_status: "inspiresgenius", segment_context: "company" }],
  }

  it("turns form values into the API body, naive time + zone", () => {
    const values = webinarFormSchema.parse(good)
    expect(toWebinarInput(values)).toEqual({
      title: "Session",
      starts_at: "2027-01-02T09:30:00",
      time_zone: "Europe/London",
      capacity: 25,
      join_link: null,
      segments: good.segments,
    })
    expect(toWebinarInput(webinarFormSchema.parse({ ...good, status: "completed", joinLink: "https://z" }))).toMatchObject({
      status: "completed",
      join_link: "https://z",
    })
  })

  it("lists every field problem", () => {
    const r = webinarFormSchema.safeParse({ ...good, title: "", startsAt: "", capacity: "0", joinLink: "http://x", segments: [] })
    expect(r.success).toBe(false)
    const fields = r.success ? [] : r.error.issues.map((i) => i.path[0])
    expect(fields).toEqual(expect.arrayContaining(["title", "startsAt", "capacity", "joinLink", "segments"]))
  })
})
