/**
 * @jest-environment jsdom
 */
import { render, screen } from "@testing-library/react"
import LoadingSkeleton from "../LoadingSkeleton"

describe("LoadingSkeleton", () => {
  it("renders with default height", () => {
    render(<LoadingSkeleton />)
    const node = screen.getByTestId("chartkit-loading-skeleton")
    expect(node).toBeInTheDocument()
    expect(node).toHaveAttribute("aria-busy", "true")
    expect(node).toHaveStyle({ height: "200px" })
  })

  it("renders with a custom height", () => {
    render(<LoadingSkeleton height={320} />)
    const node = screen.getByTestId("chartkit-loading-skeleton")
    expect(node).toHaveStyle({ height: "320px" })
  })
})
