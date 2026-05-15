/**
 * @jest-environment jsdom
 */
import { renderHook, act, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import React from "react"
import { useRlhfModels, useRlhfModel, useApproveRlhfModel } from "../useRlhfModels"
import { getRlhfModels, getRlhfModel, approveRlhfModel } from "@/services/rlhf/rlhf.service"

jest.mock("@/services/rlhf/rlhf.service", () => ({
  getRlhfModels: jest.fn(),
  getRlhfModel: jest.fn(),
  approveRlhfModel: jest.fn(),
}))
jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }))

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}

describe("useRlhfModels hooks", () => {
  beforeEach(() => jest.clearAllMocks())

  it("useRlhfModels fetches models", async () => {
    (getRlhfModels as jest.Mock).mockResolvedValueOnce({ data: { models: [], total: 0 } })
    const { result } = renderHook(() => useRlhfModels(25), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(getRlhfModels).toHaveBeenCalledWith(25)
  })

  it("useRlhfModel fetches single model", async () => {
    (getRlhfModel as jest.Mock).mockResolvedValueOnce({ data: { model_id: "m1" } })
    const { result } = renderHook(() => useRlhfModel("m1"), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(getRlhfModel).toHaveBeenCalledWith("m1")
  })

  it("useApproveRlhfModel calls approve", async () => {
    (approveRlhfModel as jest.Mock).mockResolvedValueOnce({ data: { model_id: "m1", status: "approved" } })
    const { result } = renderHook(() => useApproveRlhfModel(), { wrapper })
    act(() => { result.current.mutate({ modelId: "m1", payload: { approved_by: "admin" } as never }) })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(approveRlhfModel).toHaveBeenCalledWith("m1", { approved_by: "admin" })
  })
})
