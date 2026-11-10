/**
 * @jest-environment jsdom
 *
 * The /join brand panel (copy v3) and the form subtitle, rendered through the
 * real JoinPage so the panel is proven to reach AuthLayout's wall.
 */
import { render, screen, within } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import JoinPage from "../JoinPage"

function renderPage() {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <JoinPage />
    </QueryClientProvider>,
  )
}

describe("/join brand panel", () => {
  it("renders the panel copy in the sticky wall", () => {
    const { container } = renderPage()
    const heading = screen.getByRole("heading", { level: 2, name: /support every client between sessions/i })
    const wall = (container.firstChild as HTMLElement).firstChild as HTMLElement
    expect(wall).toContainElement(heading)
    expect(wall).toHaveClass("lg:sticky")

    expect(
      within(wall).getByText(/gives mentors and practitioners an AI mentoring partner that works alongside them/),
    ).toBeInTheDocument()
    expect(within(wall).getByText("Built for practitioners")).toBeInTheDocument()
    expect(within(wall).getByText("For every setting")).toBeInTheDocument()
    for (const s of ["Individuals", "Teams", "Organisations", "Education", "Enterprise"]) {
      expect(within(wall).getByText(s)).toBeInTheDocument()
    }
    expect(within(wall).getByText("What happens next")).toBeInTheDocument()
  })

  it("carries bullet 2 verbatim", () => {
    const { container } = renderPage()
    const wall = (container.firstChild as HTMLElement).firstChild as HTMLElement
    const text = (wall.textContent ?? "").replace(/\s+/g, " ")
    expect(text).toContain(
      "Works with the assessments you already use (DISC, CliftonStrengths, MBTI, Big Five) grounded in PRISM to enhance all mentoring results.",
    )
  })

  it("says mentoring, not coaching, makes no contact promise and names no one", () => {
    const { container } = renderPage()
    const wall = (container.firstChild as HTMLElement).firstChild as HTMLElement
    const text = wall.textContent ?? ""
    expect(text).not.toMatch(/coach/i)
    expect(text).not.toMatch(/get in touch/i)
    expect(text).not.toMatch(/Sarah Reynolds|completely changed/i)
  })

  it("uses the mentoring subtitle on the form", () => {
    renderPage()
    expect(
      screen.getByText(
        "Inspires Genius is an AI mentoring platform. Leave your details below to register your interest.",
      ),
    ).toBeInTheDocument()
    expect(screen.queryByText(/AI coaching platform/)).not.toBeInTheDocument()
  })
})
