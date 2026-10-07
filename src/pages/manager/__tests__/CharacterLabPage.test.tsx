import { render, screen } from "@testing-library/react"
import ManagerCharacterLabPage from "../CharacterLabPage"
import PractitionerCharacterLabPage from "@/pages/practitioner/CharacterLabPage"

// The role pages are thin wrappers. What matters is that they hand the body
// fullAccess={false}: that single prop is what keeps CSV export and CSV import
// off the coach roles (see CharacterLab.test.tsx for what the prop does).
jest.mock("@/layouts/ManagerLayout", () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <div data-testid="manager-layout">{children}</div>,
}))
jest.mock("@/layouts/PractitionerLayout", () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <div data-testid="practitioner-layout">{children}</div>,
}))
jest.mock("@/pages/super-admin/CharacterLab", () => ({
  __esModule: true,
  default: () => <div>super-admin page</div>,
  CharacterLabBody: ({ fullAccess }: { fullAccess: boolean }) => (
    <div data-testid="body">{fullAccess ? "full" : "restricted"}</div>
  ),
}))

describe("Character Lab role pages", () => {
  it("manager page renders the restricted body in the manager layout", () => {
    render(<ManagerCharacterLabPage />)
    expect(screen.getByTestId("manager-layout")).toContainElement(screen.getByTestId("body"))
    expect(screen.getByTestId("body")).toHaveTextContent("restricted")
  })

  it("practitioner page renders the restricted body in the practitioner layout", () => {
    render(<PractitionerCharacterLabPage />)
    expect(screen.getByTestId("practitioner-layout")).toContainElement(screen.getByTestId("body"))
    expect(screen.getByTestId("body")).toHaveTextContent("restricted")
  })
})
