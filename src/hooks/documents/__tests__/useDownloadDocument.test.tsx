/**
 * @jest-environment jsdom
 */
import { renderHook, act, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import React from "react"
import { useDownloadDocument } from "../useDownloadDocument"
import { getDocumentDownloadLink } from "@/services/documents/fileService"

jest.mock("@/services/documents/fileService", () => ({ getDocumentDownloadLink: jest.fn() }))

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}

describe("useDownloadDocument", () => {
  beforeEach(() => jest.clearAllMocks())

  it("returns download URL", async () => {
    (getDocumentDownloadLink as jest.Mock).mockResolvedValueOnce("https://dl.example.com/f")
    const { result } = renderHook(() => useDownloadDocument(), { wrapper })
    act(() => { result.current.mutate("f1") })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toBe("https://dl.example.com/f")
  })
})
