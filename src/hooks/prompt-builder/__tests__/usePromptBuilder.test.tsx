/**
 * @jest-environment jsdom
 */
import { renderHook, act, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import React from "react"
import { usePrompts, useSavePrompt, useUpdatePrompt, usePromptVersions } from "../usePromptBuilder"
import { getPrompts, savePrompt, updatePrompt, getPromptVersions } from "@/services/prompt-builder/prompt-builder.service"

jest.mock("@/services/prompt-builder/prompt-builder.service", () => ({
  getPrompts: jest.fn(),
  savePrompt: jest.fn(),
  updatePrompt: jest.fn(),
  getPromptVersions: jest.fn(),
}))
jest.mock("@/services/audit/audit.service", () => ({ logAuditEvent: jest.fn() }))
jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }))

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}

describe("usePromptBuilder hooks", () => {
  beforeEach(() => jest.clearAllMocks())

  it("usePrompts fetches prompts", async () => {
    (getPrompts as jest.Mock).mockResolvedValueOnce({ data: { prompts: [] } })
    const { result } = renderHook(() => usePrompts(), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
  })

  it("useSavePrompt calls savePrompt", async () => {
    (savePrompt as jest.Mock).mockResolvedValueOnce({ data: { id: "p1" } })
    const { result } = renderHook(() => useSavePrompt(), { wrapper })
    act(() => { result.current.mutate({ coach_id: "c1", prompt_text: "hi" } as never) })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(savePrompt).toHaveBeenCalled()
  })

  it("useUpdatePrompt calls updatePrompt", async () => {
    (updatePrompt as jest.Mock).mockResolvedValueOnce({ data: { id: "p1" } })
    const { result } = renderHook(() => useUpdatePrompt(), { wrapper })
    act(() => { result.current.mutate({ id: "p1", payload: { coach_id: "c1", prompt_text: "updated" } as never }) })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(updatePrompt).toHaveBeenCalledWith("p1", expect.any(Object))
  })

  it("usePromptVersions fetches versions", async () => {
    (getPromptVersions as jest.Mock).mockResolvedValueOnce({ data: { versions: [] } })
    const { result } = renderHook(() => usePromptVersions("c1"), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(getPromptVersions).toHaveBeenCalledWith("c1")
  })
})
