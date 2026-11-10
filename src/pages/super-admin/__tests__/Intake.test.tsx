import React from "react"
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter } from "react-router-dom"
import Intake from "../Intake"
import type { IntakeReport, Registrant, RegistrantDetail, SessionList, Webinar } from "@/types/intake"

jest.mock("@/layouts/SuperAdminLayout", () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <div data-testid="super-admin-layout">{children}</div>,
}))

const toastError = jest.fn()
const toastSuccess = jest.fn()
jest.mock("sonner", () => ({ toast: { error: (m: string) => toastError(m), success: (m: string) => toastSuccess(m) } }))

type Q<T> = { data?: T; isLoading?: boolean; error?: unknown }
type MutateOpts = { onSuccess?: (v: unknown) => void; onError?: (e: unknown) => void }

const registrationsArgs = jest.fn()
let registrations: Q<{ items: Registrant[]; total: number; limit: number; offset: number }>
let detail: Q<RegistrantDetail>
let webinars: Q<{ items: Webinar[]; none_of_these_times_count: number }>
let sessionList: Q<SessionList>
const createMutate = jest.fn()
const updateMutate = jest.fn()
const cancelMutate = jest.fn()
const markMutate = jest.fn()
const exportMutate = jest.fn()
const csvMutate = jest.fn()
const reportArgs = jest.fn()
let report: Q<IntakeReport>
const reportCsvMutate = jest.fn()
let reportCsv: { mutate: jest.Mock; isPending: boolean; variables?: { block: string } }

jest.mock("@/hooks/super-admin/useIntake", () => ({
  useIntakeRegistrations: (...a: unknown[]) => {
    registrationsArgs(...a)
    return registrations
  },
  useIntakeRegistration: (id: string | null) => (id ? detail : {}),
  useIntakeWebinars: () => webinars,
  useSessionList: (id: string | null) => (id ? sessionList : {}),
  useCreateWebinar: () => ({ mutate: createMutate, isPending: false }),
  useUpdateWebinar: () => ({ mutate: updateMutate, isPending: false }),
  useCancelWebinar: () => ({ mutate: cancelMutate, isPending: false }),
  useMarkAttendance: () => ({ mutate: markMutate, isPending: false }),
  useExportRegistrations: () => ({ mutate: exportMutate, isPending: false }),
  useDownloadSessionCsv: () => ({ mutate: csvMutate, isPending: false }),
  useIntakeReport: (...a: unknown[]) => {
    reportArgs(...a)
    return report
  },
  useDownloadReportCsv: () => reportCsv,
}))

const axios422 = (detail: unknown) => ({ response: { status: 422, data: { detail } } })
const networkError = { message: "Network Error" }

const PERSON: Registrant = {
  id: "r1",
  first_name: "Ada",
  last_name: "Lovelace",
  email: "ada@example.org",
  phone: null,
  organisation: "Analytical Engines",
  role: "career_coach",
  role_other: null,
  prism_accredited: "not_sure",
  site_id: null,
  context: "company",
  context_other: null,
  region: "Europe",
  country: "UK",
  heard_from: "a friend",
  segment_status: "non_inspiresgenius",
  segment_context: "company",
  needs_review: true,
  created_at: "2026-11-01T09:00:00Z",
  confirmed_at: null,
}

const FUTURE: Webinar = {
  id: "w1",
  title: "PRISM for coaches",
  starts_at: "2099-07-01T13:00:00+00:00",
  time_zone: "America/New_York",
  capacity: 10,
  join_link: "https://zoom.example/j/1",
  status: "scheduled",
  created_by: "admin@example.org",
  created_at: null,
  updated_at: null,
  registered_count: 3,
  segments: ["individual", "company", "education", "other"].map((c) => ({
    segment_status: "inspiresgenius" as const,
    segment_context: c as "company",
  })),
}
const PAST: Webinar = {
  ...FUTURE,
  id: "w2",
  title: "Last month",
  starts_at: "2020-01-01T10:00:00+00:00",
  time_zone: "UTC",
  registered_count: 2,
  segments: [{ segment_status: "non_inspiresgenius", segment_context: "education" }],
}

function renderAt(url: string) {
  return render(
    <MemoryRouter initialEntries={[url]}>
      <Intake />
    </MemoryRouter>,
  )
}

const REPORT: IntakeReport = {
  filters: {},
  totals: { registrants: 12, needs_review: 3, session_registrations: 5, none_of_these_times: 2 },
  by_segment: [
    { segment_status: "inspiresgenius", segment_context: "company", count: 7 },
    { segment_status: "non_inspiresgenius", segment_context: "education", count: 5 },
  ],
  by_role: [
    { role: "hr", count: 4 },
    { role: "career_coach", count: 8 },
  ],
  by_region: [{ region: "Europe", count: 12 }],
  by_country: [{ country: "UK", count: 9 }, { country: "France", count: 3 }],
  by_source: [{ source: "(other)", count: 2 }, { source: "LinkedIn", count: 10 }],
  by_week: [{ week: "2026-W45", count: 12 }],
  by_session: [
    {
      webinar_id: "w1",
      title: "PRISM for coaches",
      starts_at: "2099-07-01T13:00:00+00:00",
      status: "cancelled",
      registered: 2,
      confirmed: 0,
      attended: 2,
      no_show: 1,
      total: 5,
    },
    {
      webinar_id: null,
      title: "(none of these times)",
      starts_at: null,
      status: null,
      registered: 2,
      confirmed: 0,
      attended: 0,
      no_show: 0,
      total: 2,
    },
  ],
}

