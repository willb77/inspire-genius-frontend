/**
 * @jest-environment jsdom
 *
 * CX-5 — the student's Career Exploration page. Off (or a failed switch read)
 * the page is not shown and nothing else is asked. On: start, resume at the
 * version on screen, the worksheet fills from the session, pay shows its area
 * and data year or a reason, the chat sends over useMeridianChat with only
 * `surface: "career_exercise"` and renders its error, and a turn the
 * guardrails sent to the counselor is said plainly.
 */
import fs from "fs"
import path from "path"
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { MemoryRouter, Route, Routes } from "react-router-dom"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"

const mockEnabled = jest.fn()
jest.mock("@/services/career-exercise/counselor.service", () => ({
  getCareerExerciseEnabled: () => mockEnabled(),
  getStudentSessions: jest.fn(),
  addStudentNote: jest.fn(),
  confirmStudentPaths: jest.fn(),
}))
const mockList = jest.fn()
const mockStart = jest.fn()
const mockPause = jest.fn()
const mockResume = jest.fn()
jest.mock("@/services/career-exercise/student.service", () => ({
  getMySessions: () => mockList(),
  startMySession: () => mockStart(),
  pauseMySession: (id: unknown, v: unknown) => mockPause(id, v),
  resumeMySession: (id: unknown, v: unknown) => mockResume(id, v),
}))
const mockPay = jest.fn()
const mockOcc = jest.fn()
jest.mock("@/services/job-fit/occupations.service", () => ({
  getOccupationPay: (c: unknown) => mockPay(c),
  getOccupation: (c: unknown) => mockOcc(c),
}))
jest.mock("@/context/useAuth", () => ({ useAuth: () => ({ user: { token: "tok" } }) }))

type ChatOpts = {
  sessionKey: string
  accessToken?: string
  context?: Record<string, unknown>
  onAssistant?: (content: string, job: { metadata?: Record<string, unknown> }) => void
}
const mockSend = jest.fn().mockResolvedValue(undefined)
const chat = { opts: null as ChatOpts | null, error: null as string | null }
jest.mock("@/hooks/agents/useMeridianChat", () => ({
  useMeridianChat: (opts: ChatOpts) => {
    chat.opts = opts
    return {
      send: mockSend,
      isProcessing: false,
      partial: "",
      error: chat.error,
      clearError: jest.fn(),
      isPushConnected: false,
    }
  },
}))
const mockRenderPdf = jest.fn()
jest.mock("@/lib/exportTranscript/renderPdf", () => ({ renderHtmlToPdf: (h: string) => mockRenderPdf(h) }))
const mockDownload = jest.fn()
jest.mock("@/lib/exportTranscript", () => ({ downloadBlob: (n: string, b: Blob) => mockDownload(n, b) }))
jest.mock("@/components/user/chat/AssistantMarkdown", () => ({
  __esModule: true,
  default: ({ text }: { text: string }) => <span>{text}</span>,
}))
jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }))

import CareerExercisePage from "@/pages/career-exercise/CareerExercisePage"
import type { ExerciseSession } from "@/types/career-exercise/student"

const AREA = "Raleigh, NC metro area"

function session(over: Partial<ExerciseSession> = {}): ExerciseSession {
  return {
    session_id: "11111111-2222-3333-4444-555555555555",
    student_id: "me",
    tenant_id: null,
    stage: "explore",
    status: "active",
    version: 6,
    updated_at: "2026-11-10T12:00:00+00:00",
    self_portrait: "I work best when I can fix things with my hands",
    profile_reactions: [],
    pillars: { wiring: ["hands-on"], interests: ["robots"], aptitudes: ["maths"], context: ["no car"] },
    roles: [
      {
        onet_soc: "29-2061.00",
        title: "Licensed Practical Nurse",
        cluster: "Health",
        typical_education: "Postsecondary certificate",
        wage_p25: 48000,
        wage_median: 54000,
        wage_p75: 60000,
        wage_area: AREA,
        bucket: null,
        reason: null,
      },
      {
        onet_soc: "31-9092.00",
        title: "Medical Assistant",
        cluster: "Health",
        typical_education: null,
        wage_p25: null,
        wage_median: null,
        wage_p75: null,
        wage_area: null,
        bucket: null,
        reason: null,
      },
    ],
    posting_reaction: {},
    experiments: [],
    paths: null,
    annotations: [],
    paths_confirmation: null,
    ...over,
  }
}

