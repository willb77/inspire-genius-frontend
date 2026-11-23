/**
 * @jest-environment jsdom
 *
 * Scope guard for the 2026-11-23 Lumen change: "Back to Home" is Lumen-only.
 * Honor's shell keeps its own "Back to Inspire Genius" control, unchanged.
 */
import { render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"

jest.mock("@/context/useAuth", () => ({
  useAuth: () => ({ user: { role: "practitioner", email: "x@example.test" }, isAtLeast: () => false }),
}))
jest.mock("@/hooks/honor/useHonorAdmin", () => ({
  useHonorAdminAccess: () => ({ isHonorAdmin: false }),
}))
jest.mock("../../honor/HonorHelpMenu", () => () => null)
jest.mock("@/assets/honor/thf-shield.jpeg", () => "shield.jpeg", { virtual: true })
jest.mock("@/assets/honor/thf-flag.jpeg", () => "flag.jpeg", { virtual: true })

import HonorShell from "../../honor/HonorShell"

test("Honor still says Back to Inspire Genius", () => {
  render(
    <MemoryRouter>
      <HonorShell />
    </MemoryRouter>,
  )
  expect(screen.getByRole("button", { name: /Back to Inspire Genius/ })).toBeInTheDocument()
  expect(screen.queryByRole("button", { name: /Back to Home/ })).toBeNull()
})
