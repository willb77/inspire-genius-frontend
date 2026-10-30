/**
 * Two TDS member-page hooks that reported nothing, or the wrong thing:
 *  - a goal-session invite said nothing on success, so it read as a dead
 *    button. It now says what happened: recorded, and nobody notified yet;
 *  - a failed dossier job (202 + `{status: "error"}`) was read as "still
 *    computing", so a failed Refresh looked like it worked and a cold dossier
 *    restarted the job on every poll.
 */
import type { ReactNode } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, renderHook, waitFor } from "@testing-library/react"

const postGoalSession = jest.fn()
const getMemberDossier = jest.fn()
jest.mock("@/services/manager/development/growthService", () => ({
  postGoalSession: (...a: unknown[]) => postGoalSession(...a),
  getMemberDossier: (...a: unknown[]) => getMemberDossier(...a),
  recomputeDossier: jest.fn(),
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

import { GOAL_INVITE_RECORDED, useGoalSession } from "../useGoalSession"
import { DossierJobFailedError, useMemberDossier } from "../useMemberDossier"

function wrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return ({ children }: { children: ReactNode }) => <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}

beforeEach(() => jest.clearAllMocks())

it("a recorded invite says it was recorded and that the member is not notified", async () => {
  postGoalSession.mockResolvedValue({ data: { data: { status: "pending" } } })
  const { result } = renderHook(() => useGoalSession("m-1"), { wrapper: wrapper() })
  act(() => result.current.mutate("invite"))
  await waitFor(() => expect(result.current.isSuccess).toBe(true))
  expect(success).toHaveBeenCalledWith(GOAL_INVITE_RECORDED)
  expect(GOAL_INVITE_RECORDED).toMatch(/isn't notified/)
})

it("a dossier job that failed is an error, not 'still computing'", async () => {
  getMemberDossier.mockResolvedValue({ status: 202, data: { success: false, status: "error", message: "Dossier generation failed — please retry." } })
  const { result } = renderHook(() => useMemberDossier("m-1"), { wrapper: wrapper() })
  await waitFor(() => expect(result.current.isError).toBe(true))
  expect(result.current.error).toBeInstanceOf(DossierJobFailedError)
  expect(result.current.error?.message).toBe("Dossier generation failed — please retry.")
  expect(getMemberDossier).toHaveBeenCalledTimes(1)
})

it("a dossier still computing stays null and keeps polling", async () => {
  getMemberDossier.mockResolvedValue({ status: 202, data: { success: true, status: "computing", jobId: "j" } })
  const { result } = renderHook(() => useMemberDossier("m-1"), { wrapper: wrapper() })
  await waitFor(() => expect(result.current.isSuccess).toBe(true))
  expect(result.current.data).toBeNull()
})
