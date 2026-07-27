import { render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import LumenDashboard from "../LumenDashboard"

// The Self-Portrait card links out, so the page needs a router context.
const renderDashboard = () =>
  render(
    <MemoryRouter>
      <LumenDashboard />
    </MemoryRouter>
  )

describe("LumenDashboard", () => {
  test("renders the Lumen landing heading", () => {
    renderDashboard()
    expect(
      screen.getByRole("heading", { level: 1, name: "Lumen" })
    ).toBeInTheDocument()
  })

  test("names the three surfaces, each linking somewhere real", () => {
    // Every surface now ships, so each card must link — a card without a link
    // is the old placeholder state and should fail here.
    renderDashboard()
    for (const title of ["My Self-Portrait", "Moments", "Personal coaching"]) {
      // Each title also appears in the "how they fit together" paragraph, so
      // assert on the link, which is unique per surface.
      expect(
        screen.getByRole("link", { name: `Open ${title}` })
      ).toBeInTheDocument()
    }
  })

  test("says what Lumen is for before listing its parts", () => {
    // The ask was "purpose and intent needs to be clear". A user landing cold
    // must be told what this is and who it's for, above the surface cards.
    renderDashboard()
    expect(
      screen.getByText(/your own behavioral profile, put to work/i)
    ).toBeInTheDocument()
    expect(screen.getByText(/for you, not your employer/i)).toBeInTheDocument()
  })

  test("explains what triggers each surface", () => {
    // "Not sure what Personal coaching is or does. What triggers it?" — the
    // push/pull distinction is the answer, so it is pinned.
    renderDashboard()
    expect(screen.getByText("Comes to you")).toBeInTheDocument()
    expect(screen.getByText("You start it")).toBeInTheDocument()
  })
})
