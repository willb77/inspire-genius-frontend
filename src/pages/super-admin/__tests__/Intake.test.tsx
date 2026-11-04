import React from "react"
import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter } from "react-router-dom"
import Intake from "../Intake"
import type { Registrant, RegistrantDetail, SessionList, Webinar } from "@/types/intake"

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
  created_by: "admin@3pp.test",
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

beforeEach(() => {
  jest.clearAllMocks()
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
  it("renders only the two tabs this package ships", () => {
    renderAt("/super-admin/intake")
    expect(screen.getAllByRole("tab").map((t) => t.textContent)).toEqual(["Registrations", "Webinars"])
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
