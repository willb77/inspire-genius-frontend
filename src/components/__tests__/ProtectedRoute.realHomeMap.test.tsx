/**
 * @jest-environment jsdom
 *
 * ProtectedRoute against the REAL home-route map and the REAL role
 * permissions. `ProtectedRoute.test.tsx` mocks both, so it passes whatever the
 * map says; this file is the guard that a manager refused another role's path
 * is sent to the same place login sends them.
 *
 * Login navigates to `HOME_ROUTE_BY_ROLE[role]`. The refusal redirect must
 * read the same value, under both values of the Studio build flag. The flag is
 * read when the navigation module loads, so each flag value gets its own
 * module registry — React, the router and the testing library included, since
 * a component and its renderer must share one copy of React.
 */
import type { ReactElement } from "react"

const FLAG = "VITE_FEATURE_TEAM_DEVELOPMENT"

const mockUseAuth = jest.fn()
jest.mock("@/context/useAuth", () => ({
  useAuth: () => mockUseAuth(),
}))

jest.mock("@/lib/secureStorage", () => ({
  secureRemoveItem: jest.fn().mockResolvedValue(undefined),
}))

jest.mock("@/components/loading-inspires-genius/LoadingCard", () => ({
  __esModule: true,
  default: () => null,
}))

type Loaded = {
  homeRoutes: Record<string, string>
  /** Renders the guarded tree at `path` and resolves with where the router ended up. */
  landOn: (path: string) => Promise<string>
}

/* eslint-disable @typescript-eslint/no-require-imports -- isolateModules needs synchronous loads */
function load(flag: "true" | null): Loaded {
  const before = process.env[FLAG]
  if (flag === null) delete process.env[FLAG]
  else process.env[FLAG] = flag

  let loaded: Loaded | undefined
  jest.isolateModules(() => {
    const React = require("react") as typeof import("react")
    const rtl = require("@testing-library/react") as typeof import("@testing-library/react")
    const router = require("react-router-dom") as typeof import("react-router-dom")
    const nav = require("@/constants/navigation") as typeof import("@/constants/navigation")
    const ProtectedRoute = (require("../ProtectedRoute") as typeof import("../ProtectedRoute")).default

    const Where = (): ReactElement => {
      const location = router.useLocation()
      return React.createElement("div", { "data-testid": "where" }, location.pathname)
    }

    loaded = {
      homeRoutes: nav.HOME_ROUTE_BY_ROLE,
      landOn: async (path: string) => {
        const view = rtl.render(
          React.createElement(
            router.MemoryRouter,
            { initialEntries: [path] },
            React.createElement(
              router.Routes,
              null,
              React.createElement(
                router.Route,
                { element: React.createElement(ProtectedRoute) },
                React.createElement(router.Route, { path: "*", element: React.createElement(Where) }),
              ),
            ),
          ),
        )
        // ProtectedRoute shows a loading screen for its first 300ms.
        const where = await view.findByTestId("where", undefined, { timeout: 2000 })
        const landed = where.textContent ?? ""
        view.unmount()
        return landed
      },
    }
  })

  if (before === undefined) delete process.env[FLAG]
  else process.env[FLAG] = before
  return loaded as Loaded
}
/* eslint-enable @typescript-eslint/no-require-imports */

// Loaded while the file is collected, not inside a test: the testing library
// registers its cleanup hook when it loads, and a hook cannot be added mid-test.
const flagOn = load("true")
const flagOff = load(null)

const manager = { user: { token: "tok", role: "manager", isOnboardingCompleted: true } }

describe("ProtectedRoute with the real home-route map", () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue(manager)
  })

  describe("Studio flag on", () => {
    it("login sends a manager to the Studio", () => {
      expect(flagOn.homeRoutes.manager).toBe("/manager/development")
    })

    it.each(["/super-admin/dashboard", "/company-admin/dashboard", "/practitioner/home", "/distributor/dashboard"])(
      "a manager refused %s is sent where login sends them",
      async (refused) => {
        const landed = await flagOn.landOn(refused)
        expect(landed).toBe(flagOn.homeRoutes.manager)
        expect(landed).toBe("/manager/development")
      },
    )

    it("a manager who types the Dashboard address stays on it", async () => {
      expect(await flagOn.landOn("/manager/dashboard")).toBe("/manager/dashboard")
    })
  })

  describe("Studio flag off", () => {
    it("login sends a manager to the Dashboard", () => {
      expect(flagOff.homeRoutes.manager).toBe("/manager/dashboard")
    })

    it("a manager refused a super-admin path is sent where login sends them", async () => {
      const landed = await flagOff.landOn("/super-admin/dashboard")
      expect(landed).toBe(flagOff.homeRoutes.manager)
      expect(landed).toBe("/manager/dashboard")
    })
  })

  it("a user refused a manager path still goes to the user Home under both values", async () => {
    mockUseAuth.mockReturnValue({ user: { token: "tok", role: "user", isOnboardingCompleted: true } })
    expect(await flagOn.landOn("/manager/development")).toBe("/home")
    expect(await flagOff.landOn("/manager/development")).toBe("/home")
  })
})
