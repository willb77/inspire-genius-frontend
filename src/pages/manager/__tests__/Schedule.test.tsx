/**
 * @jest-environment jsdom
 */

/**
 * Manager Schedule (MSCH-1).
 *
 * Until 2026-10-15 this page called the practitioner scheduler, which refuses
 * managers. Every attempt failed with "Could not create sessions. Please try
 * again." — a message that hid a 403 that no retry could fix. These tests pin
 * the three things that made it invisible:
 *
 *  1. it sends direct reports' user ids to the MANAGER routes, as a UTC instant;
 *  2. a failure renders the server's reason, not a generic retry;
 *  3. people who were not booked, or not emailed, are named with the reason.
 */

import { act, fireEvent, render, screen } from "@testing-library/react"
import Schedule from "../Schedule"
import type { ManagerTeamMember } from "@/types/manager/team"
import type { TeamScheduleResult } from "@/types/manager/teamSchedule"

jest.mock("@/layouts/ManagerLayout", () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

jest.mock("@/components/dashboard/DataCard", () => ({
  __esModule: true,
  default: ({ title, children }: { title: string; children: React.ReactNode }) => (
    <section aria-label={title}>{children}</section>
  ),
}))

jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }))

const mockMutate = jest.fn()
const mockScheduleState: { data?: unknown; error?: unknown; isLoading: boolean } = { isLoading: false }
const mockPrefsState: { data?: { defaultLocation: string | null } } = {}

jest.mock("@/hooks/manager/useManagerTeam", () => ({ useManagerTeam: jest.fn() }))
jest.mock("@/hooks/manager/useTeamSchedule", () => ({
  useTeamSchedule: () => ({ ...mockScheduleState, refetch: jest.fn() }),
  useCreateTeamSessions: () => ({ mutate: mockMutate, isPending: false }),
  useTeamSchedulePreferences: () => ({ ...mockPrefsState, isLoading: false }),
}))

// eslint-disable-next-line @typescript-eslint/no-require-imports -- jest.mock factory hoisting
const { useManagerTeam } = require("@/hooks/manager/useManagerTeam") as {
  useManagerTeam: jest.Mock
}

function member(user_id: string, name: string): ManagerTeamMember {
  return {
    id: `emp-${user_id}`,
    user_id,
    name,
    email: `${user_id}@example.test`,
    role: "user",
    department: null,
    position: "Analyst",
    prism_color: null,
    training_completion: 0,
    last_active: null,
  } as ManagerTeamMember
}

beforeEach(() => {
  jest.clearAllMocks()
  mockScheduleState.data = []
  mockScheduleState.error = undefined
  mockPrefsState.data = { defaultLocation: null }
  useManagerTeam.mockReturnValue({
    data: { members: [member("u-riley", "Test Member A"), member("u-jordan", "Test Member B")] },
    isLoading: false,
    error: null,
  })
})

function fillAndSubmit() {
  fireEvent.click(screen.getByLabelText(/Test Member A/))
  fireEvent.click(screen.getByLabelText(/Test Member B/))
  fireEvent.change(screen.getByLabelText("Start time"), { target: { value: "2026-10-20T10:00" } })
  fireEvent.change(screen.getByLabelText("Topic"), { target: { value: "Check-in" } })
  fireEvent.click(screen.getByRole("button", { name: "Schedule sessions" }))
}

it("sends the selected reports' user ids and a UTC instant to the team routes", () => {
  render(<Schedule />)
  fillAndSubmit()
  expect(mockMutate).toHaveBeenCalledTimes(1)
  const input = mockMutate.mock.calls[0][0]
  expect(input.personIds).toEqual(["u-riley", "u-jordan"])
  expect(input).not.toHaveProperty("clientIds")
  expect(input.startsAt).toBe(new Date("2026-10-20T10:00").toISOString())
  expect(input.startsAt.endsWith("Z")).toBe(true)
  expect(input.topic).toBe("Check-in")
  expect(input.sendInvites).toBe(true)
})

it("renders the server's reason on failure, not a generic retry", () => {
  render(<Schedule />)
  fillAndSubmit()
  const opts = mockMutate.mock.calls[0][1]
  act(() => opts.onError({
    isAxiosError: true,
    response: { status: 403, data: { detail: "Scheduling with your team needs a manager role" } },
  }))
  expect(screen.getByRole("alert")).toHaveTextContent("needs a manager role")
  expect(screen.queryByText(/Please try again/)).toBeNull()
})

