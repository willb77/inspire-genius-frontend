/**
 * @jest-environment jsdom
 *
 * House style W2b adds no server call: with the `company-admin` switch on,
 * each page asks the server for exactly what the classic page asks for.
 * Real hooks; only the two axios instances are spied, and every call recorded.
 */
import type { ReactNode } from "react"
import { render, waitFor, cleanup } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { api } from "@/lib/axios"
import { agentApi } from "@/lib/agentApi"
import { AuthContext } from "@/context/auth-context"
import type { AuthContextValue } from "@/types/auth"
import CompanyAdminUsers from "../Users"
import CompanyAdminOrganization from "../Organization"
import CompanyAdminDashboard from "../Dashboard"

jest.mock("@/layouts/CompanyAdminLayout", () => ({
  __esModule: true,
  default: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}))
jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k: string) => k, i18n: { language: "en" } }),
}))

const calls: string[] = []
function record(method: string) {
  return (url: string) => {
    calls.push(`${method} ${url}`)
    // The rollup read returns the bare object (null = not populated yet).
    return Promise.resolve({ data: url.includes("org-rollups") ? null : { data: [] } })
  }
}

const auth = {
  user: { id: "me", role: "company-admin", email: "test-admin" },
  hasRole: (r: string) => r === "company-admin",
  isAtLeast: () => true,
} as unknown as AuthContextValue

async function requestsOf(el: ReactNode): Promise<string[]> {
  calls.length = 0
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <AuthContext.Provider value={auth}>
      <QueryClientProvider client={qc}>
        <MemoryRouter>{el}</MemoryRouter>
      </QueryClientProvider>
    </AuthContext.Provider>,
  )
  await waitFor(() => expect(calls.length).toBeGreaterThan(0))
  // Let any dependent queries fire.
  await new Promise((r) => setTimeout(r, 50))
  const set = [...new Set(calls)].sort()
  cleanup()
  qc.clear()
  return set
}

beforeAll(() => {
  for (const inst of [api, agentApi]) {
    jest.spyOn(inst, "get").mockImplementation(record("GET") as never)
    jest.spyOn(inst, "post").mockImplementation(record("POST") as never)
  }
})
afterAll(() => jest.restoreAllMocks())
beforeEach(() => localStorage.clear())

async function offThenOn(el: () => ReactNode) {
  const off = await requestsOf(el())
  localStorage.setItem("house_style_company-admin", "true")
  const on = await requestsOf(el())
  localStorage.clear()
  return { off, on }
}

describe("switch ON adds no server call", () => {
  it("People asks for exactly what Users asks for", async () => {
    const { off, on } = await offThenOn(() => <CompanyAdminUsers />)
    expect(off).toContain("GET /api/company/users")
    expect(on).toEqual(off)
  })

  it("Organization asks for exactly what it asked for before", async () => {
    const { off, on } = await offThenOn(() => <CompanyAdminOrganization />)
    expect(off).toContain("GET /api/company/departments")
    expect(on).toEqual(off)
  })

  it("Dashboard asks for exactly what it asked for before", async () => {
    const { off, on } = await offThenOn(() => <CompanyAdminDashboard />)
    expect(off).toEqual(expect.arrayContaining(["GET /api/company/departments", "GET /v1/observability/org-rollups"]))
    expect(on).toEqual(off)
  })
})
