/**
 * @jest-environment jsdom
 */

/**
 * The shared manager / practitioner Workbench home.
 *
 * The assertions that matter are about what this surface REFUSES to claim.
 * Manager and practitioner rosters are real people — students at a named school
 * in the manager case — so a number we did not measure, rendered confidently,
 * is a statement about a child that nobody checked.
 */
import { render, screen, within } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"

import { WorkbenchHome, __testables } from "../WorkbenchHome"
import type { WorkbenchConfig } from "../types"

function base(over: Partial<WorkbenchConfig> = {}): WorkbenchConfig {
  return {
    role: "manager",
    hero: "gradient",
    greeting: "Good morning, Alicia",
    subtitle: "9 on your roster",
    stats: [],
    upcoming: { title: "Upcoming check-ins", rows: [], emptyMessage: "Nothing is scheduled." },
    attention: { title: "PRISM outstanding", rows: [], emptyMessage: "All scored." },
    isLoading: false,
    ...over,
  }
}

function renderWB(config: WorkbenchConfig) {
  return render(
    <MemoryRouter>
      <WorkbenchHome {...config} />
    </MemoryRouter>,
  )
}

describe("a number we did not measure is never zero", () => {
  it("renders an em dash, not 0, for a null stat", () => {
    renderWB(
      base({
        stats: [
          { key: "attention", label: "Needs attention", value: null, hint: "not measured yet" },
        ],
      }),
    )
    expect(screen.getByText("—")).toBeInTheDocument()
    expect(screen.queryByText("0")).not.toBeInTheDocument()
    expect(screen.getByText("not measured yet")).toBeInTheDocument()
  })

  it("still renders a real 0 when we DID measure none", () => {
    // Negative control. Without this, the test above passes for a component
    // that can never show a zero at all — which would hide genuine "none".
    renderWB(base({ stats: [{ key: "k", label: "PRISM outstanding", value: 0, hint: "not yet scored" }] }))
    expect(screen.getByText("0")).toBeInTheDocument()
    expect(screen.queryByText("—")).not.toBeInTheDocument()
  })
})

describe("loading, error and empty are three different states", () => {
  it("shows a loading state that claims nothing", () => {
    renderWB(base({ isLoading: true }))
    expect(screen.getByRole("status", { name: /loading workbench/i })).toBeInTheDocument()
    expect(screen.queryByText(/could not be loaded/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/Nothing is scheduled/i)).not.toBeInTheDocument()
  })

  it("renders a failure as a failure, never as an empty roster", () => {
    renderWB(base({ error: new Error("boom") }))
    expect(screen.getByText(/could not be loaded/i)).toBeInTheDocument()
    expect(screen.getByText(/not an empty roster/i)).toBeInTheDocument()
    // The empty-state copy must NOT appear — it would read as a statement
    // about the people rather than about the request.
    expect(screen.queryByText(/Nothing is scheduled/i)).not.toBeInTheDocument()
  })

  it("shows the empty message only when the load actually succeeded", () => {
    renderWB(base())
    expect(screen.getByText("Nothing is scheduled.")).toBeInTheDocument()
    expect(screen.queryByText(/could not be loaded/i)).not.toBeInTheDocument()
  })
})

describe("people with no name on file", () => {
  const rows = [
    { id: "nameless", name: null, meta: "no name", href: "/x" },
    { id: "mark", name: "Mark Tully", meta: "m", href: "/x" },
    { id: "amy", name: "Amy Adams", meta: "a", href: "/x" },
  ]

  it("sort last, not first", () => {
    // The natural key sorts "" ahead of every real name, which puts the least
    // identifiable person at the top of the list — the same defect fixed in the
    // student roster ordering.
    expect(__testables.orderRows(rows).map((r) => r.id)).toEqual(["amy", "mark", "nameless"])
  })

  it("treat a whitespace-only name as no name", () => {
    const blank = [{ id: "blank", name: "   ", meta: "", href: "/x" }, rows[2]]
    expect(__testables.orderRows(blank).map((r) => r.id)).toEqual(["amy", "blank"])
  })

  it("are labelled honestly rather than left blank", () => {
    renderWB(base({ upcoming: { title: "Upcoming check-ins", rows, emptyMessage: "none" } }))
    const list = within(screen.getByRole("list"))
    expect(list.getByText("Name not on file")).toBeInTheDocument()
    expect(list.getByText("Mark Tully")).toBeInTheDocument()
  })
})

describe("hero chrome is the only role difference", () => {
  it("renders the manager greeting and actions", () => {
    renderWB(
      base({
        actions: [
          { label: "View roster", to: "/manager/team", variant: "primary" },
          { label: "Team import", to: "/manager/bulk-import", variant: "secondary" },
        ],
      }),
    )
    expect(screen.getByText("Good morning, Alicia")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "View roster" })).toHaveAttribute("href", "/manager/team")
  })

  it("renders the practitioner cream hero from the same component", () => {
    renderWB(base({ role: "practitioner", hero: "cream", greeting: "Good morning, Dana." }))
    expect(screen.getByText("Good morning, Dana.")).toBeInTheDocument()
  })
})


describe("the hero does not state counts it does not have yet", () => {
  /* Caught on staging-b by watching the page load, not by a test.
   *
   * The hero renders OUTSIDE the loading branch so the greeting and actions
   * appear immediately — but the subtitle is a count sentence, so for the
   * second before the query resolved the page published
   * "0 on your roster · 0 without a PRISM result" about a real manager's team.
   * Brief, but it is a confident claim made with no data behind it, and it is
   * indistinguishable from the true statement about a manager who has nobody. */

  it("suppresses the count sentence while loading", () => {
    renderWB(base({ isLoading: true, subtitle: "2 on your roster · 1 without a PRISM result." }))
    expect(screen.queryByText(/on your roster/i)).not.toBeInTheDocument()
    expect(screen.getByText(/Loading your roster/i)).toBeInTheDocument()
  })

  it("still shows the greeting while loading", () => {
    // The fix must not blank the hero — the point is to withhold the NUMBERS,
    // not to make the page look broken.
    renderWB(base({ isLoading: true }))
    expect(screen.getByText("Good morning, Alicia")).toBeInTheDocument()
  })

  it("shows the count sentence once the data has resolved", () => {
    renderWB(base({ subtitle: "2 on your roster · 1 without a PRISM result." }))
    expect(screen.getByText(/2 on your roster/i)).toBeInTheDocument()
    expect(screen.queryByText(/Loading your roster/i)).not.toBeInTheDocument()
  })
})