it("names who was not scheduled or not emailed, and why", () => {
  render(<Schedule />)
  fillAndSubmit()
  const result: TeamScheduleResult = {
    created: 1,
    sessions: [],
    skipped: [{ personId: "u-jordan", reason: "not_your_report" }],
    emailed: 0,
    notEmailed: [{ personId: "u-riley", reason: "email is switched off on this tier" }],
  }
  const opts = mockMutate.mock.calls[0][1]
  act(() => opts.onSuccess(result))
  const status = screen.getByRole("status")
  expect(status).toHaveTextContent("Test Member B: doesn't report to you")
  expect(status).toHaveTextContent("Test Member A: email is switched off on this tier")
})

it("lists upcoming sessions by the person's name", () => {
  mockScheduleState.data = [
    { sessionId: "s1", personId: "u-riley", personName: "Test Member A", startsAt: "2026-10-20T14:00:00+00:00", durationMin: 30, topic: "Check-in", status: "scheduled" },
  ]
  render(<Schedule />)
  const upcoming = screen.getByRole("region", { name: "Upcoming sessions" })
  expect(upcoming).toHaveTextContent("Test Member A")
  expect(upcoming).toHaveTextContent("Check-in")
})

it("says so when the session list cannot load, instead of showing an empty list", () => {
  mockScheduleState.error = {
    isAxiosError: true,
    response: { status: 403, data: { detail: "Scheduling with your team needs a manager role" } },
  }
  render(<Schedule />)
  const upcoming = screen.getByRole("region", { name: "Upcoming sessions" })
  expect(upcoming).toHaveTextContent("needs a manager role")
  expect(upcoming).not.toHaveTextContent("No sessions scheduled yet")
})

// ── MSCH-2: location ──────────────────────────────────────────────
const LINK = "https://meet.example.test/abc-defg-hij"

it("pre-fills Location from the default saved in Settings and sends it", () => {
  mockPrefsState.data = { defaultLocation: LINK }
  render(<Schedule />)
  expect(screen.getByLabelText("Location")).toHaveValue(LINK)
  fillAndSubmit()
  expect(mockMutate.mock.calls[0][0].location).toBe(LINK)
})

it("sends the location typed for this booking instead of the default", () => {
  mockPrefsState.data = { defaultLocation: LINK }
  render(<Schedule />)
  fireEvent.change(screen.getByLabelText("Location"), { target: { value: "  +1 555 0100  " } })
  fillAndSubmit()
  expect(mockMutate.mock.calls[0][0].location).toBe("+1 555 0100")
})

it("sends no location when the box is cleared", () => {
  mockPrefsState.data = { defaultLocation: LINK }
  render(<Schedule />)
  fireEvent.change(screen.getByLabelText("Location"), { target: { value: "" } })
  fillAndSubmit()
  expect(mockMutate.mock.calls[0][0]).not.toHaveProperty("location", expect.anything())
})

it("puts the default back after a booking", () => {
  mockPrefsState.data = { defaultLocation: LINK }
  render(<Schedule />)
  fireEvent.change(screen.getByLabelText("Location"), { target: { value: "Room 4" } })
  fillAndSubmit()
  const opts = mockMutate.mock.calls[0][1]
  act(() => opts.onSuccess({ created: 2, sessions: [], skipped: [], emailed: 2, notEmailed: [] }))
  expect(screen.getByLabelText("Location")).toHaveValue(LINK)
})

it("will not submit a location longer than the server accepts", () => {
  render(<Schedule />)
  fireEvent.change(screen.getByLabelText("Location"), { target: { value: "x".repeat(501) } })
  fillAndSubmit()
  expect(mockMutate).not.toHaveBeenCalled()
  expect(screen.getByText("At most 500 characters.")).toBeInTheDocument()
})

it("shows each upcoming session's location", () => {
  mockScheduleState.data = [
    { sessionId: "s1", personId: "u-riley", personName: "Test Member A", startsAt: "2026-10-20T14:00:00+00:00", durationMin: 30, topic: "Check-in", location: LINK, status: "scheduled" },
  ]
  render(<Schedule />)
  expect(screen.getByRole("region", { name: "Upcoming sessions" })).toHaveTextContent(LINK)
})
