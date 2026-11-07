/**
 * @jest-environment jsdom
 */
import { render, screen } from "@testing-library/react"
import { MemoryRouter, Route, Routes } from "react-router-dom"
import VerticalShell from "../VerticalShell"

// N-2: the minor gate sits inside the entitlement gate. With the switch off the
// vertical renders as before; held, the honest message replaces it.
const mockStatus = jest.fn()
jest.mock("@/hooks/useMinorConsent", () => ({ useMinorConsentStatus: () => mockStatus() }))
jest.mock("../useVerticalAccess", () => ({
  useVerticalAccess: () => ({ hasAccess: true, isLoading: false, enabledVerticals: ["grant"] }),
}))
jest.mock("@/context/useAuth", () => ({ useAuth: () => ({ user: { role: "user" } }) }))
jest.mock("@/hooks/audit/usePageViewAudit", () => ({ usePageViewAudit: jest.fn() }))
jest.mock("@/hooks/nav/useVerticalPageSections", () => ({ useVerticalPageSections: () => [] }))
jest.mock("@/components/shared/layout/SidebarScaffold", () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

function renderShell() {
  return render(
    <MemoryRouter initialEntries={["/vertical/grant/page"]}>
      <Routes>
        <Route path="/vertical/grant" element={<VerticalShell vertical="grant" />}>
          <Route path="page" element={<div>routed page</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  )
}

test("switch off: the vertical renders as before", () => {
  mockStatus.mockReturnValue({ data: { enabled: false, rosterAgeCapture: false } })
  renderShell()
  expect(screen.getByText("routed page")).toBeInTheDocument()
})

test("held on the verticals: the honest message, not the vertical", () => {
  mockStatus.mockReturnValue({
    data: {
      enabled: true,
      rosterAgeCapture: false,
      surfaces: { verticals: { allowed: false, reason: "no_minimum_age", message: "Ask your school contact." } },
    },
  })
  renderShell()
  expect(screen.queryByText("routed page")).not.toBeInTheDocument()
  expect(screen.getByRole("status")).toHaveTextContent("Ask your school contact.")
})