function payFor(code: string) {
  if (code === "29-2061.00") {
    return {
      state: "ready",
      reason: null,
      data: { socCode: "29-2061", title: "LPN", level: "metro", requestedLevel: "national", areaLabel: AREA, fallbackReason: null, median: 54000, pct10: null, pct90: null, vintageLabel: "May 2024", source: "OEWS" },
    }
  }
  return { state: "empty", reason: "no published national median for 31-9092", data: null }
}

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={["/vertical/career-discovery/exercise"]}>
        <Routes>
          <Route path="/vertical/career-discovery/exercise" element={<CareerExercisePage />} />
          <Route path="/vertical/career-discovery" element={<p>Discovery home</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  jest.clearAllMocks()
  chat.opts = null
  chat.error = null
  mockEnabled.mockResolvedValue(true)
  mockPay.mockImplementation((c: string) => Promise.resolve(payFor(c)))
  mockOcc.mockImplementation((c: string) =>
    Promise.resolve(c === "29-2061.00" ? { state: "ready", reason: null, release: "29.3", data: null } : { state: "empty", reason: "no education data for 31-9092", data: null }),
  )
  mockRenderPdf.mockResolvedValue(new Blob(["pdf"]))
})

describe("the career_exercise switch", () => {
  test("off: the page is not shown and nothing else is asked", async () => {
    mockEnabled.mockResolvedValue(false)
    renderPage()
    expect(await screen.findByText("Discovery home")).toBeInTheDocument()
    expect(mockList).not.toHaveBeenCalled()
    expect(chat.opts).toBeNull()
  })

  test("a failed switch read is off", async () => {
    mockEnabled.mockRejectedValue(new Error("network"))
    renderPage()
    expect(await screen.findByText("Discovery home")).toBeInTheDocument()
    expect(mockList).not.toHaveBeenCalled()
  })

  test("while the switch is being read: no page, no session read", () => {
    mockEnabled.mockReturnValue(new Promise(() => {}))
    renderPage()
    expect(screen.getByLabelText("Checking the career exercise")).toBeInTheDocument()
    expect(screen.queryByText("Career exploration")).not.toBeInTheDocument()
    expect(mockList).not.toHaveBeenCalled()
  })
})

