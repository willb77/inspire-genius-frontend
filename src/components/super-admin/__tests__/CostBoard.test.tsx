/**
 * @jest-environment jsdom
 */
import { render, screen } from "@testing-library/react"
import CostBoard from "../CostBoard"
import type { CostBoardResult } from "@/hooks/cost-board/usePlatformCost"

const emptyResult: CostBoardResult = {
  data: {
    totalCostUsd: 0,
    totalTokens: 0,
    errorRate: 0,
    costByMentor: [],
    costByModelTier: [],
  },
  hasData: false,
  isLoading: false,
  error: null,
}

const populatedResult: CostBoardResult = {
  data: {
    totalCostUsd: 123.45,
    totalTokens: 678_901,
    errorRate: 0.012,
    costByMentor: [
      { agent: "Aura", cost: 42.5, sessions: 100, percentage: 35 },
      { agent: "Alex", cost: 31.2, sessions: 88, percentage: 26 },
    ],
    costByModelTier: [
      { tier: "tier_sonnet", cost: 80.1, count: 1200 },
      { tier: "tier_haiku", cost: 18.9, count: 450 },
    ],
  },
  hasData: true,
  isLoading: false,
  error: null,
}

const mockPlatform = jest.fn<CostBoardResult, []>()
const mockOrg = jest.fn<CostBoardResult, [string?]>()
const mockDept = jest.fn<CostBoardResult, [string?]>()

jest.mock("@/hooks/cost-board/usePlatformCost", () => ({
  __esModule: true,
  usePlatformCost: () => mockPlatform(),
}))
jest.mock("@/hooks/cost-board/useOrgCost", () => ({
  __esModule: true,
  useOrgCost: (id?: string) => mockOrg(id),
}))
jest.mock("@/hooks/cost-board/useDeptCost", () => ({
  __esModule: true,
  useDeptCost: (id?: string) => mockDept(id),
}))

beforeEach(() => {
  mockPlatform.mockReset()
  mockOrg.mockReset()
  mockDept.mockReset()
  mockPlatform.mockReturnValue(emptyResult)
  mockOrg.mockReturnValue(emptyResult)
  mockDept.mockReturnValue(emptyResult)
})

describe("CostBoard", () => {
  describe("scope dispatch", () => {
    it("renders at platform scope", () => {
      render(<CostBoard scope="platform" />)
      expect(screen.getByTestId("cost-board-platform")).toBeInTheDocument()
    })

    it("renders at org scope and forwards scopeId to useOrgCost", () => {
      render(<CostBoard scope="org" scopeId="org-123" />)
      expect(screen.getByTestId("cost-board-org")).toBeInTheDocument()
      expect(mockOrg).toHaveBeenCalledWith("org-123")
    })

    it("renders at dept scope (reserved for Wave 3)", () => {
      render(<CostBoard scope="dept" scopeId="dept-7" />)
      expect(screen.getByTestId("cost-board-dept")).toBeInTheDocument()
      expect(mockDept).toHaveBeenCalledWith("dept-7")
    })
  })

  describe("data-pending banner", () => {
    it("shows the banner when data is empty, not loading, and no error (platform)", () => {
      mockPlatform.mockReturnValue(emptyResult)
      render(<CostBoard scope="platform" />)
      const banner = screen.getByTestId("cost-board-data-pending-banner")
      expect(banner).toBeInTheDocument()
      expect(banner).toHaveTextContent(
        /audit-service EventBridge pipeline is still being verified/i
      )
      expect(banner).toHaveTextContent(/R-2\.4/i)
    })

    it("shows the banner when data is empty (org scope)", () => {
      mockOrg.mockReturnValue(emptyResult)
      render(<CostBoard scope="org" />)
      expect(
        screen.getByTestId("cost-board-data-pending-banner")
      ).toBeInTheDocument()
    })

    it("shows the banner when data is empty (dept scope)", () => {
      mockDept.mockReturnValue(emptyResult)
      render(<CostBoard scope="dept" />)
      expect(
        screen.getByTestId("cost-board-data-pending-banner")
      ).toBeInTheDocument()
    })

    it("hides the banner when loading", () => {
      mockPlatform.mockReturnValue({ ...emptyResult, isLoading: true })
      render(<CostBoard scope="platform" />)
      expect(
        screen.queryByTestId("cost-board-data-pending-banner")
      ).not.toBeInTheDocument()
    })

    it("hides the banner when an error is present", () => {
      mockPlatform.mockReturnValue({
        ...emptyResult,
        error: new Error("boom"),
      })
      render(<CostBoard scope="platform" />)
      expect(
        screen.queryByTestId("cost-board-data-pending-banner")
      ).not.toBeInTheDocument()
    })

    it("hides the banner when real data is present", () => {
      mockPlatform.mockReturnValue(populatedResult)
      render(<CostBoard scope="platform" />)
      expect(
        screen.queryByTestId("cost-board-data-pending-banner")
      ).not.toBeInTheDocument()
    })
  })

  describe("real data rendering", () => {
    it("renders KPIs, mentor rows, and model-tier rows when data is non-empty", () => {
      mockPlatform.mockReturnValue(populatedResult)
      render(<CostBoard scope="platform" />)

      // KPI strip
      expect(screen.getByText("$123.45")).toBeInTheDocument()
      expect(screen.getByText("678,901")).toBeInTheDocument()
      // Error rate splits "1.2" and "%" across text nodes
      expect(
        screen.getByText((_, node) => node?.textContent === "1.2%")
      ).toBeInTheDocument()

      // Mentor table
      expect(screen.getByText("Aura")).toBeInTheDocument()
      expect(screen.getByText("Alex")).toBeInTheDocument()
      expect(screen.getByText("$42.50")).toBeInTheDocument()
      expect(screen.getByText("$31.20")).toBeInTheDocument()

      // Model tier rows
      expect(screen.getByText("Tier sonnet")).toBeInTheDocument()
      expect(screen.getByText("Tier haiku")).toBeInTheDocument()
      expect(screen.getByText("$80.10")).toBeInTheDocument()
      expect(screen.getByText("$18.90")).toBeInTheDocument()
    })

    it("renders mentor data for org scope when the org hook returns data", () => {
      mockOrg.mockReturnValue({
        ...populatedResult,
        data: {
          ...populatedResult.data,
          costByMentor: [
            { agent: "Nova", cost: 12.5, sessions: 20, percentage: 50 },
          ],
        },
      })
      render(<CostBoard scope="org" scopeId="org-123" />)
      expect(screen.getByText("Nova")).toBeInTheDocument()
      expect(
        screen.queryByTestId("cost-board-data-pending-banner")
      ).not.toBeInTheDocument()
    })
  })
})
