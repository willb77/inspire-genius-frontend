/**
 * @jest-environment jsdom
 */
import { renderHook, act, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import React from "react"
import { useVoiceConfig, useUpdateVoiceConfig } from "../useVoiceConfig"
import { getVoiceConfig, updateVoiceConfig } from "@/services/voiceConfigService"

jest.mock("@/services/voiceConfigService", () => ({
  getVoiceConfig: jest.fn(),
  updateVoiceConfig: jest.fn(),
}))

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}

describe("useVoiceConfig hooks", () => {
  beforeEach(() => jest.clearAllMocks())

  it("useVoiceConfig fetches config", async () => {
    (getVoiceConfig as jest.Mock).mockResolvedValueOnce({ data: { stt_provider: "aws" } })
    const { result } = renderHook(() => useVoiceConfig(), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(getVoiceConfig).toHaveBeenCalled()
  })

  it("useUpdateVoiceConfig calls update", async () => {
    (updateVoiceConfig as jest.Mock).mockResolvedValueOnce({ data: { updated_keys: ["stt_provider"] } })
    const { result } = renderHook(() => useUpdateVoiceConfig(), { wrapper })
    act(() => { result.current.mutate({ stt_provider: "google" }) })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(updateVoiceConfig).toHaveBeenCalledWith({ stt_provider: "google" })
  })
})
