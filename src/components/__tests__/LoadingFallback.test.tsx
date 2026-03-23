/**
 * @jest-environment jsdom
 */
import { render } from "@testing-library/react"
import LoadingFallback from "../LoadingFallback"

describe("LoadingFallback", () => {
  it("renders a spinner", () => {
    const { container } = render(<LoadingFallback />)
    expect(container.querySelector(".animate-spin")).toBeInTheDocument()
  })
})