beforeEach(() => {
  jest.clearAllMocks()
  report = { data: REPORT }
  reportCsv = { mutate: reportCsvMutate, isPending: false }
  registrations = { data: { items: [PERSON], total: 1, limit: 50, offset: 0 } }
  detail = {
    data: {
      ...PERSON,
      consents: [
        { id: "c1", purpose: "webinar_email", granted: true, wording: "Email me", form_version: "v1", created_at: null },
      ],
      webinar_registrations: [
        { id: "x", webinar_id: null, webinar_title: null, webinar_starts_at: null, status: "registered", created_at: null },
      ],
    },
  }
  webinars = { data: { items: [FUTURE, PAST], none_of_these_times_count: 4 } }
  sessionList = {
    data: {
      webinar: PAST,
      items: [
        {
          id: "reg1",
          registrant_id: "r1",
          first_name: "Ada",
          last_name: "Lovelace",
          email: "ada@example.org",
          organisation: null,
          role: "hr",
          segment_status: "non_inspiresgenius",
          segment_context: "education",
          needs_review: false,
          status: "registered",
          registered_at: null,
        },
        {
          id: "reg2",
          registrant_id: "r2",
          first_name: "Bob",
          last_name: "Babbage",
          email: "bob@example.org",
          organisation: null,
          role: "mentor",
          segment_status: "non_inspiresgenius",
          segment_context: "education",
          needs_review: false,
          status: "attended",
          registered_at: null,
        },
      ],
      counts: { registered: 1, attended: 1, no_show: 0 },
    },
  }
})

const lastFilters = () => registrationsArgs.mock.calls[registrationsArgs.mock.calls.length - 1][0]

describe("Intake — Registrations", () => {
  it("renders the three tabs shipped so far (Reports is IN-7)", () => {
    renderAt("/super-admin/intake")
    expect(screen.getAllByRole("tab").map((t) => t.textContent)).toEqual(["Registrations", "Webinars", "Reports"])
    // Reports is not fetched until its tab is open.
    expect(reportArgs).not.toHaveBeenCalled()
  })

  it("shows an error, not an empty list, when the service cannot be reached", () => {
    registrations = { error: networkError }
    renderAt("/super-admin/intake")
    expect(screen.getByRole("alert")).toHaveTextContent(/Could not load registrations/)
    expect(screen.queryByText(/No registrations match/)).not.toBeInTheDocument()
    expect(screen.getByRole("button", { name: /Export CSV/ })).toBeDisabled()
  })

  it("says plainly when nothing matches", () => {
    registrations = { data: { items: [], total: 0, limit: 50, offset: 0 } }
    renderAt("/super-admin/intake")
    expect(screen.getByText("No registrations match these filters.")).toBeInTheDocument()
    expect(screen.queryByRole("alert")).not.toBeInTheDocument()
  })

  it("a saved view's URL is the filter (Coaches)", () => {
    renderAt("/super-admin/intake?role=career_coach&role=education_coach")
    expect(lastFilters()).toEqual({ role: ["career_coach", "education_coach"] })
    expect(screen.getByLabelText("Role")).toHaveValue("career_coach,education_coach")
  })

  it("a saved view's URL is the filter (Companies)", () => {
    renderAt("/super-admin/intake?segment_context=company")
    expect(lastFilters()).toEqual({ segment_context: "company" })
    expect(screen.getByLabelText("Context")).toHaveValue("company")
  })

  it("filters change the query", async () => {
    const user = userEvent.setup()
    renderAt("/super-admin/intake")
    await user.selectOptions(screen.getByLabelText("Community"), "inspiresgenius")
    await user.selectOptions(screen.getByLabelText("Role"), "hr")
    await user.selectOptions(screen.getByLabelText("Status"), "needs")
    expect(lastFilters()).toEqual({ segment_status: "inspiresgenius", role: ["hr"], needs_review: true })
    await user.selectOptions(screen.getByLabelText("Registered"), "30")
    expect(lastFilters().created_from).toMatch(/T00:00:00.000Z$/)
  })

  it("search reaches the query after a pause", async () => {
    const user = userEvent.setup()
    renderAt("/super-admin/intake")
    await user.type(screen.getByLabelText("Search"), "ada")
    await waitFor(() => expect(lastFilters()).toEqual({ q: "ada" }))
  })

  it("opens a detail card with segment, consents and webinar choice", async () => {
    const user = userEvent.setup()
    renderAt("/super-admin/intake")
    const row = screen.getByRole("button", { name: "Ada Lovelace" })
    expect(within(row.closest("tr") as HTMLElement).getByText("Needs review")).toBeInTheDocument()
    await user.click(row)
    expect(screen.getByText("Analytical Engines")).toBeInTheDocument()
    expect(screen.getByText(/“Email me”/)).toBeInTheDocument()
    expect(screen.getByText(/None of the offered times worked/)).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "Close details" }))
    expect(screen.queryByText(/“Email me”/)).not.toBeInTheDocument()
  })

  it("export pulls every match with the current filters and saves a defused CSV", async () => {
    const user = userEvent.setup()
    const create = jest.fn(() => "blob:1")
    Object.assign(URL, { createObjectURL: create, revokeObjectURL: jest.fn() })
    const click = jest.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {})
    exportMutate.mockImplementation((_f: unknown, opts: MutateOpts) => opts.onSuccess?.([{ ...PERSON, first_name: "=x" }]))
    renderAt("/super-admin/intake?role=hr")
    await user.click(screen.getByRole("button", { name: /Export CSV/ }))
    expect(exportMutate.mock.calls[0][0]).toEqual({ role: ["hr"] })
    expect(click).toHaveBeenCalled()
    const blob = (create.mock.calls[0] as unknown as [Blob])[0]
    const text = await new Promise<string>((resolve) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result))
      reader.readAsText(blob)
    })
    expect(text).toContain("'=x")
    expect(toastSuccess).toHaveBeenCalledWith("1 registration exported")
    click.mockRestore()
  })

  it("pages", async () => {
    const user = userEvent.setup()
    registrations = { data: { items: [PERSON], total: 120, limit: 50, offset: 0 } }
    renderAt("/super-admin/intake")
    expect(screen.getByText("Page 1 of 3")).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "Next" }))
    const args = registrationsArgs.mock.calls[registrationsArgs.mock.calls.length - 1]
    expect(args.slice(1)).toEqual([50, 50])
  })
})

