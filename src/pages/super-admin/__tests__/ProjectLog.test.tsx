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

  it("does not embed the log — it was a public CDN asset, so it is no longer published", () => {
    const { container } = render(<ProjectLog />)
    expect(screen.queryByTitle("IG Project Log")).not.toBeInTheDocument()
    // Guards the actual regression: anything re-pointing at the static asset.
    const embedded = Array.from(container.querySelectorAll("iframe, embed, object")).filter((el) =>
      (el.getAttribute("src") ?? el.getAttribute("data") ?? "").includes("IG_project_log"),
    )
    expect(embedded).toHaveLength(0)
  })

  it("explains where the log lives now", () => {
    render(<ProjectLog />)
    expect(screen.getByText(/no longer published here/i)).toBeInTheDocument()
    expect(screen.getByText(/private monorepo/i)).toBeInTheDocument()
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
