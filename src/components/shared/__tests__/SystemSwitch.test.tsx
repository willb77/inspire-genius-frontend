import "@testing-library/jest-dom"
import { render, screen, fireEvent } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"

// Mock sonner so toast.success doesn't throw during tests
jest.mock("sonner", () => ({
  toast: {
    success: jest.fn(),
  },
}))

// Mock the reloadPage helper so we can assert without fighting jsdom's
// read-only window.location.
jest.mock("@/lib/browser", () => ({
  reloadPage: jest.fn(),
}))

// Mock agentApi so we don't load axios + import.meta.env at module-load time;
// the spec is the kill-switch logic, not the axios instance.
jest.mock("@/lib/agentApi", () => ({
  useAgentEngine: () => {
    const val = window.localStorage.getItem("agent_engine_enabled")
    if (val === null) return true
    return val === "true"
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  agentApi: {} as any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getApi: () => ({}) as any,
}))

import { SystemSwitch } from "@/components/shared/SystemSwitch"

const browser = jest.requireMock("@/lib/browser") as { reloadPage: jest.Mock }

beforeEach(() => {
  localStorage.clear()
  jest.clearAllMocks()
  jest.useFakeTimers()
})

afterEach(() => {
  jest.useRealTimers()
})

function renderWithClient(ui: React.ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>)
}

describe("SystemSwitch", () => {
  it("defaults to Agent Engine target when localStorage is unset", () => {
    renderWithClient(<SystemSwitch />)
    const btn = screen.getByTestId("system-switch")
    expect(btn).toHaveTextContent(/Agent Engine/)
    expect(btn).toHaveTextContent(/Monolith/)
  })

  it("reads existing localStorage value as Monolith when explicitly disabled", () => {
    localStorage.setItem("agent_engine_enabled", "false")
    renderWithClient(<SystemSwitch />)
    const btn = screen.getByTestId("system-switch")
    expect(btn.textContent?.startsWith("Monolith")).toBe(true)
  })

  it("flips localStorage on click and triggers reload", () => {
    renderWithClient(<SystemSwitch />)
    fireEvent.click(screen.getByTestId("system-switch"))
    expect(localStorage.getItem("agent_engine_enabled")).toBe("false")
    jest.runAllTimers()
    expect(browser.reloadPage).toHaveBeenCalledTimes(1)
  })

  it("flips back to Agent Engine when starting from Monolith", () => {
    localStorage.setItem("agent_engine_enabled", "false")
    renderWithClient(<SystemSwitch />)
    fireEvent.click(screen.getByTestId("system-switch"))
    expect(localStorage.getItem("agent_engine_enabled")).toBe("true")
    jest.runAllTimers()
    expect(browser.reloadPage).toHaveBeenCalledTimes(1)
  })

  it("calls toast.success with W.1 deprecation note when switching to Monolith", () => {
    const sonner = jest.requireMock("sonner") as { toast: { success: jest.Mock } }
    renderWithClient(<SystemSwitch />)
    fireEvent.click(screen.getByTestId("system-switch"))
    expect(sonner.toast.success).toHaveBeenCalledTimes(1)
    const arg = sonner.toast.success.mock.calls[0][0]
    expect(arg).toMatch(/Monolith/)
    expect(arg).toMatch(/Agent Engine/)
  })

  it("disables the button after click to prevent double-flip during reload", () => {
    renderWithClient(<SystemSwitch />)
    const btn = screen.getByTestId("system-switch")
    fireEvent.click(btn)
    expect(btn).toBeDisabled()
  })

  it("has an accessible aria-label describing current and next state", () => {
    renderWithClient(<SystemSwitch />)
    const btn = screen.getByTestId("system-switch")
    expect(btn).toHaveAccessibleName(/Switch agent system/)
    expect(btn).toHaveAccessibleName(/Agent Engine/)
  })
})
