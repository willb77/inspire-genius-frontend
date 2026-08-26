import { renderHook, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import {
  useAnalyseProfile,
  useExportProfile,
  useGenerateProfile,
  useRubric,
  useScoreBattery,
} from "../useCharacterLab"

jest.mock("@/services/super-admin/character-lab/characterLab.service", () => ({
  fetchRubric: jest.fn(),
  generateProfile: jest.fn(),
  scoreBattery: jest.fn(),
  analyseProfile: jest.fn(),
  exportProfile: jest.fn(),
}))

import * as service from "@/services/super-admin/character-lab/characterLab.service"

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}

describe("useCharacterLab", () => {
  beforeEach(() => jest.clearAllMocks())

  it("fetches the rubric from the service", async () => {
    ;(service.fetchRubric as jest.Mock).mockResolvedValue({ groups: [] })
    const { result } = renderHook(() => useRubric(), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(service.fetchRubric).toHaveBeenCalled()
    expect(result.current.data).toEqual({ groups: [] })
  })

  it.each([
    ["generate", useGenerateProfile, "generateProfile", { name: "Sonny" }],
    ["battery", useScoreBattery, "scoreBattery", { name: "Sonny", group: "Core Traits", behaviours: {} }],
    ["analyse", useAnalyseProfile, "analyseProfile", { name: "Sonny", scores: {}, colours: {} }],
    ["export", useExportProfile, "exportProfile", { name: "Sonny", scores: {}, colours: {}, fmt: "wide" }],
  ])("wires the %s mutation to its service function", async (_label, hook, fnName, args) => {
    ;(service[fnName as keyof typeof service] as jest.Mock).mockResolvedValue("ok")
    const { result } = renderHook(() => (hook as () => { mutate: (a: unknown) => void })(), { wrapper })
    result.current.mutate(args)
    await waitFor(() =>
      expect(service[fnName as keyof typeof service]).toHaveBeenCalledWith(args),
    )
  })
})
