/**
 * @jest-environment jsdom
 *
 * AuthLayout's optional `brandPanel` (used only by /join). The eight sign-in
 * pages pass no brandPanel, so the default wall must be exactly what it was:
 * the headline, the testimonial, and content pinned to the bottom.
 */
import { render, screen } from "@testing-library/react"
import "@testing-library/jest-dom"
import AuthLayout from "../AuthLayout"

const DEFAULT_WALL_CLASS = "relative hidden lg:flex flex-col justify-end overflow-hidden p-14 pt-[104px]"

function wallOf(container: HTMLElement): HTMLElement {
  return (container.firstChild as HTMLElement).firstChild as HTMLElement
}

describe("AuthLayout default wall (no brandPanel: every sign-in page)", () => {
  it("renders the headline, the tagline and the testimonial", () => {
    render(
      <AuthLayout>
        <p>child</p>
      </AuthLayout>,
    )
    expect(screen.getByRole("heading", { level: 2, name: /unlock your full potential/i })).toBeInTheDocument()
    expect(screen.getByText(/AI-powered coaching grounded in the PRISM/)).toBeInTheDocument()
    expect(screen.getByText("Sarah Reynolds")).toBeInTheDocument()
  })

  it("keeps the wall's classes exactly: bottom-aligned, not sticky", () => {
    const { container } = render(
      <AuthLayout>
        <p>child</p>
      </AuthLayout>,
    )
    const wall = wallOf(container)
    expect(wall.className).toBe(DEFAULT_WALL_CLASS)
    expect(wall).toHaveClass("justify-end")
    expect(wall).not.toHaveClass("lg:sticky")
  })
})

describe("AuthLayout with a brandPanel (/join)", () => {
  function renderWithPanel() {
    return render(
      <AuthLayout brandPanel={<h2>Panel headline</h2>}>
        <p>child</p>
      </AuthLayout>,
    )
  }

  it("replaces the default headline and testimonial with the panel", () => {
    renderWithPanel()
    expect(screen.getByRole("heading", { level: 2, name: "Panel headline" })).toBeInTheDocument()
    expect(screen.queryByText(/Unlock your/)).not.toBeInTheDocument()
    expect(screen.queryByText(/AI-powered coaching grounded in the PRISM/)).not.toBeInTheDocument()
    expect(screen.queryByText("Sarah Reynolds")).not.toBeInTheDocument()
    expect(screen.getByText("child")).toBeInTheDocument()
  })

  it("makes the wall sticky, full height, top-aligned and scrollable, still hidden below lg", () => {
    const { container } = renderWithPanel()
    const wall = wallOf(container)
    expect(wall).toHaveClass("lg:sticky", "lg:top-0", "lg:h-screen", "overflow-y-auto", "justify-start")
    expect(wall).toHaveClass("hidden", "lg:flex")
    expect(wall).not.toHaveClass("justify-end")
    expect(screen.getAllByAltText("Inspire Genius").length).toBeGreaterThan(0)
  })
})