describe("on", () => {
  test("no session yet: start it", async () => {
    mockList.mockResolvedValueOnce({ sessions: [] }).mockResolvedValue({ sessions: [session({ stage: "welcome", roles: [] })] })
    mockStart.mockResolvedValue({ session: session(), created: true })
    renderPage()
    fireEvent.click(await screen.findByRole("button", { name: "Start the exercise" }))
    await waitFor(() => expect(mockStart).toHaveBeenCalledTimes(1))
    expect(await screen.findByRole("region", { name: "Your worksheet" })).toBeInTheDocument()
  })

  test("a failed start is said, not a spinner", async () => {
    mockList.mockResolvedValue({ sessions: [] })
    mockStart.mockRejectedValue({ response: { status: 403, data: { detail: "not enabled" } } })
    renderPage()
    fireEvent.click(await screen.findByRole("button", { name: "Start the exercise" }))
    expect(await screen.findByRole("alert")).toHaveTextContent("isn't open on your account")
  })

  test("a failed session read is an alert, never 'start'", async () => {
    mockList.mockRejectedValue({ response: { status: 500, data: {} } })
    renderPage()
    expect(await screen.findByRole("alert")).toHaveTextContent("could not be loaded")
    expect(screen.queryByRole("button", { name: "Start the exercise" })).not.toBeInTheDocument()
  })

  test("the worksheet fills from the session; pay shows area and data year, or the reason with no number", async () => {
    mockList.mockResolvedValue({ sessions: [session()] })
    renderPage()
    const sheet = await screen.findByRole("region", { name: "Your worksheet" })
    expect(within(sheet).getByText("I work best when I can fix things with my hands")).toBeInTheDocument()
    expect(within(sheet).getByText("How I'm wired")).toBeInTheDocument()
    const lpn = within(sheet).getByText("Licensed Practical Nurse").closest("tr") as HTMLElement
    expect(await within(lpn).findByText("Median $54,000 a year, middle range $48,000–$60,000")).toBeInTheDocument()
    expect(within(lpn).getByText(`${AREA} · May 2024`)).toBeInTheDocument()
    expect(within(lpn).getByText("United States · O*NET 29.3")).toBeInTheDocument()
    const ma = within(sheet).getByText("Medical Assistant").closest("tr") as HTMLElement
    expect(await within(ma).findByText(/Not available — no published national median for 31-9092/)).toBeInTheDocument()
    expect(within(ma).getByText(/Not available — no education data for 31-9092/)).toBeInTheDocument()
    expect(ma.textContent).not.toMatch(/\$/)
    // The current step is marked.
    expect(within(sheet).getByText("You are here").closest("article")).toHaveAttribute("aria-current", "step")
  })

  test("a stored figure whose data year cannot be confirmed is not shown", async () => {
    mockList.mockResolvedValue({ sessions: [session()] })
    mockPay.mockResolvedValue({ state: "unavailable", reason: "tables unreadable", data: null })
    renderPage()
    const sheet = await screen.findByRole("region", { name: "Your worksheet" })
    const lpn = within(sheet).getByText("Licensed Practical Nurse").closest("tr") as HTMLElement
    expect(await within(lpn).findByText(/data year for this figure could not be confirmed/)).toBeInTheDocument()
    expect(lpn.textContent).not.toMatch(/54,000/)
  })

  test("paused: resume sends the version on screen; the chat cannot send", async () => {
    mockList.mockResolvedValue({ sessions: [session({ status: "paused", version: 9 })] })
    mockResume.mockResolvedValue({ session: session() })
    renderPage()
    const btn = await screen.findByRole("button", { name: /Resume where I left off/ })
    expect(screen.getByRole("textbox", { name: "Your message" })).toBeDisabled()
    expect(screen.getByRole("button", { name: "Send" })).toBeDisabled()
    fireEvent.click(btn)
    await waitFor(() => expect(mockResume).toHaveBeenCalledWith("11111111-2222-3333-4444-555555555555", 9))
  })

  test("pause sends the version on screen; a version conflict is said and the list is read again", async () => {
    mockList.mockResolvedValue({ sessions: [session({ version: 6 })] })
    mockPause.mockRejectedValue({ response: { status: 409, data: { detail: { code: "version_conflict", currentVersion: 7 } } } })
    renderPage()
    fireEvent.click(await screen.findByRole("button", { name: /Pause/ }))
    await waitFor(() => expect(mockPause).toHaveBeenCalledWith("11111111-2222-3333-4444-555555555555", 6))
    expect(await screen.findByRole("alert")).toHaveTextContent("changed since this page loaded")
    await waitFor(() => expect(mockList.mock.calls.length).toBeGreaterThanOrEqual(2))
  })

  test("finished: read-only, and a new one can be started", async () => {
    mockList.mockResolvedValue({ sessions: [session({ status: "closed", stage: "close" })] })
    renderPage()
    expect(await screen.findByRole("button", { name: "Start a new exercise" })).toBeInTheDocument()
    expect(screen.getByRole("textbox", { name: "Your message" })).toBeDisabled()
    expect(screen.queryByText("You are here")).not.toBeInTheDocument()
  })
})

describe("the chat", () => {
  test("sends over useMeridianChat with only the career_exercise surface", async () => {
    mockList.mockResolvedValue({ sessions: [session()] })
    renderPage()
    const box = await screen.findByRole("textbox", { name: "Your message" })
    expect(chat.opts?.context).toEqual({ surface: "career_exercise" })
    expect(chat.opts?.sessionKey).toBe("career-exercise:11111111-2222-3333-4444-555555555555")
    fireEvent.change(box, { target: { value: "  I like fixing bikes  " } })
    fireEvent.click(screen.getByRole("button", { name: "Send" }))
    await waitFor(() => expect(mockSend).toHaveBeenCalledWith("I like fixing bikes"))
    expect(screen.getByText("I like fixing bikes")).toBeInTheDocument()
  })

  test("a blank message is not sent", async () => {
    mockList.mockResolvedValue({ sessions: [session()] })
    renderPage()
    await screen.findByRole("textbox", { name: "Your message" })
    fireEvent.click(screen.getByRole("button", { name: "Send" }))
    expect(await screen.findByText("Type a message first.")).toBeInTheDocument()
    expect(mockSend).not.toHaveBeenCalled()
  })

  test("the transport's error is rendered", async () => {
    chat.error = "Couldn't reach Meridian. Check your connection and try again."
    mockList.mockResolvedValue({ sessions: [session()] })
    renderPage()
    const alert = await screen.findByRole("alert")
    expect(alert).toHaveTextContent("Couldn't reach Meridian")
  })

  test("a settled turn re-reads the session so the worksheet fills in", async () => {
    mockList.mockResolvedValue({ sessions: [session()] })
    renderPage()
    await screen.findByRole("textbox", { name: "Your message" })
    const before = mockList.mock.calls.length
    act(() => chat.opts?.onAssistant?.("Great — let's look at some roles.", { metadata: { career_exercise: { stage_after: "explore" } } }))
    expect(await screen.findByText("Great — let's look at some roles.")).toBeInTheDocument()
    await waitFor(() => expect(mockList.mock.calls.length).toBeGreaterThan(before))
    expect(screen.queryByText("Talk to your counselor")).not.toBeInTheDocument()
  })

  test("a turn the guardrails sent to the counselor is said plainly", async () => {
    mockList.mockResolvedValue({ sessions: [session()] })
    renderPage()
    await screen.findByRole("textbox", { name: "Your message" })
    const reply = "The career exploration exercise isn't open on your account yet. Your counselor can explore careers with you."
    act(() => chat.opts?.onAssistant?.(reply, { metadata: { career_exercise: { guardrail: "age_blocked", next: "counselor" } } }))
    const alert = await screen.findByRole("alert")
    expect(alert).toHaveTextContent("Talk to your counselor")
    expect(screen.getByText(reply)).toBeInTheDocument()
    // The next ordinary turn clears it.
    act(() => chat.opts?.onAssistant?.("Okay, back to it.", { metadata: { career_exercise: { stage_after: "explore" } } }))
    await waitFor(() => expect(screen.queryByText("Talk to your counselor")).not.toBeInTheDocument())
  })
})

