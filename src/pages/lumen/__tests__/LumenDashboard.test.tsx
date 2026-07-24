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

  test("names the three surfaces the vertical is building toward", () => {
    // The placeholder's whole job is to be honest about what's coming; if a
    // surface is dropped from the roadmap the copy should change with it.
    renderDashboard()
    expect(screen.getByText("My Self-Portrait")).toBeInTheDocument()
    expect(screen.getByText("Moments")).toBeInTheDocument()
    expect(screen.getByText("Personal coaching")).toBeInTheDocument()
  })
})
