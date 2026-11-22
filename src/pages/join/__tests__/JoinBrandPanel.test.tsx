/**
 * @jest-environment jsdom
 *
 * The /join brand panel (copy v3) and the form subtitle, rendered through the
 * real JoinPage so the panel is proven to reach AuthLayout's wall.
 */
import { render, screen, within } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import JoinPage from "../JoinPage"
import { EVENTS_NEXT_STEP, JOIN_NEXT_STEP, JoinBrandPanel } from "../JoinBrandPanel"

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
      within(wall).getByText(/gives practitioners an AI mentoring partner that works alongside them, so clients keep making progress even after the session ends\./),
    ).toBeInTheDocument()
    expect(within(wall).getByText("One platform, many applications.")).toBeInTheDocument()
    expect(within(wall).getByText("Built for practitioners.")).toBeInTheDocument()
    expect(within(wall).getByText("For every setting")).toBeInTheDocument()
    for (const s of ["Individuals", "Teams", "Organisations", "Education", "Enterprise"]) {
      expect(within(wall).getByText(s)).toBeInTheDocument()
    }
    expect(within(wall).getByText("What happens next")).toBeInTheDocument()
  })

  it("carries the two points as the owner worded them (the same as /events), not the old ones", () => {
    const { container } = renderPage()
    const wall = (container.firstChild as HTMLElement).firstChild as HTMLElement
    const text = (wall.textContent ?? "").replace(/\s+/g, " ")
    // title and body are separate blocks, so textContent has no space between them
    expect(text).toMatch(/Built for practitioners\.\s*Follow your clients' progress between sessions, keeping them engaged\./)
    expect(text).toMatch(/Grounded in PRISM\.\s*Works with the tool your customers understand\./)
    expect(text).not.toMatch(/DISC|CliftonStrengths|MBTI|Big Five/)
    expect(text).not.toContain("Works with the assessments you already use")
    expect(text).not.toContain("give each one an AI mentor that is there between your sessions")
  })

  it("reads the same two points as /events and keeps its own 'What happens next' box", () => {
    const join = render(<JoinBrandPanel />).container
    const events = render(<JoinBrandPanel nextStep={EVENTS_NEXT_STEP} />).container
    const points = (c: HTMLElement) =>
      Array.from(c.querySelectorAll('ul[aria-label="What Inspires Genius offers"] > li'))
        .slice(0, 2)
        .map((li) => (li.textContent ?? "").replace(/\s+/g, " ").trim())
    expect(points(join)).toHaveLength(2)
    expect(points(join)).toEqual(points(events))
    // the box is the one thing that differs: /join's refers to the form's first tick box
    expect(join).toHaveTextContent(JOIN_NEXT_STEP)
    expect(join).not.toHaveTextContent(EVENTS_NEXT_STEP)
    expect(events).toHaveTextContent(EVENTS_NEXT_STEP)
    expect(events).not.toHaveTextContent(JOIN_NEXT_STEP)
  })

  it("has no link in its panel: it must not link to itself", () => {
    const { container } = renderPage()
    const wall = (container.firstChild as HTMLElement).firstChild as HTMLElement
    expect(within(wall).queryByRole("link")).not.toBeInTheDocument()
    expect(wall.querySelector('a[href="/join"]')).toBeNull()
    // the panel on its own: off by default, on only when asked
    expect(render(<JoinBrandPanel />).container.querySelector("a")).toBeNull()
    expect(render(<JoinBrandPanel linkToJoin />).container.querySelector('a[href="/join"]')).not.toBeNull()
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

  it("is a pill with bold text", () => {
    renderPage()
    const link = screen.getByRole("link", { name: /see upcoming events/i })
    expect(link.className).toContain("rounded-full")
    expect(link.className).toContain("font-bold")
    expect(link.className).toContain("bg-[#466bc4]")
  })
})
