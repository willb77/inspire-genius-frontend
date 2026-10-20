import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, renderHook, waitFor } from "@testing-library/react"
import type { ReactNode } from "react"

const getSources = jest.fn()
const generate = jest.fn()
jest.mock("@/services/resumeWriter/resumeWriter.service", () => ({
  getResumeWriterSources: () => getSources(),
  generateMyResume: (b: unknown) => generate(b),
}))

import { resumeWriterKeys, useGenerateResume, useResumeWriterSources } from "@/hooks/useResumeWriter"

function wrapper(qc: QueryClient) {
  return ({ children }: { children: ReactNode }) => <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}

test("sources query reads the service", async () => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  getSources.mockResolvedValue({ enabled: true, usedToday: 0, dailyLimit: 5 })
  const { result } = renderHook(() => useResumeWriterSources(), { wrapper: wrapper(qc) })
  await waitFor(() => expect(result.current.data?.enabled).toBe(true))
})

test("generating refreshes the sources so 'left today' updates — on success and on failure", async () => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  const spy = jest.spyOn(qc, "invalidateQueries")
  generate.mockResolvedValueOnce({ disabled: true }).mockRejectedValueOnce(new Error("429"))
  const { result } = renderHook(() => useGenerateResume(), { wrapper: wrapper(qc) })
  await act(async () => {
    await result.current.mutateAsync({ role: "Lead" })
  })
  expect(generate).toHaveBeenCalledWith({ role: "Lead" })
  expect(spy).toHaveBeenCalledWith({ queryKey: resumeWriterKeys.sources })
  spy.mockClear()
  await act(async () => {
    await result.current.mutateAsync({}).catch(() => undefined)
  })
  expect(spy).toHaveBeenCalledWith({ queryKey: resumeWriterKeys.sources })
})