describe("Intake — Webinars", () => {
  it("shows an error, not an empty table, when the service cannot be reached", () => {
    webinars = { error: networkError }
    renderAt("/super-admin/intake?tab=webinars")
    expect(screen.getByRole("alert")).toHaveTextContent(/Could not load sessions/)
    expect(screen.queryByText(/No sessions yet/)).not.toBeInTheDocument()
  })

  it("lists sessions with their fill, segments and counts", () => {
    renderAt("/super-admin/intake?tab=webinars")
    expect(screen.getByText("1 upcoming · 1 past · 4 said none of the times work")).toBeInTheDocument()
    expect(screen.getByText("3 / 10")).toBeInTheDocument()
    expect(screen.getByText("All 4 InspiresGenius segments")).toBeInTheDocument()
    expect(screen.getByText("Non-InspiresGenius · Education")).toBeInTheDocument()
    expect(screen.getByLabelText("3 of 10 places taken")).toBeInTheDocument()
  })

  it("switches tabs through the URL", async () => {
    const user = userEvent.setup()
    renderAt("/super-admin/intake")
    await user.click(screen.getByRole("tab", { name: "Webinars" }))
    expect(screen.getByText("PRISM for coaches")).toBeInTheDocument()
    await user.click(screen.getByRole("tab", { name: "Registrations" }))
    expect(screen.getByRole("button", { name: "Ada Lovelace" })).toBeInTheDocument()
  })

  it("creates a session from the form, naive time + zone + ticked segments", async () => {
    const user = userEvent.setup()
    renderAt("/super-admin/intake?tab=webinars")
    await user.click(screen.getByRole("button", { name: /New session/ }))
    const dialog = screen.getByRole("dialog")
    await user.type(within(dialog).getByLabelText("Title"), "Classroom")
    await user.type(within(dialog).getByLabelText("Date and time"), "2099-03-01T14:00")
    await user.selectOptions(within(dialog).getByLabelText("Time zone"), "Europe/London")
    await user.clear(within(dialog).getByLabelText("Places"))
    await user.type(within(dialog).getByLabelText("Places"), "40")
    await user.click(within(dialog).getByLabelText("InspiresGenius · Education"))
    await user.click(within(dialog).getByLabelText("Non-InspiresGenius · Education"))
    await user.click(within(dialog).getByRole("button", { name: "Save" }))
    await waitFor(() => expect(createMutate).toHaveBeenCalled())
    expect(createMutate.mock.calls[0][0]).toEqual({
      title: "Classroom",
      starts_at: "2099-03-01T14:00:00",
      time_zone: "Europe/London",
      capacity: 40,
      join_link: null,
      segments: [
        { segment_status: "inspiresgenius", segment_context: "education" },
        { segment_status: "non_inspiresgenius", segment_context: "education" },
      ],
    })
  })

  it("refuses an empty segment grid before calling the server", async () => {
    const user = userEvent.setup()
    renderAt("/super-admin/intake?tab=webinars")
    await user.click(screen.getByRole("button", { name: /New session/ }))
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Save" }))
    expect(await screen.findByText("Tick at least one segment")).toBeInTheDocument()
    expect(createMutate).not.toHaveBeenCalled()
  })

  it("lists every server problem at once", async () => {
    const user = userEvent.setup()
    updateMutate.mockImplementation((_v: unknown, opts: MutateOpts) =>
      opts.onError?.(
        axios422([
          { field: "capacity", message: "capacity cannot be below the 3 people already registered for this session" },
          { field: "time_zone", message: "unknown time zone" },
        ]),
      ),
    )
    renderAt("/super-admin/intake?tab=webinars")
    await user.click(screen.getByRole("button", { name: "Edit PRISM for coaches" }))
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Save" }))
    const alert = await screen.findByRole("alert", { name: "Session errors" })
    expect(alert).toHaveTextContent("2 problems — nothing was saved")
    expect(alert).toHaveTextContent("capacity: capacity cannot be below the 3 people")
    expect(alert).toHaveTextContent("time_zone: unknown time zone")
  })

  it("an edit that leaves the time alone does not resend it", async () => {
    const user = userEvent.setup()
    updateMutate.mockImplementation((_v: unknown, opts: MutateOpts) => opts.onSuccess?.({}))
    renderAt("/super-admin/intake?tab=webinars")
    await user.click(screen.getByRole("button", { name: "Edit PRISM for coaches" }))
    const dialog = screen.getByRole("dialog")
    expect(within(dialog).getByLabelText("Date and time")).toHaveValue("2099-07-01T09:00")
    await user.clear(within(dialog).getByLabelText("Title"))
    await user.type(within(dialog).getByLabelText("Title"), "Renamed")
    await user.click(within(dialog).getByRole("button", { name: "Save" }))
    await waitFor(() => expect(updateMutate).toHaveBeenCalled())
    const sent = updateMutate.mock.calls[0][0]
    expect(sent).toMatchObject({ id: "w1", title: "Renamed", capacity: 10, status: "scheduled" })
    expect(sent).not.toHaveProperty("starts_at")
    expect(sent).not.toHaveProperty("time_zone")
    expect(toastSuccess).toHaveBeenCalledWith("Session saved")
  })

  it("editing a cancelled session never un-cancels it", async () => {
    const user = userEvent.setup()
    webinars = { data: { items: [{ ...FUTURE, status: "cancelled" }], none_of_these_times_count: 0 } }
    renderAt("/super-admin/intake?tab=webinars")
    await user.click(screen.getByRole("button", { name: "Edit PRISM for coaches" }))
    expect(screen.queryByLabelText("Status")).not.toBeInTheDocument()
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Save" }))
    await waitFor(() => expect(updateMutate).toHaveBeenCalled())
    expect(updateMutate.mock.calls[0][0]).not.toHaveProperty("status")
    expect(screen.queryByRole("button", { name: "Cancel PRISM for coaches" })).not.toBeInTheDocument()
  })

  it("cancels a session after confirmation", async () => {
    const user = userEvent.setup()
    cancelMutate.mockImplementation((_id: string, opts: MutateOpts) => opts.onSuccess?.({}))
    renderAt("/super-admin/intake?tab=webinars")
    await user.click(screen.getByRole("button", { name: "Cancel PRISM for coaches" }))
    expect(screen.getByRole("dialog")).toHaveTextContent("3 registrations are kept")
    await user.click(screen.getByRole("button", { name: "Cancel session" }))
    expect(cancelMutate.mock.calls[0][0]).toBe("w1")
    expect(toastSuccess).toHaveBeenCalledWith("Session cancelled")
  })

  it("opens a past session's list and marks attendance for the ticked people", async () => {
    const user = userEvent.setup()
    markMutate.mockImplementation((_v: unknown, opts: MutateOpts) => opts.onSuccess?.({ updated: 1, status: "attended" }))
    renderAt("/super-admin/intake?tab=webinars")
    await user.click(screen.getAllByRole("button", { name: "Open list" })[1])
    expect(screen.getByText(/1 registered · 1 attended · 0 no-show/)).toBeInTheDocument()
    const attended = screen.getByRole("button", { name: /Mark attended/ })
    expect(attended).toBeDisabled()
    await user.click(screen.getByLabelText("Select Ada Lovelace"))
    await user.click(attended)
    expect(markMutate.mock.calls[0][0]).toEqual({ webinarId: "w2", registrationIds: ["reg1"], status: "attended" })
    expect(toastSuccess).toHaveBeenCalledWith("1 marked attended")
  })

  it("select-all and no-show, with the server's problems listed", async () => {
    const user = userEvent.setup()
    markMutate.mockImplementation((_v: unknown, opts: MutateOpts) =>
      opts.onError?.(axios422([{ field: "registration_ids", message: "reg2 is not on this session's list" }])),
    )
    renderAt("/super-admin/intake?tab=webinars")
    await user.click(screen.getAllByRole("button", { name: "Open list" })[1])
    await user.click(screen.getByLabelText("Select everyone"))
    await user.click(screen.getByRole("button", { name: "Mark no-show" }))
    expect(markMutate.mock.calls[0][0]).toEqual({ webinarId: "w2", registrationIds: ["reg1", "reg2"], status: "no_show" })
    expect(screen.getByRole("alert", { name: "Attendance errors" })).toHaveTextContent("reg2 is not on this session's list")
  })

  it("attendance is not offered before a session starts", async () => {
    const user = userEvent.setup()
    sessionList = { data: { ...(sessionList.data as SessionList), webinar: FUTURE } }
    renderAt("/super-admin/intake?tab=webinars")
    await user.click(screen.getAllByRole("button", { name: "Open list" })[0])
    expect(screen.getByText("Attendance can be marked once the session has started.")).toBeInTheDocument()
    expect(screen.getByLabelText("Select Ada Lovelace")).toBeDisabled()
  })

  it("a session list that fails to load says so", async () => {
    const user = userEvent.setup()
    sessionList = { error: networkError }
    renderAt("/super-admin/intake?tab=webinars")
    await user.click(screen.getAllByRole("button", { name: "Open list" })[0])
    expect(screen.getByRole("alert")).toHaveTextContent(/Could not load this session's list/)
  })

  it("downloads the session list CSV", async () => {
    const user = userEvent.setup()
    Object.assign(URL, { createObjectURL: jest.fn(() => "blob:2"), revokeObjectURL: jest.fn() })
    const click = jest.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {})
    csvMutate.mockImplementation((_id: string, opts: MutateOpts) => opts.onSuccess?.(new Blob(["a"])))
    renderAt("/super-admin/intake?tab=webinars")
    await user.click(screen.getAllByRole("button", { name: "Open list" })[1])
    await user.click(screen.getByRole("button", { name: /Export CSV/ }))
    expect(csvMutate.mock.calls[0][0]).toBe("w2")
    expect(click).toHaveBeenCalled()
    click.mockRestore()
  })
})

