/**
 * @jest-environment jsdom
 *
 * O-CFD18: a 403 from a Knowledge Continuity model route is one of two
 * refusals. The entitlement gate keeps the "ask your administrator" copy; the
 * role gate says the role can't use the tool; an unknown 403 keeps today's copy.
 * Driven through all three hooks, since each owns its own toast.
 */
import { renderHook, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import type { ReactNode } from "react"

jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn(), info: jest.fn() } }))

const reject = jest.fn()
jest.mock("@/services/knowledge-continuity/capture.service", () => ({
  nextQuestion: (...a: unknown[]) => reject(...a),
  extractUnits: (...a: unknown[]) => reject(...a),
  generateBlueprint: (...a: unknown[]) => reject(...a),
}))

import { toast } from "sonner"
import { useNextQuestion } from "../useNextQuestion"
import { useExtractUnits } from "../useExtractUnits"
import { useGenerateBlueprint } from "../useGenerateBlueprint"

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={new QueryClient({ defaultOptions: { mutations: { retry: false } } })}>
    {children}
  </QueryClientProvider>
)

const HOOKS = [
  ["useNextQuestion", useNextQuestion],
  ["useExtractUnits", useExtractUnits],
  ["useGenerateBlueprint", useGenerateBlueprint],
] as const

const ENTITLEMENT = "none of the verticals ['knowledge-continuity'] is enabled for this user"
const ROLE = "Blueprinting is available to practitioners, managers, company admins, and super admins only."

async function refuseWith(useHook: () => { mutate: (b: never) => void }, status: number, detail?: string) {
  reject.mockRejectedValueOnce({ response: { status, data: detail === undefined ? {} : { detail } } })
  const { result } = renderHook(() => useHook(), { wrapper })
  result.current.mutate({} as never)
  await waitFor(() => expect(toast.error).toHaveBeenCalledTimes(1))
  return (toast.error as jest.Mock).mock.calls[0][0] as string
}

beforeEach(() => jest.clearAllMocks())

describe.each(HOOKS)("%s 403 copy", (_n, hook) => {
  test("an entitlement 403 shows the noAccess copy", async () => {
    expect(await refuseWith(hook as never, 403, ENTITLEMENT)).toMatch(/ask your administrator to turn it on/i)
  })
  test("a role 403 shows the role copy", async () => {
    const msg = await refuseWith(hook as never, 403, ROLE)
    expect(msg).toMatch(/your role can't use this tool/i)
    expect(msg).not.toMatch(/ask your administrator/i)
  })
  test("an unknown 403 keeps the noAccess copy", async () => {
    expect(await refuseWith(hook as never, 403, "Forbidden")).toMatch(/ask your administrator to turn it on/i)
  })
  test("a 403 with no detail keeps the noAccess copy", async () => {
    expect(await refuseWith(hook as never, 403)).toMatch(/ask your administrator to turn it on/i)
  })
})
