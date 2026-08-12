/**
 * @jest-environment jsdom
 */
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter, Routes, Route, useLocation } from "react-router-dom"

import AppHeader from "../AppHeader"

const mockUser: { role: string } = { role: "user" }
jest.mock("@/context/useAuth", () => ({ useAuth: () => ({ user: mockUser }) }))
jest.mock("@/components/layout/NotificationBell", () => ({ __esModule: true, default: () => null }))

function PathProbe() {
  return <div data-testid="path">{useLocation().pathname}</div>
}

function renderHeader() {
  render(
    <MemoryRouter initialEntries={["/settings"]}>
      <AppHeader onMenuToggle={jest.fn()} />
      <Routes>
        <Route path="*" element={<PathProbe />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe("AppHeader brand logo", () => {
  it("navigates the top-left logo to Home v2 (/home) for any role", async () => {
    const user = userEvent.setup()
    mockUser.role = "super-admin"
    renderHeader()
    await user.click(screen.getByRole("button", { name: /go to home/i }))
    expect(screen.getByTestId("path")).toHaveTextContent("/home")
  })

  it("keeps the profile chip pointing at the role dashboard", async () => {
    const user = userEvent.setup()
    mockUser.role = "manager"
    renderHeader()
    await user.click(screen.getByRole("button", { name: /go to your dashboard/i }))
    expect(screen.getByTestId("path")).toHaveTextContent("/manager/dashboard")
  })
})
