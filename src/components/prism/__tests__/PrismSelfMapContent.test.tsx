/**
 * @jest-environment jsdom
 */
import { render, screen } from "@testing-library/react"
import { PrismSelfMapContent } from "../PrismSelfMapContent"
import type { PrismDimension } from "@/types/development"

const useMyPrism = jest.fn()
jest.mock("@/hooks/prism/useMyPrism", () => ({
  useMyPrism: (...args: unknown[]) => useMyPrism(...args),
}))

const DIMS: PrismDimension[] = [
  { id: 1, label: "Innovating", score: 88, quadrant: 1 },
  { id: 8, label: "Evaluating", score: 96, quadrant: 4 },
]

describe("PrismSelfMapContent", () => {
  afterEach(() => useMyPrism.mockReset())

  it("shows a loading state while fetching", () => {
    useMyPrism.mockReturnValue({ isLoading: true })
    render(<PrismSelfMapContent />)
    expect(screen.getByText(/loading your behavioral map/i)).toBeInTheDocument()
  })

  it("renders the radial map when data is present", () => {
    useMyPrism.mockReturnValue({ data: { hasData: true, dimensions: DIMS } })
    render(<PrismSelfMapContent />)
    expect(screen.getByTestId("prism-radial-map")).toBeInTheDocument()
  })

  it("prompts to complete an assessment when there is no data", () => {
    useMyPrism.mockReturnValue({ data: { hasData: false, dimensions: [] } })
    render(<PrismSelfMapContent />)
    expect(screen.getByText(/no prism assessment found yet/i)).toBeInTheDocument()
  })

  it("shows an error state on failure", () => {
    useMyPrism.mockReturnValue({ isError: true })
    render(<PrismSelfMapContent />)
    expect(screen.getByText(/couldn't load your behavioral map/i)).toBeInTheDocument()
  })
})
