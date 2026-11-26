/** @jest-environment jsdom */
import { render, screen } from "@testing-library/react"
import { MemoryRouter, Route, Routes } from "react-router-dom"
import "@testing-library/jest-dom"

/**
 * RM-6 B: `/practitioner/home` forwards a practitioner to the Studio only where
 * the Studio lists their clients. HOME_ROUTE_BY_ROLE and its three readers are
 * unchanged; this is the one place the landing moves.
 */

jest.mock("@/pages/practitioner/Home", () => ({ __esModule: true, default: () => <div>classic home</div> }))
jest.mock("@/pages/practitioner/WorkbenchHomePage", () => ({ __esModule: true, default: () => <div>workbench home</div> }))
jest.mock("@/lib/surfaceFlags", () => ({ isNewUserSurfacesEnabled: () => true }))

let mockRole = "practitioner"
jest.mock("@/context/useAuth", () => ({
  useAuth: () => ({ hasRole: (role: string) => role === mockRole }),
}))

let mockStatus: { data?: boolean; isLoading: boolean } = { data: false, isLoading: false }
const mockAsked: boolean[] = []
jest.mock("@/hooks/switches/usePractitionerClientRosterEnabled", () => ({
  usePractitionerClientRosterStatus: (enabled = true) => {
    mockAsked.push(enabled)
    return enabled ? mockStatus : { data: undefined, isLoading: false }
  },
}))

import PractitionerHomeSwitch from "../HomeSwitch"
import { ROUTES } from "@/constants/routes"

function renderAt(url: string, variant?: "classic" | "v2") {
  return render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route path={ROUTES.PRACTITIONER.HOME} element={<PractitionerHomeSwitch />} />
        <Route path="/practitioner/home/classic" element={<PractitionerHomeSwitch variant={variant ?? "classic"} />} />
        <Route path={ROUTES.PRACTITIONER.DEVELOPMENT} element={<div>the studio</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  mockRole = "practitioner"
  mockStatus = { data: false, isLoading: false }
  mockAsked.length = 0
})

describe("RM-6 B: the practitioner landing follows the client-roster status", () => {
  it("OFF (or a 404, which the service reads as OFF): Home renders as today", async () => {
    renderAt(ROUTES.PRACTITIONER.HOME)
    expect(await screen.findByText("workbench home")).toBeInTheDocument()
    expect(screen.queryByText("the studio")).not.toBeInTheDocument()
  })

  it("ON: a practitioner landing on Home is forwarded to the Studio", async () => {
    mockStatus = { data: true, isLoading: false }
    renderAt(ROUTES.PRACTITIONER.HOME)
    expect(await screen.findByText("the studio")).toBeInTheDocument()
    expect(screen.queryByText("workbench home")).not.toBeInTheDocument()
  })

  it("while the answer is loading nothing renders (no Home flash, no jump)", () => {
    mockStatus = { data: undefined, isLoading: true }
    const { container } = renderAt(ROUTES.PRACTITIONER.HOME)
    expect(container).toBeEmptyDOMElement()
  })

  it("ON, but opened as Practice overview: Home renders", async () => {
    mockStatus = { data: true, isLoading: false }
    renderAt(`${ROUTES.PRACTITIONER.HOME}?view=overview`)
    expect(await screen.findByText("workbench home")).toBeInTheDocument()
    expect(mockAsked.every((asked) => asked === false)).toBe(true)
  })

  it("ON, but a pinned variant (/practitioner/home/classic): never forwarded", async () => {
    mockStatus = { data: true, isLoading: false }
    renderAt("/practitioner/home/classic")
    expect(await screen.findByText("classic home")).toBeInTheDocument()
  })

  it.each(["super-admin", "manager"])("ON, but a %s (view-as): Home renders and the switch is never asked", async (role) => {
    mockRole = role
    mockStatus = { data: true, isLoading: false }
    renderAt(ROUTES.PRACTITIONER.HOME)
    expect(await screen.findByText("workbench home")).toBeInTheDocument()
    expect(mockAsked.every((asked) => asked === false)).toBe(true)
  })
})
