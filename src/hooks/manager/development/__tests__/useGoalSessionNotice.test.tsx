/**
 * TDS-GI-1 — a Goals Studio invite now reaches the member's notifications, and
 * the manager is told exactly what happened: sent, already sent today, no
 * account to notify, or not sent. A PRISM set-up says it was recorded and
 * claims no invite. A server that predates the change (no `notified` field)
 * keeps the old "not notified" wording rather than claiming a failure.
 */
import type { ReactNode } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, renderHook, waitFor } from "@testing-library/react"

const postGoalSession = jest.fn()
jest.mock("@/services/manager/development/growthService", () => ({
  postGoalSession: (...a: unknown[]) => postGoalSession(...a),
}))
const success = jest.fn()
const warning = jest.fn()
jest.mock("sonner", () => ({
  toast: {
    success: (...a: unknown[]) => success(...a),
    warning: (...a: unknown[]) => warning(...a),
    error: jest.fn(),
  },
}))

import {
  GOAL_INVITE_ALREADY_SENT,
  GOAL_INVITE_NO_ACCOUNT,
  GOAL_INVITE_NOT_SENT,
  GOAL_INVITE_RECORDED,
  GOAL_INVITE_SENT,
  PRISM_SETUP_RECORDED,
  goalSessionToast,
  useGoalSession,
} from "../useGoalSession"

function wrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return ({ children }: { children: ReactNode }) => <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}

beforeEach(() => jest.clearAllMocks())

describe("goalSessionToast", () => {
  it("notified → says it reached their notifications", () => {
    goalSessionToast({ notified: true, alreadySent: false })
    expect(success).toHaveBeenCalledWith(GOAL_INVITE_SENT)
    expect(warning).not.toHaveBeenCalled()
  })

  it("already sent today → says so, not a failure", () => {
    goalSessionToast({ notified: false, alreadySent: true })
    expect(success).toHaveBeenCalledWith(GOAL_INVITE_ALREADY_SENT)
    expect(warning).not.toHaveBeenCalled()
  })

  it("no account → a warning that says there was nobody to notify", () => {
    goalSessionToast({ notified: false, alreadySent: false, noAccount: true })
    expect(warning).toHaveBeenCalledWith(GOAL_INVITE_NO_ACCOUNT)
    expect(success).not.toHaveBeenCalled()
  })

  it("not sent → a warning, never a success", () => {
    goalSessionToast({ notified: false, alreadySent: false, noAccount: false })
    expect(warning).toHaveBeenCalledWith(GOAL_INVITE_NOT_SENT)
    expect(success).not.toHaveBeenCalled()
  })

  it("a server that predates TDS-GI-1 keeps the old wording", () => {
    goalSessionToast({ status: "pending" })
    goalSessionToast(undefined)
    goalSessionToast({ notified: null })
    expect(success).toHaveBeenCalledTimes(3)
    expect(success).toHaveBeenNthCalledWith(1, GOAL_INVITE_RECORDED)
    expect(warning).not.toHaveBeenCalled()
  })

  it("a PRISM set-up never claims an invite, whatever the server says", () => {
    goalSessionToast({ notified: true }, "prism_setup")
    expect(success).toHaveBeenCalledWith(PRISM_SETUP_RECORDED)
    expect(PRISM_SETUP_RECORDED).not.toMatch(/invite/i)
  })
})

describe("useGoalSession", () => {
  it("a plain invite posts no channel and reports the notice", async () => {
    postGoalSession.mockResolvedValue({ data: { data: { notified: true, alreadySent: false } } })
    const { result } = renderHook(() => useGoalSession("m-1"), { wrapper: wrapper() })
    act(() => result.current.mutate("invite"))
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(postGoalSession).toHaveBeenCalledWith("m-1", "invite", undefined)
    expect(success).toHaveBeenCalledWith(GOAL_INVITE_SENT)
  })

  it("a PRISM set-up posts the prism_setup channel and says it was recorded", async () => {
    postGoalSession.mockResolvedValue({ data: { data: { notified: null } } })
    const { result } = renderHook(() => useGoalSession("m-1"), { wrapper: wrapper() })
    act(() => result.current.mutate({ action: "invite", channel: "prism_setup" }))
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(postGoalSession).toHaveBeenCalledWith("m-1", "invite", "prism_setup")
    expect(success).toHaveBeenCalledWith(PRISM_SETUP_RECORDED)
  })
})
