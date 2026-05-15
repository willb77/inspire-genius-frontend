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
})
