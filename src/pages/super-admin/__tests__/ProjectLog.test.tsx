import { render, screen } from "@testing-library/react"
import ProjectLog from "../ProjectLog"
import React from "react"

jest.mock("@/layouts/SuperAdminLayout", () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="super-admin-layout">{children}</div>
  ),
}))

describe("ProjectLog", () => {
  it("renders the page title", () => {
    render(<ProjectLog />)
    expect(screen.getByRole("heading", { name: "Project Log" })).toBeInTheDocument()
  })

  it("renders the description", () => {
    render(<ProjectLog />)
    expect(screen.getByText(/Documentation, change log/)).toBeInTheDocument()
  })

  it("renders an iframe pointing to IG_project_log.html", () => {
    render(<ProjectLog />)
    const iframe = screen.getByTitle("IG Project Log")
    expect(iframe).toBeInTheDocument()
  })

  it("renders tab triggers for Project Log and Site Map", () => {
    render(<ProjectLog />)
    expect(screen.getByRole("tab", { name: /Project Log/i })).toBeInTheDocument()
    expect(screen.getByRole("tab", { name: /Site Map/i })).toBeInTheDocument()
  })

  it("wraps content in SuperAdminLayout", () => {
    render(<ProjectLog />)
    expect(screen.getByTestId("super-admin-layout")).toBeInTheDocument()
  })
})
