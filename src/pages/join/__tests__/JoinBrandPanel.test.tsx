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

  it("keeps the /join 'What happens next' box word for word (it refers to the form's first box)", () => {
    const { container } = renderPage()
    const wall = (container.firstChild as HTMLElement).firstChild as HTMLElement
    expect(
      within(wall).getByText(
        "No account and nothing to install. Tick the first box to hear when the next webinar is scheduled.",
      ),
    ).toBeInTheDocument()
    expect(within(wall).queryByText(/Register your interest to hear when the next event/)).not.toBeInTheDocument()
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

describe("/join form-led layout", () => {
  it("widens the form column to 760px and gives it the larger grid track", () => {
    const { container } = renderPage()
    const root = container.firstChild as HTMLElement
    expect(root).toHaveClass("lg:grid-cols-[1fr_1.6fr]")
    const form = screen.getByRole("form", { name: "Register your interest" })
    const column = form.closest(".max-w-\\[760px\\]")
    expect(column).not.toBeNull()
    expect(column?.className).not.toContain("max-w-[560px]")
  })
})

describe("/join upcoming-events link", () => {
  it("links to /events, above the form rather than between its fields and the submit button", () => {
    renderPage()
    const link = screen.getByRole("link", { name: /see upcoming events/i })
    expect(link).toHaveAttribute("href", "/events")
    const form = screen.getByRole("form", { name: "Register your interest" })
    expect(form).not.toContainElement(link)
    expect(link.compareDocumentPosition(form) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })
})
