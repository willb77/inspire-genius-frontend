/**
 * Sharing-panel hooks (Goals offering, Phase 3): every mutation invalidates
 * BOTH consent reads (people carries grant state; my-grants carries pending
 * requests), and the lookup is a mutation that never runs on its own.
 */
import { renderHook, waitFor, act } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import type { ReactNode } from "react"
import {
  consentKeys,
  useExtendGrant,
  useLookupPerson,
  useMyGrants,
  useOfferAccess,
  usePeople,
  useRespondToRequest,
  useRevokeGrant,
} from "../useVisibility"

const mocks = {
  getPeople: jest.fn(),
  getMyGrants: jest.fn(),
  lookupPerson: jest.fn(),
  offerAccess: jest.fn(),
  extendGrant: jest.fn(),
  revokeGrant: jest.fn(),
  respondToRequest: jest.fn(),
}
jest.mock("@/services/consent/visibility.service", () => ({
  getPeople: () => mocks.getPeople(),
  getMyGrants: () => mocks.getMyGrants(),
  lookupPerson: (...a: unknown[]) => mocks.lookupPerson(...a),
  offerAccess: (...a: unknown[]) => mocks.offerAccess(...a),
  extendGrant: (...a: unknown[]) => mocks.extendGrant(...a),
  revokeGrant: (...a: unknown[]) => mocks.revokeGrant(...a),
  respondToRequest: (...a: unknown[]) => mocks.respondToRequest(...a),
}))

function makeClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })
}
function wrapperFor(qc: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  }
}

beforeEach(() => jest.clearAllMocks())

it("reads people and grants under their keys", async () => {
  mocks.getPeople.mockResolvedValue({ people: [], sources: {} })
  mocks.getMyGrants.mockResolvedValue([])
  const qc = makeClient()
  const { result } = renderHook(() => ({ p: usePeople(), g: useMyGrants() }), { wrapper: wrapperFor(qc) })
  await waitFor(() => expect(result.current.p.isSuccess && result.current.g.isSuccess).toBe(true))
  expect(qc.getQueryData(consentKeys.people)).toEqual({ people: [], sources: {} })
  expect(qc.getQueryData(consentKeys.myGrants)).toEqual([])
})

describe("every mutation invalidates both reads", () => {
  const cases = [
    ["offer", useOfferAccess, "offerAccess", { granteeUserId: "u2", categories: { goals: true } }],
    ["revoke", useRevokeGrant, "revokeGrant", "g1"],
    ["extend", useExtendGrant, "extendGrant", { grantId: "g1", days: 365 }],
    ["respond", useRespondToRequest, "respondToRequest", { grantId: "g1", approve: true }],
  ] as const
  for (const [name, useHook, svc, arg] of cases) {
    it(name, async () => {
      mocks[svc].mockResolvedValue({ id: "g1" })
      const qc = makeClient()
      const spy = jest.spyOn(qc, "invalidateQueries")
      const { result } = renderHook(() => (useHook as () => { mutateAsync: (a: unknown) => Promise<unknown> })(), {
        wrapper: wrapperFor(qc),
      })
      await act(async () => {
        await result.current.mutateAsync(arg)
      })
      const keys = spy.mock.calls.map((c) => JSON.stringify((c[0] as { queryKey: unknown }).queryKey))
      expect(keys).toContain(JSON.stringify(consentKeys.people))
      expect(keys).toContain(JSON.stringify(consentKeys.myGrants))
    })
  }
})

it("extend passes the days through and respond passes the categories", async () => {
  mocks.extendGrant.mockResolvedValue({})
  mocks.respondToRequest.mockResolvedValue({})
  const qc = makeClient()
  const { result } = renderHook(() => ({ e: useExtendGrant(), r: useRespondToRequest() }), { wrapper: wrapperFor(qc) })
  await act(async () => {
    await result.current.e.mutateAsync({ grantId: "g1", days: 30 })
    await result.current.r.mutateAsync({ grantId: "g2", approve: true, categories: { goals: true } })
  })
  expect(mocks.extendGrant).toHaveBeenCalledWith("g1", 30)
  expect(mocks.respondToRequest).toHaveBeenCalledWith("g2", true, { goals: true })
})

it("the lookup is a mutation: nothing runs until asked, and it invalidates nothing", async () => {
  mocks.lookupPerson.mockResolvedValue({ userId: "u2", displayName: "M", email: "m@example.com" })
  const qc = makeClient()
  const spy = jest.spyOn(qc, "invalidateQueries")
  const { result } = renderHook(() => useLookupPerson(), { wrapper: wrapperFor(qc) })
  expect(mocks.lookupPerson).not.toHaveBeenCalled()
  await act(async () => {
    await result.current.mutateAsync("m@example.com")
  })
  expect(mocks.lookupPerson).toHaveBeenCalledWith("m@example.com")
  expect(spy).not.toHaveBeenCalled()
})
