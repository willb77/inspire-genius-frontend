/**
 * @jest-environment jsdom
 *
 * Feeds Phase 2 — "Your goals and your wiring". At-tension is shown with what
 * pulls, never hidden; the switch off renders nothing.
 */
import { render, screen, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import type { GoalsWiring } from "@/types/job-fit/components"

const mockSwitch = jest.fn()
const mockWiring = jest.fn()
jest.mock("@/services/switches/jobFitComponents.service", () => ({
  getJobFitComponentsEnabled: () => mockSwitch(),
}))
jest.mock("@/services/job-fit/components.service", () => ({
  getFitComponents: jest.fn(),
  getGoalsWiring: () => mockWiring(),
}))

import { GoalsWiringCard } from "../GoalsWiringCard"

const WIRING: GoalsWiring = {
  scored: true, prismNeeded: false, engineVersion: "v1",
  goals: [
    { goalId: "g1", title: "research role", family: "Research & Analysis", verdict: "supported", score: 88, statement: null, supporting: ["Evaluating"], opposing: [] },
    { goalId: "g2", title: "move into sales", family: "Sales & Enterprise", verdict: "at-tension", score: 30, statement: null, supporting: [], opposing: ["Initiating", "Decisiveness"] },
    { goalId: "g3", title: "a career in tech", family: null, verdict: "unmapped", score: null, statement: null, supporting: [], opposing: [] },
  ],
}

const wrap = (ui: React.ReactNode) =>
  render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>{ui}</QueryClientProvider>)

beforeEach(() => jest.clearAllMocks())

test("off: renders nothing and never reads the wiring", async () => {
  mockSwitch.mockResolvedValue(false)
  const { container } = wrap(<GoalsWiringCard />)
  await waitFor(() => expect(mockSwitch).toHaveBeenCalled())
  expect(container).toBeEmptyDOMElement()
  expect(mockWiring).not.toHaveBeenCalled()
})

test("on: goals grouped by verdict, at-tension named with its two dimensions", async () => {
  mockSwitch.mockResolvedValue(true)
  mockWiring.mockResolvedValue(WIRING)
  wrap(<GoalsWiringCard />)
  expect(await screen.findByText(/your wiring pulls against these/i)).toBeInTheDocument()
  expect(screen.getByText(/pulling against it: initiating and decisiveness/i)).toBeInTheDocument()
  expect(screen.getByText(/carried by evaluating/i)).toBeInTheDocument()
  expect(screen.getByText(/not linked to a career family yet/i)).toBeInTheDocument()
})

test("no PRISM: says so instead of verdicts", async () => {
  mockSwitch.mockResolvedValue(true)
  mockWiring.mockResolvedValue({ ...WIRING, scored: false })
  wrap(<GoalsWiringCard />)
  expect(await screen.findByText(/complete prism/i)).toBeInTheDocument()
  expect(screen.queryByText(/pulls against these/i)).not.toBeInTheDocument()
})

test("error: an alert, not silence", async () => {
  mockSwitch.mockResolvedValue(true)
  mockWiring.mockRejectedValue(new Error("403"))
  wrap(<GoalsWiringCard />)
  expect(await screen.findByRole("alert")).toHaveTextContent(/couldn't read how your goals sit/i)
})
