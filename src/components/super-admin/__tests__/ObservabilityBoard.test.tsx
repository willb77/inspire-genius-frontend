/**
 * @jest-environment jsdom
 */
import { render, screen } from "@testing-library/react"
import ObservabilityBoard from "../ObservabilityBoard"
import type { ObservabilityBoardResult } from "@/hooks/observability-board/usePlatformObservability"

const emptyResult: ObservabilityBoardResult = {
  data: {
    kpis: {
      totalResponsesToday: 0,
      avgLatencyMs: null,
      avgConfidence: null,
      uniqueUsersToday: 0,
      errorRate: 0,
    },
    topAgents: [],
  },
  hasData: false,
  isLoading: false,
  error: null,
}

const populatedResult: ObservabilityBoardResult = {
  data: {
    kpis: {
      totalResponsesToday: 1234,
      avgLatencyMs: 187,
      avgConfidence: 0.91,
      uniqueUsersToday: 56,
      errorRate: 0.018,
    },
    topAgents: [
      { agent: "Aura", count: 100, avgConfidence: 0.95 },
      { agent: "Alex", count: 80, avgConfidence: 0.6 },
    ],
  },
  hasData: true,
  isLoading: false,
  error: null,
}

const mockPlatform = jest.fn<ObservabilityBoardResult, []>()
const mockOrg = jest.fn<ObservabilityBoardResult, [string?]>()

jest.mock("@/hooks/observability-board/usePlatformObservability", () => ({
  __esModule: true,
  usePlatformObservability: () => mockPlatform(),
}))
jest.mock("@/hooks/observability-board/useOrgObservability", () => ({
  __esModule: true,
  useOrgObservability: (id?: string) => mockOrg(id),
}))

beforeEach(() => {
  mockPlatform.mockReset()
  mockOrg.mockReset()
  mockPlatform.mockReturnValue(emptyResult)
  mockOrg.mockReturnValue(emptyResult)
})

describe("ObservabilityBoard", () => {
  describe("scope dispatch", () => {
    it("renders at platform scope", () => {
      render(<ObservabilityBoard scope="platform" />)
      expect(screen.getByTestId("observability-board-platform")).toBeInTheDocument()
    })

    it("renders at org scope and forwards scopeId to useOrgObservability", () => {
      render(<ObservabilityBoard scope="org" scopeId="org-123" />)
      expect(screen.getByTestId("observability-board-org")).toBeInTheDocument()
      expect(mockOrg).toHaveBeenCalledWith("org-123")
    })
  })

  describe("data-pending banner", () => {
    it("shows when data is empty, not loading, and no error (platform)", () => {
      render(<ObservabilityBoard scope="platform" />)
      const banner = screen.getByTestId("observability-board-data-pending-banner")
      expect(banner).toBeInTheDocument()
      // The old copy blamed "R-2.4", which closed 2026-05-11 — this test
      // previously locked that stale explanation in place. An empty board now
      // says the window was quiet, and must NOT cite a finished work item.
      expect(banner).toHaveTextContent(/no agent activity recorded today/i)
      expect(banner).not.toHaveTextContent(/R-2\.4/i)
    })

    it("shows when data is empty (org scope)", () => {
      render(<ObservabilityBoard scope="org" />)
      expect(
        screen.getByTestId("observability-board-data-pending-banner")
      ).toBeInTheDocument()
    })

    it("hides when loading", () => {
      mockPlatform.mockReturnValue({ ...emptyResult, isLoading: true })
      render(<ObservabilityBoard scope="platform" />)
      expect(
        screen.queryByTestId("observability-board-data-pending-banner")
      ).not.toBeInTheDocument()
    })

    it("hides when an error is present", () => {
      mockPlatform.mockReturnValue({ ...emptyResult, error: new Error("boom") })
      render(<ObservabilityBoard scope="platform" />)
      expect(
        screen.queryByTestId("observability-board-data-pending-banner")
      ).not.toBeInTheDocument()
    })

    it("hides when real data is present", () => {
      mockPlatform.mockReturnValue(populatedResult)
      render(<ObservabilityBoard scope="platform" />)
      expect(
        screen.queryByTestId("observability-board-data-pending-banner")
      ).not.toBeInTheDocument()
    })
  })

  describe("real data rendering", () => {
    it("renders KPIs and top-agents rows when data is non-empty", () => {
      mockPlatform.mockReturnValue(populatedResult)
      render(<ObservabilityBoard scope="platform" />)

      expect(screen.getByText("1234")).toBeInTheDocument()
      expect(screen.getByText("187ms")).toBeInTheDocument()
      expect(screen.getByText("91%")).toBeInTheDocument()
      expect(screen.getByText("56")).toBeInTheDocument()
      expect(screen.getByText("Aura")).toBeInTheDocument()
      expect(screen.getByText("Alex")).toBeInTheDocument()
    })

    it("renders org-scoped top agents when the org hook returns data", () => {
      mockOrg.mockReturnValue({
        ...populatedResult,
        data: {
          ...populatedResult.data,
          topAgents: [{ agent: "Nova", count: 20, avgConfidence: 0.88 }],
        },
      })
      render(<ObservabilityBoard scope="org" scopeId="org-123" />)
      expect(screen.getByText("Nova")).toBeInTheDocument()
      expect(
        screen.queryByTestId("observability-board-data-pending-banner")
      ).not.toBeInTheDocument()
    })
  })
})
