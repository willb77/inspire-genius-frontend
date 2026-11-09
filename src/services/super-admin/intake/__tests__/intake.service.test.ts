import {
  PAGE_MAX,
  cancelWebinar,
  createWebinar,
  downloadReportCsv,
  downloadSessionCsv,
  getIntakeReport,
  getRegistration,
  getSessionList,
  listAllRegistrations,
  listRegistrations,
  listWebinars,
  markAttendance,
  registrationParams,
  reportParams,
  updateWebinar,
} from "../intake.service"

const get = jest.fn()
const post = jest.fn()
const patch = jest.fn()
jest.mock("@/lib/axios", () => ({
  api: {
    get: (...a: unknown[]) => get(...a),
    post: (...a: unknown[]) => post(...a),
    patch: (...a: unknown[]) => patch(...a),
  },
}))
// The agent engine is the wrong door for intake; fail loudly if anything uses it.
jest.mock("@/lib/agentApi", () => ({ agentApi: new Proxy({}, { get: () => { throw new Error("agentApi used") } }) }))

const BASE = "/v1/intake/admin"

describe("intake.service", () => {
  beforeEach(() => jest.clearAllMocks())

  it("repeats role as role=a&role=b (FastAPI's list form), not role[]=", () => {
    const p = registrationParams(
      { role: ["career_coach", "education_coach"], segment_context: "company", needs_review: false, q: "  ada " },
      50,
      100,
    )
    expect(p.toString()).toBe(
      "segment_context=company&role=career_coach&role=education_coach&needs_review=false&q=ada&limit=50&offset=100",
    )
    expect(registrationParams({ segment_status: "inspiresgenius", created_from: "f", created_to: "t" }, 1, 0).toString()).toBe(
      "segment_status=inspiresgenius&created_from=f&created_to=t&limit=1&offset=0",
    )
  })

  it("lists one page through the api instance", async () => {
    get.mockResolvedValue({ data: { items: [], total: 0, limit: 50, offset: 0 } })
    await listRegistrations({ role: ["hr"] })
    expect(get).toHaveBeenCalledWith(`${BASE}/registrations`, { params: expect.any(URLSearchParams) })
    expect((get.mock.calls[0][1].params as URLSearchParams).getAll("role")).toEqual(["hr"])
  })

  it("export pages through every match", async () => {
    const page = (n: number, total: number) => ({
      data: { items: Array.from({ length: n }, (_, i) => ({ id: String(i) })), total, limit: PAGE_MAX, offset: 0 },
    })
    get.mockResolvedValueOnce(page(PAGE_MAX, PAGE_MAX + 3)).mockResolvedValueOnce(page(3, PAGE_MAX + 3))
    const rows = await listAllRegistrations({})
    expect(rows).toHaveLength(PAGE_MAX + 3)
    expect(get).toHaveBeenCalledTimes(2)
    expect((get.mock.calls[1][1].params as URLSearchParams).get("offset")).toBe(String(PAGE_MAX))
  })

  it("export stops when a full page reaches the total", async () => {
    get.mockResolvedValueOnce({ data: { items: Array.from({ length: PAGE_MAX }, () => ({})), total: PAGE_MAX } })
    expect(await listAllRegistrations({})).toHaveLength(PAGE_MAX)
    expect(get).toHaveBeenCalledTimes(1)
  })

  it("reads one registration, the webinars and a session list", async () => {
    get.mockResolvedValue({ data: { ok: 1 } })
    await getRegistration("a/b")
    expect(get).toHaveBeenLastCalledWith(`${BASE}/registrations/a%2Fb`)
    await listWebinars()
    expect(get).toHaveBeenLastCalledWith(`${BASE}/webinars`)
    await getSessionList("w1")
    expect(get).toHaveBeenLastCalledWith(`${BASE}/webinars/w1/registrations`)
  })

  it("writes webinars and attendance", async () => {
    post.mockResolvedValue({ data: { id: "w1" } })
    patch.mockResolvedValue({ data: { id: "w1" } })
    const input = {
      title: "T",
      starts_at: "2027-01-01T09:00:00",
      time_zone: "UTC",
      capacity: 3,
      join_link: null,
      segments: [{ segment_status: "inspiresgenius" as const, segment_context: "company" as const }],
    }
    await createWebinar(input)
    expect(post).toHaveBeenLastCalledWith(`${BASE}/webinars`, input)
    await updateWebinar({ id: "w1", title: "U" })
    expect(patch).toHaveBeenLastCalledWith(`${BASE}/webinars/w1`, { title: "U" })
    await cancelWebinar("w1")
    expect(post).toHaveBeenLastCalledWith(`${BASE}/webinars/w1/cancel`)
    await markAttendance({ webinarId: "w1", registrationIds: ["r1", "r2"], status: "no_show" })
    expect(post).toHaveBeenLastCalledWith(`${BASE}/webinars/w1/attendance`, {
      registration_ids: ["r1", "r2"],
      status: "no_show",
    })
  })

  it("downloads the session CSV as a blob", async () => {
    const blob = new Blob(["a,b"])
    get.mockResolvedValue({ data: blob })
    expect(await downloadSessionCsv("w1")).toBe(blob)
    expect(get).toHaveBeenCalledWith(`${BASE}/webinars/w1/registrations.csv`, { responseType: "blob" })
  })

  // ─── IN-7 reports ───────────────────────────────────────────────────

  it("maps every report filter to its query parameter, role repeated, blanks left out", () => {
    expect(
      reportParams({
        segment_status: "inspiresgenius",
        segment_context: "company",
        role: ["career_coach", "education_coach"],
        prism_accredited: "not_sure",
        country: "  UK ",
        region: " Europe",
        date_from: "2026-11-01",
        date_to: "2026-11-30",
      }).toString(),
    ).toBe(
      "segment_status=inspiresgenius&segment_context=company&role=career_coach&role=education_coach" +
        "&prism_accredited=not_sure&country=UK&region=Europe&date_from=2026-11-01&date_to=2026-11-30",
    )
    expect(reportParams({}).toString()).toBe("")
    expect(reportParams({ country: "   ", region: "", role: [] }).toString()).toBe("")
  })

  it.each([
    [{ segment_status: "non_inspiresgenius" as const }, "segment_status=non_inspiresgenius"],
    [{ segment_context: "education" as const }, "segment_context=education"],
    [{ role: ["hr" as const] }, "role=hr"],
    [{ prism_accredited: "yes" as const }, "prism_accredited=yes"],
    [{ country: "US" }, "country=US"],
    [{ region: "Asia" }, "region=Asia"],
    [{ date_from: "2026-01-01" }, "date_from=2026-01-01"],
    [{ date_to: "2026-02-01" }, "date_to=2026-02-01"],
  ])("sends %p as %s", (filters, expected) => {
    expect(reportParams(filters).toString()).toBe(expected)
  })

  it("reads the report through the api instance", async () => {
    get.mockResolvedValue({ data: { totals: {} } })
    expect(await getIntakeReport({ role: ["hr"] })).toEqual({ totals: {} })
    expect(get).toHaveBeenCalledWith(`${BASE}/reports`, { params: expect.any(URLSearchParams) })
    expect(get.mock.calls[0][1].params.toString()).toBe("role=hr")
  })

  it("downloads one report block as a blob with its filters, through the api instance", async () => {
    const blob = new Blob(["role,count"])
    get.mockResolvedValue({ data: blob })
    expect(await downloadReportCsv({ block: "by_role", filters: { segment_context: "company" } })).toBe(blob)
    expect(get).toHaveBeenCalledWith(`${BASE}/reports/export.csv`, {
      params: expect.any(URLSearchParams),
      responseType: "blob",
    })
    expect(get.mock.calls[0][1].params.toString()).toBe("segment_context=company&block=by_role")
  })
})
