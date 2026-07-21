/**
 * @jest-environment jsdom
 *
 * Honor Coach Workbench — Activity + Schedule live wiring (smoke tests).
 * The schedule.service layer is mocked; these assert the pages render live data,
 * degrade to the empty state, POST a new session, and surface the iCal URL.
 */
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"

jest.mock("sonner", () => ({
  toast: { success: jest.fn(), info: jest.fn(), warning: jest.fn(), error: jest.fn() },
}))

// The live service layer — fully mocked so no axios/agentApi runs.
jest.mock("@/services/honor/schedule.service", () => ({
  getCoachActivityFeed: jest.fn(),
  getCoachSchedule: jest.fn(),
  getScheduleFeedUrl: jest.fn(),
  getGoogleConnect: jest.fn(),
  getGoogleStatus: jest.fn(),
  disconnectGoogle: jest.fn(),
  createCoachSession: jest.fn(),
  updateCoachSession: jest.fn(),
  deleteCoachSession: jest.fn(),
}))

// Caseload feeds the "fellow" dropdown — mock the read hook (avoids axios import).
jest.mock("@/hooks/honor/useCoachData", () => ({
  useCaseload: () => ({
    data: [
      { id: "2201", firstName: "Marcus", lastName: "Reyes" },
      { id: "2202", firstName: "Dana", lastName: "Whitfield" },
    ],
    isLoading: false,
  }),
}))

import * as scheduleSvc from "@/services/honor/schedule.service"
import HonorActivity from "../HonorActivity"
import HonorSchedule from "../HonorSchedule"

const svc = scheduleSvc as jest.Mocked<typeof scheduleSvc>

function renderPage(ui: React.ReactNode) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  jest.clearAllMocks()
  // Sensible defaults; individual tests override.
  svc.getCoachActivityFeed.mockResolvedValue([])
  svc.getCoachSchedule.mockResolvedValue([])
  svc.getGoogleConnect.mockResolvedValue({ available: false, reason: "Not configured" })
  svc.getGoogleStatus.mockResolvedValue({ connected: false })
  svc.disconnectGoogle.mockResolvedValue({ connected: false })
  svc.getScheduleFeedUrl.mockResolvedValue(null)
})

describe("HonorActivity — live feed", () => {
  test("renders activity items newest-first", async () => {
    svc.getCoachActivityFeed.mockResolvedValue([
      {
        id: "a1",
        action: "evaluation.ran",
        actor: "S. Carter",
        target: "Marcus Reyes",
        when: new Date().toISOString(),
        summary: "ran an evaluation on",
      },
      {
        id: "a2",
        action: "member.invited",
        actor: "S. Carter",
        target: "Dana Whitfield",
        when: new Date(Date.now() - 3600_000).toISOString(),
        summary: "invited",
      },
    ])

    renderPage(<HonorActivity />)

    expect(await screen.findByText("ran an evaluation on")).toBeInTheDocument()
    expect(screen.getByText("invited")).toBeInTheDocument()
    expect(screen.getAllByText("S. Carter").length).toBe(2)
  })

  test("degrades to the empty state when the endpoint errors", async () => {
    svc.getCoachActivityFeed.mockRejectedValue(new Error("404"))

    renderPage(<HonorActivity />)

    expect(await screen.findByText(/No activity in the last 7 days/i)).toBeInTheDocument()
  })
})

