import { renderHook, waitFor, act } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import {
  useCancelWebinar,
  useCreateWebinar,
  useDownloadSessionCsv,
  useExportRegistrations,
  useIntakeRegistration,
  useIntakeRegistrations,
  useIntakeWebinars,
  useMarkAttendance,
  useSessionList,
  useUpdateWebinar,
} from "../useIntake"

jest.mock("@/services/super-admin/intake/intake.service", () => ({
  listRegistrations: jest.fn(),
  listAllRegistrations: jest.fn(),
  getRegistration: jest.fn(),
  listWebinars: jest.fn(),
  createWebinar: jest.fn(),
  updateWebinar: jest.fn(),
  cancelWebinar: jest.fn(),
  getSessionList: jest.fn(),
  markAttendance: jest.fn(),
  downloadSessionCsv: jest.fn(),
}))

import * as service from "@/services/super-admin/intake/intake.service"

const svc = service as jest.Mocked<typeof service>
let qc: QueryClient
function wrapper({ children }: { children: React.ReactNode }) {
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}

describe("useIntake", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  })

  it("reads a page of registrations with its filters", async () => {
    svc.listRegistrations.mockResolvedValue({ items: [], total: 0, limit: 50, offset: 0 })
    const { result } = renderHook(() => useIntakeRegistrations({ role: ["hr"] }, 50, 50), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(svc.listRegistrations).toHaveBeenCalledWith({ role: ["hr"] }, 50, 50)
  })

  it("surfaces a failed load as an error, not as data", async () => {
    svc.listWebinars.mockRejectedValue(new Error("down"))
    const { result } = renderHook(() => useIntakeWebinars(), { wrapper })
    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.data).toBeUndefined()
  })

  it("stays idle until an id is chosen", async () => {
    const { result, rerender } = renderHook(({ id }) => useIntakeRegistration(id), {
      wrapper,
      initialProps: { id: null as string | null },
    })
    expect(result.current.fetchStatus).toBe("idle")
    expect(svc.getRegistration).not.toHaveBeenCalled()
    svc.getRegistration.mockResolvedValue({ id: "r1" } as never)
    rerender({ id: "r1" })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(svc.getRegistration).toHaveBeenCalledWith("r1")

    const list = renderHook(() => useSessionList(null), { wrapper })
    expect(list.result.current.fetchStatus).toBe("idle")
    svc.getSessionList.mockResolvedValue({ items: [] } as never)
    const open = renderHook(() => useSessionList("w1"), { wrapper })
    await waitFor(() => expect(open.result.current.isSuccess).toBe(true))
    expect(svc.getSessionList).toHaveBeenCalledWith("w1")
  })

  it.each([
    ["create", useCreateWebinar, "createWebinar", { title: "T" }],
    ["update", useUpdateWebinar, "updateWebinar", { id: "w1", title: "T" }],
    ["cancel", useCancelWebinar, "cancelWebinar", "w1"],
    ["attendance", useMarkAttendance, "markAttendance", { webinarId: "w1", registrationIds: ["r"], status: "attended" }],
  ] as const)("%s writes then refreshes every intake query", async (_name, hook, fn, input) => {
    ;(svc[fn] as jest.Mock).mockResolvedValue({})
    const invalidate = jest.spyOn(qc, "invalidateQueries")
    const { result } = renderHook(() => (hook as () => { mutateAsync: (v: unknown) => Promise<unknown> })(), { wrapper })
    await act(() => result.current.mutateAsync(input))
    expect((svc[fn] as jest.Mock).mock.calls[0][0]).toEqual(input)
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["intake"] })
  })

  it("export and CSV download read without invalidating", async () => {
    svc.listAllRegistrations.mockResolvedValue([])
    svc.downloadSessionCsv.mockResolvedValue(new Blob())
    const invalidate = jest.spyOn(qc, "invalidateQueries")
    const ex = renderHook(() => useExportRegistrations(), { wrapper })
    await act(() => ex.result.current.mutateAsync({ role: ["hr"] }))
    expect(svc.listAllRegistrations).toHaveBeenCalledWith({ role: ["hr"] })
    const dl = renderHook(() => useDownloadSessionCsv(), { wrapper })
    await act(() => dl.result.current.mutateAsync("w1"))
    expect(svc.downloadSessionCsv).toHaveBeenCalledWith("w1")
    expect(invalidate).not.toHaveBeenCalled()
  })
})
