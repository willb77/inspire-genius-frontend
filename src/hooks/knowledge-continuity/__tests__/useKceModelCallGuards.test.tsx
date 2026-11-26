/**
 * @jest-environment jsdom
 *
 * D-18: the three hooks on the KCE model routes name the guard that refused
 * the call — 403 no access, 429 too many calls, 413/422 too long — and keep
 * their old generic toast for anything else (so an older engine without the
 * guards reads exactly as before).
 */
import React from "react"
import { renderHook, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { toast } from "sonner"

const mockNextQuestion = jest.fn()
const mockExtractUnits = jest.fn()
const mockGenerateBlueprint = jest.fn()
jest.mock("@/services/knowledge-continuity/capture.service", () => ({
  nextQuestion: (...a: unknown[]) => mockNextQuestion(...a),
  extractUnits: (...a: unknown[]) => mockExtractUnits(...a),
  generateBlueprint: (...a: unknown[]) => mockGenerateBlueprint(...a),
}))
jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn(), info: jest.fn() },
}))

import { useNextQuestion } from "../useNextQuestion"
import { useExtractUnits } from "../useExtractUnits"
import { useGenerateBlueprint } from "../useGenerateBlueprint"

let qc: QueryClient
function wrapper({ children }: { children: React.ReactNode }) {
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}
beforeEach(() => {
  jest.clearAllMocks()
  qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
})

const NO_ACCESS =
  "You don't have access to this Knowledge Continuity tool. Ask your administrator to turn it on for your account."
const TOO_MANY = "Too many requests in a short time. Please wait a few minutes, then try again."
const TOO_LONG = "That's too long to send. Shorten your text and try again."

const HOOKS = [
  {
    name: "useNextQuestion",
    use: useNextQuestion,
    svc: mockNextQuestion,
    vars: { role_title: "Op", node: { name: "N", node_type: "task" }, transcript: [], is_first: true },
    generic: "Couldn't get the next question. Please try again.",
  },
  {
    name: "useExtractUnits",
    use: useExtractUnits,
    svc: mockExtractUnits,
    vars: {
      role_title: "Op",
      node: { name: "N", node_type: "task" },
      taxonomy_node_id: "t1",
      transcript: [{ question: "Q", answer: "A" }],
    },
    generic: "Couldn't synthesize this capture. Please try again.",
  },
  {
    name: "useGenerateBlueprint",
    use: useGenerateBlueprint,
    svc: mockGenerateBlueprint,
    vars: { role_title: "CIO" },
    generic: "Couldn't draft the blueprint. Please try again.",
  },
] as const

const CASES: [number | undefined, string | null][] = [
  [403, NO_ACCESS],
  [429, TOO_MANY],
  [422, TOO_LONG],
  [413, TOO_LONG],
  [500, null],
  [502, null],
  [undefined, null], // network error, no response
]

describe.each(HOOKS)("$name", ({ use, svc, vars, generic }) => {
  test.each(CASES)("status %s toasts the matching message", async (status, expected) => {
    const err = Object.assign(new Error("boom"), status ? { response: { status } } : {})
    svc.mockRejectedValue(err)
    const { result } = renderHook(() => use(), { wrapper })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- one harness over three hooks' variable types
    ;(result.current.mutate as (v: any) => void)(vars)
    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(toast.error).toHaveBeenCalledTimes(1)
    expect(toast.error).toHaveBeenCalledWith(expected ?? generic)
  })
})