describe("HonorSchedule — live sessions", () => {
  test("renders scheduled sessions", async () => {
    svc.getCoachSchedule.mockResolvedValue([
      {
        id: "s1",
        title: "PRISM debrief",
        kind: "debrief",
        startsAt: "2026-07-21T13:00:00.000Z",
        endsAt: "2026-07-21T14:00:00.000Z",
        location: "Room 2B",
        fellowId: "2201",
      },
    ])

    renderPage(<HonorSchedule />)

    expect(await screen.findByText("PRISM debrief")).toBeInTheDocument()
    expect(screen.getByText("Debrief")).toBeInTheDocument()
  })

  test("degrades to the empty state when schedule endpoint errors", async () => {
    svc.getCoachSchedule.mockRejectedValue(new Error("network"))

    renderPage(<HonorSchedule />)

    expect(await screen.findByText(/No sessions scheduled/i)).toBeInTheDocument()
  })

  test("New session form POSTs through the service", async () => {
    svc.getCoachSchedule.mockResolvedValue([])
    svc.createCoachSession.mockResolvedValue({
      id: "new1",
      title: "Goal review",
      startsAt: "2026-07-22T09:00:00.000Z",
    })

    renderPage(<HonorSchedule />)

    // Wait for initial load then open the form.
    await screen.findByText(/No sessions scheduled/i)
    fireEvent.click(screen.getByRole("button", { name: /New session/i }))

    fireEvent.change(screen.getByLabelText("Title"), { target: { value: "Goal review" } })
    fireEvent.change(screen.getByLabelText("Date"), { target: { value: "2026-07-22" } })
    fireEvent.change(screen.getByLabelText("Start"), { target: { value: "09:00" } })

    fireEvent.click(screen.getByRole("button", { name: /Add session/i }))

    await waitFor(() => expect(svc.createCoachSession).toHaveBeenCalledTimes(1))
    expect(svc.createCoachSession).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Goal review", startsAt: expect.any(String) }),
    )
  })

  test("Subscribe (iCal) reveals the feed URL (reads feedUrl, forces https)", async () => {
    // Backend returns `feedUrl` (not `url`), and behind the API Gateway the
    // scheme can be internal http — the surface must read feedUrl + coerce https.
    svc.getScheduleFeedUrl.mockResolvedValue({
      token: "abc123",
      feedUrl: "http://anj1cbzsf8.execute-api.us-east-1.amazonaws.com/v1/agents/honor/coach/schedule/feed.ics?token=abc123",
    })

    renderPage(<HonorSchedule />)

    fireEvent.click(screen.getByRole("button", { name: /Subscribe \(iCal\)/i }))

    const input = (await screen.findByLabelText("iCal subscribe URL")) as HTMLInputElement
    expect(input.value).toContain("feed.ics?token=abc123")
    expect(input.value.startsWith("https://")).toBe(true)
  })

  test("Google Calendar: unavailable renders the disabled button + coming-soon note", async () => {
    svc.getGoogleConnect.mockResolvedValue({ available: false, reason: "Not configured" })
    svc.getGoogleStatus.mockResolvedValue({ connected: false })

    renderPage(<HonorSchedule />)

    const btn = await screen.findByRole("button", { name: /Connect Google Calendar/i })
    expect(btn).toBeDisabled()
    expect(await screen.findByText(/coming soon/i)).toBeInTheDocument()
  })

  test("Google Calendar: available + not connected renders an enabled Connect button that opens authUrl", async () => {
    const authUrl = "https://accounts.google.com/o/oauth2/v2/auth?client_id=abc&scope=calendar"
    svc.getGoogleConnect.mockResolvedValue({ available: true, authUrl })
    svc.getGoogleStatus.mockResolvedValue({ connected: false })

    const openSpy = jest.spyOn(window, "open").mockReturnValue(null)

    renderPage(<HonorSchedule />)

    await waitFor(() =>
      expect(screen.getByRole("button", { name: /Connect Google Calendar/i })).not.toBeDisabled(),
    )
    fireEvent.click(screen.getByRole("button", { name: /Connect Google Calendar/i }))

    expect(openSpy).toHaveBeenCalledWith(authUrl, "_blank", "noopener")
    openSpy.mockRestore()
  })

  test("Google Calendar: connected renders Connected + a Disconnect button that calls the service", async () => {
    svc.getGoogleConnect.mockResolvedValue({ available: true })
    svc.getGoogleStatus.mockResolvedValue({ connected: true, googleEmail: "coach@example.com" })

    renderPage(<HonorSchedule />)

    expect(await screen.findByText(/Connected as coach@example\.com/i)).toBeInTheDocument()
    expect(await screen.findByText(/New sessions now sync to your Google Calendar/i)).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: /Disconnect/i }))

    await waitFor(() => expect(svc.disconnectGoogle).toHaveBeenCalledTimes(1))
  })
})
