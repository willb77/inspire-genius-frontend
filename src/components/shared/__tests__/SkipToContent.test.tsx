/**
 * @jest-environment jsdom
 */
import { render, screen } from "@testing-library/react"
import SkipToContent from "../SkipToContent"

describe("SkipToContent", () => {
  it("renders skip link with correct href", () => {
    render(<SkipToContent />)
    const link = screen.getByText("Skip to content")
    expect(link).toBeInTheDocument()
    expect(link).toHaveAttribute("href", "#main-content")
  })
})
