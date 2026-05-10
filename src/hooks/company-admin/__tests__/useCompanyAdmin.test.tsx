/**
 * @jest-environment jsdom
 */
import { renderHook, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import React from "react"
import { useCompanyUsers, useCompanyAnalytics, useCompanyDepartments, useCompanyCosts } from "../useCompanyAdmin"

jest.mock("@/services/company-admin/company-admin.service", () => ({
  getCompanyUsers: jest.fn().mockResolvedValue({ data: { data: { users: [], total: 0 } } }),
  getCompanyDepartments: jest.fn().mockResolvedValue({ data: { data: { departments: [] } } }),
  getCompanyCosts: jest.fn().mockResolvedValue({ data: { data: {} } }),
}))

jest.mock("@/services/analytics/analytics.service", () => ({
  getCompanyAnalytics: jest.fn().mockResolvedValue({ data: { data: { totalUsers: 10 } } }),
}))

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}

describe("useCompanyAdmin hooks", () => {
  it("useCompanyUsers fetches users", async () => {
    const { result } = renderHook(() => useCompanyUsers(), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual({ users: [], total: 0 })
  })

  it("useCompanyAnalytics (deprecated re-export) fetches via canonical analytics hook", async () => {
    const { result } = renderHook(() => useCompanyAnalytics(), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual({ totalUsers: 10 })
  })

  it("useCompanyDepartments fetches departments", async () => {
    const { result } = renderHook(() => useCompanyDepartments(), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
  })

  it("useCompanyCosts fetches costs", async () => {
    const { result } = renderHook(() => useCompanyCosts(), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
  })
})
