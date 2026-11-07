import { render, screen, within } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { AdminHub } from "../AdminHub"
import { PRISM_HUB, USAGE_HUB } from "../hubs"

jest.mock("@/layouts/SuperAdminLayout", () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <div data-testid="sa-layout">{children}</div>,
}))

function renderHub(hub = USAGE_HUB, active = "activity", url = "/super-admin/analytics") {
  return render(
    <MemoryRouter initialEntries={[url]}>
      <AdminHub hub={hub} active={active}>
        <p>BODY</p>
      </AdminHub>
    </MemoryRouter>,
  )
}

describe("AdminHub", () => {
  it("renders the layout, one title, the tabs, the open tab's sentence and the body", () => {
    renderHub()
    expect(screen.getByTestId("sa-layout")).toBeInTheDocument()
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1)
    const nav = screen.getByRole("navigation", { name: "Usage & costs sections" })
    expect(within(nav).getAllByRole("link")).toHaveLength(3)
    expect(screen.getByText(USAGE_HUB.tabs[0].description)).toBeInTheDocument()
    expect(screen.queryByText(USAGE_HUB.tabs[1].description)).not.toBeInTheDocument()
    expect(screen.getByText("BODY")).toBeInTheDocument()
  })

  it("a tab that leaves the page explains itself; the open tab stays on its own address", () => {
    renderHub(USAGE_HUB, "activity")
    const coach = screen.getByRole("link", { name: "Cost per coach" })
    expect(coach).toHaveAttribute("href", "/super-admin/agent-trainer")
    expect(coach).toHaveAttribute("title", "Choose a coach in Agent Trainer, then Costs.")
    expect(coach).not.toHaveAttribute("aria-current")
  })

  it("the open tab keeps the current address (one coach's costs)", () => {
    renderHub(USAGE_HUB, "coach", "/super-admin/agent-trainer/c-1/costs")
    const coach = screen.getByRole("link", { name: "Cost per coach" })
    expect(coach).toHaveAttribute("href", "/super-admin/agent-trainer/c-1/costs")
    expect(coach).toHaveAttribute("aria-current", "page")
    expect(coach).not.toHaveAttribute("title")
  })

  it("every PRISM tab is an existing super-admin PRISM route", () => {
    expect(PRISM_HUB.tabs.map((t) => t.to)).toEqual([
      "/super-admin/prism-management",
      "/super-admin/prism-exam",
      "/super-admin/prism-accuracy-scorer",
      "/super-admin/prism-csv-converter",
    ])
  })
})