// Public events list (monorepo CSA 2026-11-10-public-events-list-csa.md, PR A FE twin).
// FUTURE and PAST carry no `is_public` / `public_description`: they are the shape
// today's intake service returns, so every test on them is an old-backend test.
describe("Intake — Webinars: public events fields", () => {
  const PUBLIC: Webinar = { ...FUTURE, is_public: true, public_description: "An hour on PRISM." }

  it("an old-backend session (no public fields) opens unticked and an untouched edit sends neither key", async () => {
    const user = userEvent.setup()
    updateMutate.mockImplementation((_v: unknown, opts: MutateOpts) => opts.onSuccess?.({}))
    renderAt("/super-admin/intake?tab=webinars")
    await user.click(screen.getByRole("button", { name: "Edit PRISM for coaches" }))
    const dialog = screen.getByRole("dialog")
    expect(within(dialog).getByLabelText("Show on the public events page")).not.toBeChecked()
    expect(within(dialog).getByLabelText("Public description")).toHaveValue("")
    await user.click(within(dialog).getByRole("button", { name: "Save" }))
    await waitFor(() => expect(updateMutate).toHaveBeenCalled())
    const sent = updateMutate.mock.calls[0][0]
    expect(sent).not.toHaveProperty("is_public")
    expect(sent).not.toHaveProperty("public_description")
  })

  it("a new session sends is_public and the description only when set", async () => {
    const user = userEvent.setup()
    renderAt("/super-admin/intake?tab=webinars")
    await user.click(screen.getByRole("button", { name: /New session/ }))
    const dialog = screen.getByRole("dialog")
    await user.type(within(dialog).getByLabelText("Title"), "Open evening")
    await user.type(within(dialog).getByLabelText("Date and time"), "2099-03-01T14:00")
    await user.click(within(dialog).getByLabelText("InspiresGenius · Education"))
    await user.click(within(dialog).getByLabelText("Show on the public events page"))
    await user.type(within(dialog).getByLabelText("Public description"), "  Meet the team.  ")
    await user.click(within(dialog).getByRole("button", { name: "Save" }))
    await waitFor(() => expect(createMutate).toHaveBeenCalled())
    expect(createMutate.mock.calls[0][0]).toMatchObject({ is_public: true, public_description: "Meet the team." })
  })

  it("unticking a public session sends is_public false and leaves the description alone", async () => {
    const user = userEvent.setup()
    webinars = { data: { items: [PUBLIC], none_of_these_times_count: 0 } }
    updateMutate.mockImplementation((_v: unknown, opts: MutateOpts) => opts.onSuccess?.({}))
    renderAt("/super-admin/intake?tab=webinars")
    await user.click(screen.getByRole("button", { name: "Edit PRISM for coaches" }))
    const dialog = screen.getByRole("dialog")
    const box = within(dialog).getByLabelText("Show on the public events page")
    expect(box).toBeChecked()
    expect(within(dialog).getByLabelText("Public description")).toHaveValue("An hour on PRISM.")
    await user.click(box)
    await user.click(within(dialog).getByRole("button", { name: "Save" }))
    await waitFor(() => expect(updateMutate).toHaveBeenCalled())
    const sent = updateMutate.mock.calls[0][0]
    expect(sent).toMatchObject({ id: "w1", is_public: false })
    expect(sent).not.toHaveProperty("public_description")
  })

  it("clearing the description sends null", async () => {
    const user = userEvent.setup()
    webinars = { data: { items: [PUBLIC], none_of_these_times_count: 0 } }
    updateMutate.mockImplementation((_v: unknown, opts: MutateOpts) => opts.onSuccess?.({}))
    renderAt("/super-admin/intake?tab=webinars")
    await user.click(screen.getByRole("button", { name: "Edit PRISM for coaches" }))
    const dialog = screen.getByRole("dialog")
    await user.clear(within(dialog).getByLabelText("Public description"))
    await user.click(within(dialog).getByRole("button", { name: "Save" }))
    await waitFor(() => expect(updateMutate).toHaveBeenCalled())
    const sent = updateMutate.mock.calls[0][0]
    expect(sent).toHaveProperty("public_description", null)
    expect(sent).not.toHaveProperty("is_public")
  })

  it("refuses a description over 2,000 characters before calling the server", async () => {
    webinars = { data: { items: [PUBLIC], none_of_these_times_count: 0 } }
    const user = userEvent.setup()
    renderAt("/super-admin/intake?tab=webinars")
    await user.click(screen.getByRole("button", { name: "Edit PRISM for coaches" }))
    const dialog = screen.getByRole("dialog")
    fireEvent.change(within(dialog).getByLabelText("Public description"), { target: { value: "x".repeat(2001) } })
    await user.click(within(dialog).getByRole("button", { name: "Save" }))
    expect(await screen.findByText("Public description must be at most 2,000 characters")).toBeInTheDocument()
    expect(updateMutate).not.toHaveBeenCalled()
  })

  it("accepts exactly 2,000 characters", async () => {
    webinars = { data: { items: [PUBLIC], none_of_these_times_count: 0 } }
    updateMutate.mockImplementation((_v: unknown, opts: MutateOpts) => opts.onSuccess?.({}))
    const user = userEvent.setup()
    renderAt("/super-admin/intake?tab=webinars")
    await user.click(screen.getByRole("button", { name: "Edit PRISM for coaches" }))
    const dialog = screen.getByRole("dialog")
    fireEvent.change(within(dialog).getByLabelText("Public description"), { target: { value: "y".repeat(2000) } })
    await user.click(within(dialog).getByRole("button", { name: "Save" }))
    await waitFor(() => expect(updateMutate).toHaveBeenCalled())
    expect(updateMutate.mock.calls[0][0].public_description).toHaveLength(2000)
  })

  it("says changes reach the public page within about 2 minutes", async () => {
    const user = userEvent.setup()
    renderAt("/super-admin/intake?tab=webinars")
    await user.click(screen.getByRole("button", { name: /New session/ }))
    expect(within(screen.getByRole("dialog")).getByText(/within about 2 minutes/)).toBeInTheDocument()
  })

  it("badges a public session, and only that one", () => {
    webinars = { data: { items: [PUBLIC, PAST], none_of_these_times_count: 0 } }
    renderAt("/super-admin/intake?tab=webinars")
    const rows = screen.getAllByRole("row").slice(1)
    expect(within(rows[0]).getByText("Public")).toBeInTheDocument()
    expect(within(rows[1]).queryByText("Public")).not.toBeInTheDocument()
  })
})

