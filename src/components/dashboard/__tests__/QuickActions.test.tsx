/**
 * @jest-environment jsdom
 */
import { render, screen, fireEvent } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { Users } from "lucide-react"
import QuickActions from "../QuickActions"

const MOCK_ACTIONS = [
  { label: "View Team", icon: Users, to: "/manager/team", bg: "bg-blue-100", iconColor: "text-blue-600" },
]

function renderWithRouter(ui: React.ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>)
}

describe("QuickActions", () => {
  it("renders action tiles", () => {
    renderWithRouter(<QuickActions actions={MOCK_ACTIONS} />)
    expect(screen.getByText("View Team")).toBeInTheDocument()
  })

  it("renders date mode toggles", () => {
    renderWithRouter(<QuickActions actions={MOCK_ACTIONS} />)
    expect(screen.getByText("day")).toBeInTheDocument()
    expect(screen.getByText("month")).toBeInTheDocument()
    expect(screen.getByText("range")).toBeInTheDocument()
  })

  it("toggles date mode on click", () => {
    renderWithRouter(<QuickActions actions={MOCK_ACTIONS} />)
    const monthBtn = screen.getByText("month")
    fireEvent.click(monthBtn)
    expect(monthBtn).toHaveClass("bg-[#3B5BFF]")
  })

  it("displays current date", () => {
    renderWithRouter(<QuickActions actions={MOCK_ACTIONS} />)
    expect(screen.getByText(/Quick Actions/)).toBeInTheDocument()
  })

  // `onClick` was added so an action can act in place (the "Ask Meridian"
  // tile opens the assistant popup) instead of navigating away.
  describe("in-page actions", () => {
    it("calls onClick instead of navigating", () => {
      const onClick = jest.fn()
      renderWithRouter(
        <QuickActions
          actions={[{ label: "Ask Meridian", icon: Users, onClick, bg: "bg-indigo-100", iconColor: "text-indigo-600" }]}
        />,
      )
      fireEvent.click(screen.getByText("Ask Meridian"))
      expect(onClick).toHaveBeenCalledTimes(1)
    })

    it("prefers onClick over `to` when both are set", () => {
      const onClick = jest.fn()
      renderWithRouter(
        <QuickActions
          actions={[{ label: "Both", icon: Users, to: "/somewhere", onClick, bg: "bg-blue-100", iconColor: "text-blue-600" }]}
        />,
      )
      fireEvent.click(screen.getByText("Both"))
      expect(onClick).toHaveBeenCalledTimes(1)
    })

    it("still navigates for actions that only declare `to`", () => {
      renderWithRouter(<QuickActions actions={MOCK_ACTIONS} />)
      expect(() => fireEvent.click(screen.getByText("View Team"))).not.toThrow()
    })
  })
})
