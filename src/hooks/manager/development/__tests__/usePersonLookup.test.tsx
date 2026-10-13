/** @jest-environment jsdom */
import { renderHook, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import type { ReactNode } from "react"

const getUsers = jest.fn()
const getOrgChart = jest.fn()
jest.mock("@/services/super-admin/user-management/user-management.service", () => ({
  getUsers: (...a: unknown[]) => getUsers(...a),
}))
jest.mock("@/services/manager/development/growthService", () => ({
  getOrgChart: (...a: unknown[]) => getOrgChart(...a),
}))

import { usePersonLookup } from "../usePersonLookup"

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}

beforeEach(() => {
  getUsers.mockReset()
  getOrgChart.mockReset()
})

describe("usePersonLookup", () => {
  it("a super-admin searches the directory and never reads the org chart", async () => {
    getUsers.mockResolvedValue({
      data: {
        users: [
          { user_id: "u1", email: "ada@x.com", full_name: "Ada L" },
          { user_id: "u2", email: "ben@x.com", first_name: "Ben", last_name: "B" },
          { user_id: "u3", email: "noname@x.com" },
        ],
      },
    })
    const { result } = renderHook(() => usePersonLookup("ad", true), { wrapper })
    await waitFor(() => expect(result.current.results).toHaveLength(3))
    expect(getUsers).toHaveBeenCalledWith({ search: "ad", limit: 10 })
    expect(result.current.results.map((p) => p.name)).toEqual(["Ada L", "Ben B", "noname@x.com"])
    expect(result.current.results[0]).toMatchObject({ id: "u1", email: "ada@x.com" })
    expect(getOrgChart).not.toHaveBeenCalled()
  })

  it("a super-admin's one-letter query does not search", () => {
    const { result } = renderHook(() => usePersonLookup("a", true), { wrapper })
    expect(result.current.results).toEqual([])
    expect(getUsers).not.toHaveBeenCalled()
  })

  it("anyone else searches their own org chart, without themselves, and never the directory", async () => {
    getOrgChart.mockResolvedValue({
      data: {
        data: {
          nodes: [
            { id: "me", name: "Adam Me" },
            { id: "n1", name: "Ada L", title: "Engineer", department: "Platform" },
            { id: "n2", name: "Ben B" },
          ],
          viewerId: "me",
          truncated: false,
          orgResolved: true,
        },
      },
    })
    const { result } = renderHook(() => usePersonLookup("ada", false), { wrapper })
    await waitFor(() => expect(result.current.results).toHaveLength(1))
    expect(result.current.results[0]).toEqual({
      id: "n1",
      name: "Ada L",
      title: "Engineer",
      department: "Platform",
    })
    expect(getUsers).not.toHaveBeenCalled()
  })
})
