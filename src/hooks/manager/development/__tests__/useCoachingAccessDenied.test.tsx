/**
 * D-15: the probe behind "practitioner: hide", and the hidden-history count.
 *
 * The probe must say "denied" ONLY for a 403 — any other failure leaves the
 * sections on the page to render their own state — and must not run at all
 * for an audience it was not asked about.
 */
import type { ReactNode } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { renderHook, waitFor } from "@testing-library/react"

const listCoachingNotes = jest.fn()
const getMemberChat = jest.fn()
jest.mock("@/services/manager/development/growthService", () => ({
  listCoachingNotes: (...a: unknown[]) => listCoachingNotes(...a),
  getMemberChat: (...a: unknown[]) => getMemberChat(...a),
  postMemberChat: jest.fn(),
}))

import { isForbidden, useCoachingAccessDenied } from "../useCoachingAccessDenied"
import { useDossierChat, useDossierChatHiddenTurns } from "../useDossierChat"

function wrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return ({ children }: { children: ReactNode }) => <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}

beforeEach(() => jest.clearAllMocks())

/** Render the probe and wait until its query has SETTLED (success or error),
 *  so a "false" is the answer and not merely "not answered yet". */
async function settled(memberId: string) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const w = ({ children }: { children: ReactNode }) => <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  const hook = renderHook(() => useCoachingAccessDenied(memberId, true), { wrapper: w })
  await waitFor(() => {
    const st = qc.getQueryState(["development", "coaching-access", memberId])
    expect(st?.status === "success" || st?.status === "error").toBe(true)
  })
  return hook.result
}

describe("useCoachingAccessDenied", () => {
  it("is true when the coaching gate answers 403", async () => {
    listCoachingNotes.mockRejectedValue({ response: { status: 403 } })
    const { result } = renderHook(() => useCoachingAccessDenied("m-1", true), { wrapper: wrapper() })
    await waitFor(() => expect(result.current).toBe(true))
    expect(listCoachingNotes).toHaveBeenCalledTimes(1)
  })

  it("is false when the read succeeds", async () => {
    listCoachingNotes.mockResolvedValue({ data: { data: { notes: [] } } })
    const result = await settled("m-1")
    expect(result.current).toBe(false)
  })

  it("is false on any other failure: a 500 is not a refusal", async () => {
    listCoachingNotes.mockRejectedValue({ response: { status: 500 } })
    const result = await settled("m-1")
    expect(result.current).toBe(false)
  })

  it("asks nothing when not enabled (every audience but practitioner)", () => {
    const { result } = renderHook(() => useCoachingAccessDenied("m-1", false), { wrapper: wrapper() })
    expect(result.current).toBe(false)
    expect(listCoachingNotes).not.toHaveBeenCalled()
  })

  it("isForbidden reads only a 403", () => {
    expect(isForbidden({ response: { status: 403 } })).toBe(true)
    expect(isForbidden({ response: { status: 401 } })).toBe(false)
    expect(isForbidden(new Error("network"))).toBe(false)
    expect(isForbidden(null)).toBe(false)
  })
})

describe("stored chat: messages and the hidden-turn count share one read", () => {
  it("returns the messages, and hiddenTurns from the same response", async () => {
    getMemberChat.mockResolvedValue({
      data: { data: { messages: [{ role: "user", content: "hi" }], hiddenTurns: 4 } },
    })
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const w = ({ children }: { children: ReactNode }) => <QueryClientProvider client={qc}>{children}</QueryClientProvider>
    const chat = renderHook(() => useDossierChat("m-1"), { wrapper: w })
    const hidden = renderHook(() => useDossierChatHiddenTurns("m-1"), { wrapper: w })
    await waitFor(() => expect(chat.result.current.data).toEqual([{ role: "user", content: "hi" }]))
    await waitFor(() => expect(hidden.result.current.data).toBe(4))
    expect(getMemberChat).toHaveBeenCalledTimes(1)
  })

  it("an older backend with no hiddenTurns reads as 0", async () => {
    getMemberChat.mockResolvedValue({ data: { data: { messages: [] } } })
    const { result } = renderHook(() => useDossierChatHiddenTurns("m-1"), { wrapper: wrapper() })
    await waitFor(() => expect(result.current.data).toBe(0))
  })
})