// The edit dialog used to decide "was the time changed?" from react-hook-form's
// `dirtyFields`, which this form never fills in — so a changed date, time or
// zone was dropped from the PATCH while the dialog said "Session saved".
// FUTURE opens as 2099-07-01T09:00 in America/New_York.
describe("Intake — Webinars: an edit sends a changed date, time or zone", () => {
  async function openEdit() {
    const user = userEvent.setup()
    renderAt("/super-admin/intake?tab=webinars")
    await user.click(screen.getByRole("button", { name: "Edit PRISM for coaches" }))
    const dialog = screen.getByRole("dialog")
    expect(within(dialog).getByLabelText("Date and time")).toHaveValue("2099-07-01T09:00")
    return { user, dialog }
  }
  const save = async (user: ReturnType<typeof userEvent.setup>, dialog: HTMLElement) => {
    await user.click(within(dialog).getByRole("button", { name: "Save" }))
    await waitFor(() => expect(updateMutate).toHaveBeenCalled())
    return updateMutate.mock.calls[0][0]
  }

  beforeEach(() => {
    updateMutate.mockImplementation((_v: unknown, opts: MutateOpts) => opts.onSuccess?.({}))
  })

  it("a changed date only is sent, with the session's zone", async () => {
    const { user, dialog } = await openEdit()
    fireEvent.change(within(dialog).getByLabelText("Date and time"), { target: { value: "2099-07-02T09:00" } })
    const sent = await save(user, dialog)
    expect(sent).toMatchObject({ id: "w1", starts_at: "2099-07-02T09:00:00", time_zone: "America/New_York" })
  })

  it("a changed time only is sent", async () => {
    const { user, dialog } = await openEdit()
    fireEvent.change(within(dialog).getByLabelText("Date and time"), { target: { value: "2099-07-01T15:30" } })
    const sent = await save(user, dialog)
    expect(sent).toMatchObject({ starts_at: "2099-07-01T15:30:00", time_zone: "America/New_York" })
  })

  it("a changed zone only is sent, with the wall-clock time it opened with", async () => {
    const { user, dialog } = await openEdit()
    await user.selectOptions(within(dialog).getByLabelText("Time zone"), "Europe/London")
    const sent = await save(user, dialog)
    expect(sent).toMatchObject({ starts_at: "2099-07-01T09:00:00", time_zone: "Europe/London" })
  })

  it("a changed date and zone are both sent", async () => {
    const { user, dialog } = await openEdit()
    fireEvent.change(within(dialog).getByLabelText("Date and time"), { target: { value: "2099-08-15T18:45" } })
    await user.selectOptions(within(dialog).getByLabelText("Time zone"), "Europe/London")
    const sent = await save(user, dialog)
    expect(sent).toMatchObject({ starts_at: "2099-08-15T18:45:00", time_zone: "Europe/London" })
    expect(toastSuccess).toHaveBeenCalledWith("Session saved")
  })

  it("an untouched save sends exactly today's body (no time, no zone, no public fields)", async () => {
    const { user, dialog } = await openEdit()
    const sent = await save(user, dialog)
    expect(sent).toEqual({
      id: "w1",
      title: "PRISM for coaches",
      capacity: 10,
      join_link: "https://zoom.example/j/1",
      segments: FUTURE.segments,
      status: "scheduled",
    })
  })

  it("a time changed and then put back is untouched", async () => {
    const { user, dialog } = await openEdit()
    const input = within(dialog).getByLabelText("Date and time")
    fireEvent.change(input, { target: { value: "2099-07-02T09:00" } })
    fireEvent.change(input, { target: { value: "2099-07-01T09:00" } })
    const sent = await save(user, dialog)
    expect(sent).not.toHaveProperty("starts_at")
    expect(sent).not.toHaveProperty("time_zone")
  })

  it("a changed time the server refuses shows the server's error and does not claim success", async () => {
    updateMutate.mockImplementation((_v: unknown, opts: MutateOpts) =>
      opts.onError?.(axios422([{ field: "starts_at", message: "that time does not exist in America/New_York" }])),
    )
    const { user, dialog } = await openEdit()
    fireEvent.change(within(dialog).getByLabelText("Date and time"), { target: { value: "2099-03-08T02:30" } })
    const sent = await save(user, dialog)
    expect(sent).toMatchObject({ starts_at: "2099-03-08T02:30:00" })
    const alert = await screen.findByRole("alert", { name: "Session errors" })
    expect(alert).toHaveTextContent("starts_at: that time does not exist in America/New_York")
    expect(toastSuccess).not.toHaveBeenCalled()
    expect(screen.getByRole("dialog")).toBeInTheDocument()
  })
})

