import { renderHook, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import {
  usePrismAccuracyRubric,
  usePrismConversations,
  usePrismSubject,
  usePrismSubjects,
  useScoreResponse,
  useScoreSession,
} from "../usePrismAccuracy"

jest.mock("@/services/super-admin/prism-accuracy/prismAccuracy.service", () => ({
  fetchRubric: jest.fn(),
  listSubjects: jest.fn(),
  listConversations: jest.fn(),
  getSubject: jest.fn(),
  scoreResponse: jest.fn(),
  scoreSession: jest.fn(),
}))

import * as service from "@/services/super-admin/prism-accuracy/prismAccuracy.service"

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}

describe("usePrismAccuracy", () => {
  beforeEach(() => jest.clearAllMocks())

  it("fetches the rubric and the subject list", async () => {
    ;(service.fetchRubric as jest.Mock).mockResolvedValue({ name: "r" })
    ;(service.listSubjects as jest.Mock).mockResolvedValue([{ user_id: "u-1" }])
    const rubric = renderHook(() => usePrismAccuracyRubric(), { wrapper })
    const subjects = renderHook(() => usePrismSubjects(10), { wrapper })
    await waitFor(() => expect(rubric.result.current.isSuccess).toBe(true))
    await waitFor(() => expect(subjects.result.current.isSuccess).toBe(true))
    expect(rubric.result.current.data).toEqual({ name: "r" })
    expect(service.listSubjects).toHaveBeenCalledWith(10, "")
  })

  it("lists conversations with the given filters", async () => {
    ;(service.listConversations as jest.Mock).mockResolvedValue([{ session_id: "s-1" }])
    const { result } = renderHook(() => usePrismConversations({ user_id: "u-1", search: "lead" }), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(service.listConversations).toHaveBeenCalledWith({ user_id: "u-1", search: "lead" })
  })

  it("does not read a subject until an id is given", async () => {
    ;(service.getSubject as jest.Mock).mockResolvedValue({ user_id: "u-1" })
    const off = renderHook(() => usePrismSubject(undefined), { wrapper })
    expect(off.result.current.fetchStatus).toBe("idle")
    const on = renderHook(() => usePrismSubject("u-1", 8), { wrapper })
    await waitFor(() => expect(on.result.current.isSuccess).toBe(true))
    expect(service.getSubject).toHaveBeenCalledWith("u-1", 8)
  })

  it.each([
    ["response", useScoreResponse, "scoreResponse", { subject_user_id: "u-1", response_text: "x" }],
    ["session", useScoreSession, "scoreSession", { session_id: "s-1" }],
  ])("wires the %s mutation to its service function", async (_label, hook, fnName, args) => {
    ;(service[fnName as keyof typeof service] as jest.Mock).mockResolvedValue("ok")
    const { result } = renderHook(() => (hook as () => { mutate: (a: unknown) => void; isSuccess: boolean })(), { wrapper })
    result.current.mutate(args)
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(service[fnName as keyof typeof service]).toHaveBeenCalledWith(args)
  })
})
