import { render, screen } from "@testing-library/react"
import SuperAdminSettingsPage from "../Settings"
import React from "react"

jest.mock("@/layouts/SuperAdminLayout", () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="super-admin-layout">{children}</div>
  ),
}))

jest.mock("@/components/shared/settings/Settings", () => ({
  __esModule: true,
  default: () => <div data-testid="settings-component">Settings</div>,
}))

describe("SuperAdminSettingsPage", () => {
  it("renders the settings component", () => {
    render(<SuperAdminSettingsPage />)
    expect(screen.getByTestId("settings-component")).toBeInTheDocument()
  })

  it("wraps content in SuperAdminLayout", () => {
    render(<SuperAdminSettingsPage />)
    expect(screen.getByTestId("super-admin-layout")).toBeInTheDocument()
  })
})
