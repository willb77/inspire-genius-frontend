import { renderHook, waitFor, act } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import {
  useAddPractitioner,
  useAssignablePractitioners,
  useAssignClient,
  useBulkAddPractitioners,
  useEditPractitioner,
  useRegeneratePractitionerCode,
  useRegistry,
  useRegistryRegions,
  useSetPractitionerActive,
} from "../usePractitionerRegistry"

jest.mock("@/services/super-admin/practitioner-registry/practitionerRegistry.service", () => ({
  listRegistry: jest.fn(),
  listRegions: jest.fn(),
  listAssignable: jest.fn(),
  addPractitioner: jest.fn(),
  bulkAddPractitioners: jest.fn(),
  editPractitioner: jest.fn(),
  setPractitionerActive: jest.fn(),
  assignClient: jest.fn(),
  regeneratePractitionerCode: jest.fn(),
}))

import * as service from "@/services/super-admin/practitioner-registry/practitionerRegistry.service"

let qc: QueryClient
function wrapper({ children }: { children: React.ReactNode }) {
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}

describe("usePractitionerRegistry", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  })

  it("reads the registry and regions", async () => {
    ;(service.listRegistry as jest.Mock).mockResolvedValue([{ practitionerSub: "p1" }])
    ;(service.listRegions as jest.Mock).mockResolvedValue([{ region: "EU", countries: ["FR"] }])
    const reg = renderHook(() => useRegistry(true), { wrapper })
    const regions = renderHook(() => useRegistryRegions(), { wrapper })
    await waitFor(() => expect(reg.result.current.data).toEqual([{ practitionerSub: "p1" }]))
    await waitFor(() => expect(regions.result.current.data).toHaveLength(1))
    expect(service.listRegistry).toHaveBeenCalledWith(true)
  })

  it("does not ask for assignable practitioners until region AND country are chosen", async () => {
    ;(service.listAssignable as jest.Mock).mockResolvedValue([{ practitionerSub: "p1" }])
    renderHook(() => useAssignablePractitioners("EU", ""), { wrapper })
    renderHook(() => useAssignablePractitioners("", "FR"), { wrapper })
    expect(service.listAssignable).not.toHaveBeenCalled()
    const r = renderHook(() => useAssignablePractitioners("EU", "FR"), { wrapper })
    await waitFor(() => expect(r.result.current.data).toHaveLength(1))
    expect(service.listAssignable).toHaveBeenCalledWith("EU", "FR")
  })

  it("every mutation invalidates the registry queries", async () => {
    const spy = jest.spyOn(QueryClient.prototype, "invalidateQueries")
    ;(service.addPractitioner as jest.Mock).mockResolvedValue({})
    ;(service.bulkAddPractitioners as jest.Mock).mockResolvedValue({ added: 1 })
    ;(service.editPractitioner as jest.Mock).mockResolvedValue({})
    ;(service.setPractitionerActive as jest.Mock).mockResolvedValue({})
    ;(service.assignClient as jest.Mock).mockResolvedValue({})
    ;(service.regeneratePractitionerCode as jest.Mock).mockResolvedValue({})
    const add = renderHook(() => useAddPractitioner(), { wrapper })
    const bulk = renderHook(() => useBulkAddPractitioners(), { wrapper })
    const edit = renderHook(() => useEditPractitioner(), { wrapper })
    const active = renderHook(() => useSetPractitionerActive(), { wrapper })
    const assign = renderHook(() => useAssignClient(), { wrapper })
    const regen = renderHook(() => useRegeneratePractitionerCode(), { wrapper })
    await act(async () => {
      await add.result.current.mutateAsync({ practitionerEmail: "a@b.co", siteId: "S", clientId: "C", reference: "R", externalIdent: "E", region: "EU", country: "FR" })
      await bulk.result.current.mutateAsync("csv")
      await edit.result.current.mutateAsync({ practitionerSub: "p1", region: "EU" })
      await active.result.current.mutateAsync({ practitionerSub: "p1", active: false })
      await assign.result.current.mutateAsync({ clientEmail: "c@d.co", practitionerSub: "p1" })
      await regen.result.current.mutateAsync("p1")
    })
    expect(service.regeneratePractitionerCode).toHaveBeenCalledWith("p1")
    expect(service.setPractitionerActive).toHaveBeenCalledWith("p1", false)
    expect(spy).toHaveBeenCalledTimes(6)
    expect(spy).toHaveBeenCalledWith({ queryKey: ["practitioner-registry"] })
    spy.mockRestore()
  })
})
