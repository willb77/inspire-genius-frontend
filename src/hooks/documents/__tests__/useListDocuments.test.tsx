/**
 * @jest-environment jsdom
 */
import { renderHook, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import React from "react"
import { useListDocuments } from "../useListDocuments"
import { listDocuments } from "@/services/documents/fileService"

jest.mock("@/services/documents/fileService", () => ({ listDocuments: jest.fn() }))

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}

describe("useListDocuments", () => {
  beforeEach(() => jest.clearAllMocks())

  it("fetches documents with page and limit", async () => {
    const data = { date_groups: [], total_pages: 1 };
    (listDocuments as jest.Mock).mockResolvedValueOnce(data)
    const { result } = renderHook(() => useListDocuments(1, 10), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(listDocuments).toHaveBeenCalledWith(1, 10, undefined)
    expect(result.current.data).toEqual(data)
  })
})
