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
const DEFAULT_GRID_CLASS = "min-h-screen grid grid-cols-1 lg:grid-cols-[1.4fr_1fr]"
const DEFAULT_LOGO_CLASS = "absolute top-14 left-14 z-10"

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

  it("keeps the sign-in grid split and logo position exactly", () => {
    const { container } = render(
      <AuthLayout>
        <p>child</p>
      </AuthLayout>,
    )
    expect((container.firstChild as HTMLElement).className).toBe(DEFAULT_GRID_CLASS)
    expect(container.querySelector("img[src=\"/Logo-Light.png\"]")?.parentElement?.className).toBe(
      DEFAULT_LOGO_CLASS,
    )
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

describe("AuthLayout with a brandPanel: form-led split (/join)", () => {
  it("gives the form the larger column and tightens the wall's padding", () => {
    const { container } = render(
      <AuthLayout brandPanel={<h2>Panel headline</h2>}>
        <p>child</p>
      </AuthLayout>,
    )
    const root = container.firstChild as HTMLElement
    expect(root).toHaveClass("min-h-screen", "grid", "grid-cols-1", "lg:grid-cols-[1fr_1.6fr]")
    expect(root).not.toHaveClass("lg:grid-cols-[1.4fr_1fr]")
    const wall = root.firstChild as HTMLElement
    expect(wall).toHaveClass("px-8", "pt-[88px]", "xl:px-10")
    expect(wall).not.toHaveClass("p-14")
    expect(wall).not.toHaveClass("pt-[104px]")
  })
})