const lastReportFilters =() => reportArgs.mock.calls[reportArgs.mock.calls.length - 1][0]

describe("Intake — Reports (IN-7)", () => {
  it("renders every block's counts, and names nobody", () => {
    renderAt("/super-admin/intake?tab=reports")
    expect(screen.getByRole("tab", { name: "Reports" })).toHaveAttribute("aria-selected", "true")
    expect(lastReportFilters()).toEqual({})
    expect(screen.getByText("Registrants").nextSibling).toHaveTextContent("12")
    expect(screen.getByText("None of these times").nextSibling).toHaveTextContent("2")
    const role = screen.getByRole("table", { name: "By role" })
    expect(within(role).getByText("HR").closest("tr")).toHaveTextContent("4")
    expect(within(role).getByText("Career coach")).toBeInTheDocument()
    expect(within(screen.getByRole("table", { name: "By segment" })).getByText("InspiresGenius · Company")).toBeInTheDocument()
    expect(within(screen.getByRole("table", { name: "By country" })).getByText("France")).toBeInTheDocument()
    expect(within(screen.getByRole("table", { name: "By source (heard from)" })).getByText("LinkedIn")).toBeInTheDocument()
    expect(within(screen.getByRole("table", { name: "By week registered (ISO week)" })).getByText("2026-W45")).toBeInTheDocument()
    const sessions = screen.getByRole("table", { name: "By webinar session" })
    expect(within(sessions).getByText("None of these times work")).toBeInTheDocument()
    expect(within(sessions).getByText("(cancelled)")).toBeInTheDocument()
    expect(screen.getAllByRole("button", { name: /Download .* CSV/ })).toHaveLength(8)
  })

  it("shows an error, not a page of zeros, when the service cannot be reached", () => {
    report = { error: networkError }
    renderAt("/super-admin/intake?tab=reports")
    expect(screen.getByRole("alert")).toHaveTextContent(/Could not load reports/)
    expect(screen.queryByText("Registrants")).not.toBeInTheDocument()
  })

  it("lists the server's filter problems", () => {
    report = { error: axios422([{ field: "date_to", message: "must not be before date_from" }]) }
    renderAt("/super-admin/intake?tab=reports")
    expect(screen.getByRole("alert")).toHaveTextContent("date_to: must not be before date_from")
  })

  it("says plainly when a block is empty", () => {
    report = { data: { ...REPORT, by_country: [] } }
    renderAt("/super-admin/intake?tab=reports")
    expect(screen.getByText("No registrations match these filters.")).toBeInTheDocument()
  })

  it("shows the loading state", () => {
    report = { isLoading: true }
    renderAt("/super-admin/intake?tab=reports")
    expect(screen.getByText(/Loading reports/)).toBeInTheDocument()
  })

  it.each([
    ["HR", "/super-admin/intake?tab=reports&role=hr", { role: ["hr"] }, "hr"],
    ["Recruiters", "/super-admin/intake?tab=reports&role=recruiter", { role: ["recruiter"] }, "recruiter"],
    ["Companies", "/super-admin/intake?tab=reports&segment_context=company", { segment_context: "company" }, ""],
    [
      "Coaches",
      "/super-admin/intake?tab=reports&role=career_coach&role=education_coach",
      { role: ["career_coach", "education_coach"] },
      "career_coach,education_coach",
    ],
  ])("the %s preset opens Reports filtered", (_label, url, expected, roleValue) => {
    renderAt(url)
    expect(lastReportFilters()).toEqual(expected)
    expect(screen.getByLabelText("Role")).toHaveValue(roleValue)
  })

  it("switching from a preset to Registrations keeps the filter", async () => {
    const user = userEvent.setup()
    renderAt("/super-admin/intake?tab=reports&role=hr")
    await user.click(screen.getByRole("tab", { name: "Registrations" }))
    expect(lastFilters()).toEqual({ role: ["hr"] })
  })

  it("every filter in the bar reaches the query", async () => {
    const user = userEvent.setup()
    renderAt("/super-admin/intake?tab=reports")
    await user.selectOptions(screen.getByLabelText("Community"), "inspiresgenius")
    await user.selectOptions(screen.getByLabelText("Context"), "education")
    await user.selectOptions(screen.getByLabelText("Role"), "career_coach,education_coach")
    await user.selectOptions(screen.getByLabelText("PRISM accredited"), "not_sure")
    fireDate("Registered from", "2026-11-01")
    fireDate("to", "2026-11-30")
    expect(lastReportFilters()).toEqual({
      segment_status: "inspiresgenius",
      segment_context: "education",
      role: ["career_coach", "education_coach"],
      prism_accredited: "not_sure",
      date_from: "2026-11-01",
      date_to: "2026-11-30",
    })
    await user.type(screen.getByLabelText("Country"), "UK")
    await user.type(screen.getByLabelText("Region"), "Europe")
    await waitFor(() => expect(lastReportFilters()).toMatchObject({ country: "UK", region: "Europe" }), { timeout: 2000 })
    await user.click(screen.getByRole("button", { name: "Clear filters" }))
    expect(lastReportFilters()).toEqual({})
    expect(screen.queryByRole("button", { name: "Clear filters" })).not.toBeInTheDocument()
  })

  it("downloads one block's CSV through the hook with the current filters", async () => {
    const user = userEvent.setup()
    Object.assign(URL, { createObjectURL: jest.fn(() => "blob:r"), revokeObjectURL: jest.fn() })
    const click = jest.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {})
    reportCsvMutate.mockImplementation((_v: unknown, opts: MutateOpts) => opts.onSuccess?.(new Blob(["a"])))
    renderAt("/super-admin/intake?tab=reports&role=hr")
    await user.click(screen.getByRole("button", { name: "Download by_country CSV" }))
    expect(reportCsvMutate.mock.calls[0][0]).toEqual({ block: "by_country", filters: { role: ["hr"] } })
    expect(click).toHaveBeenCalled()
    click.mockRestore()
  })

  it("a failed download is a toast, and buttons wait while one runs", async () => {
    const user = userEvent.setup()
    reportCsvMutate.mockImplementation((_v: unknown, opts: MutateOpts) => opts.onError?.(networkError))
    renderAt("/super-admin/intake?tab=reports")
    await user.click(screen.getByRole("button", { name: "Download totals CSV" }))
    expect(toastError).toHaveBeenCalled()

    reportCsv = { mutate: reportCsvMutate, isPending: true, variables: { block: "by_week" } }
    renderAt("/super-admin/intake?tab=reports")
    const buttons = screen.getAllByRole("button", { name: "Download by_week CSV" })
    expect(buttons[buttons.length - 1]).toBeDisabled()
  })
})

function fireDate(label: string, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } })
}