test("the worksheet PDF: the page's own cells, with area and data year", async () => {
  mockList.mockResolvedValue({ sessions: [session()] })
  renderPage()
  const sheet = await screen.findByRole("region", { name: "Your worksheet" })
  await within(sheet).findByText(`${AREA} · May 2024`)
  fireEvent.click(screen.getByRole("button", { name: /Download worksheet/ }))
  await waitFor(() => expect(mockDownload).toHaveBeenCalledTimes(1))
  const html = mockRenderPdf.mock.calls[0][0] as string
  expect(html).toContain(`Median $54,000 a year, middle range $48,000–$60,000 (${AREA}; May 2024)`)
  expect(html).toContain("Not available — no published national median for 31-9092")
  expect(mockDownload.mock.calls[0][0]).toBe("career-exploration-worksheet_2026-11-10.pdf")
})

test("a PDF failure is a toast, and the button comes back", async () => {
  const { toast } = jest.requireMock("sonner") as { toast: { error: jest.Mock } }
  mockList.mockResolvedValue({ sessions: [session()] })
  mockRenderPdf.mockRejectedValue(new Error("canvas"))
  renderPage()
  const btn = await screen.findByRole("button", { name: /Download worksheet/ })
  fireEvent.click(btn)
  await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Could not generate the PDF."))
  await waitFor(() => expect(btn).not.toBeDisabled())
})

describe("static guards over the page's source", () => {
  const DIR = path.resolve(__dirname, "..")
  const sources = fs
    .readdirSync(DIR)
    .filter((f) => /\.tsx?$/.test(f))
    .map((f) => ({ f, src: fs.readFileSync(path.join(DIR, f), "utf8") }))

  test("finds the page's files (the guard is not inert)", () => {
    expect(sources.map((s) => s.f)).toEqual(expect.arrayContaining(["CareerExercisePage.tsx", "ExerciseChat.tsx"]))
  })

  test("the chat sends over useMeridianChat, never the WebSocket", () => {
    for (const { src } of sources) expect(src).not.toMatch(/useMeridianWebSocket|new WebSocket|sendMessage/)
    const chatSrc = sources.find((s) => s.f === "ExerciseChat.tsx")?.src ?? ""
    expect(chatSrc).toContain("useMeridianChat(")
  })

  test("the chat takes `error` off the hook and puts it on the screen", () => {
    const chatSrc = sources.find((s) => s.f === "ExerciseChat.tsx")?.src ?? ""
    expect(chatSrc).toMatch(/(^|[\s{,])error\s*(,|:|\})/m)
    expect(chatSrc).toMatch(/\{error && \(\s*<div role="alert"/)
  })

  test("the route sits under the career-discovery vertical and its constant agrees", () => {
    const routes = fs.readFileSync(path.resolve(__dirname, "../../../routes.tsx"), "utf8")
    const constants = fs.readFileSync(path.resolve(__dirname, "../../../constants/routes.ts"), "utf8")
    const block = routes.slice(routes.indexOf('path: "/vertical/career-discovery"'))
    expect(block.slice(0, block.indexOf('element: withSuspense(<DiscoveryShell />)'))).toContain(
      '{ path: "exercise", element: withSuspense(<CareerExercisePage />) }',
    )
    expect(constants).toContain('EXERCISE: "/vertical/career-discovery/exercise"')
  })
})
