/**
 * @jest-environment jsdom
 */
import React from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, renderHook, waitFor } from "@testing-library/react"
import {
  clientInvitesKey,
  useClaimClientInvite,
  useClientInvites,
  useCreateClientInvite,
  useRevokeClientInvite,
  useRotateClientInvite,
} from "../useClientInvites"
import { INVITE_STORAGE_KEY } from "@/lib/practitionerInvite"

const mockClaim = jest.fn()
const mockList = jest.fn()
const mockCreate = jest.fn()
const mockRevoke = jest.fn()
const mockRotate = jest.fn()
jest.mock("@/services/practitioner-invites/clientInvites.service", () => ({
  claimClientInvite: (t: string) => mockClaim(t),
  listClientInvites: () => mockList(),
  createClientInvite: (id: string) => mockCreate(id),
  revokeClientInvite: (id: string) => mockRevoke(id),
  rotateClientInvite: (id: string) => mockRotate(id),
}))

const TOKEN = "AbCdEfGhIjKlMnOpQrStUvWxYz0123456789_-abcde"

function wrapper(qc: QueryClient) {
  return function W({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  }
}

beforeEach(() => {
  jest.clearAllMocks()
  sessionStorage.clear()
})

describe("useClaimClientInvite", () => {
  it("clears the stored token when the claim succeeds", async () => {
    sessionStorage.setItem(INVITE_STORAGE_KEY, TOKEN)
    mockClaim.mockResolvedValue({ outcome: "claimed", practitionerName: "Dr P" })
    const qc = new QueryClient()
    const { result } = renderHook(() => useClaimClientInvite(), { wrapper: wrapper(qc) })
    await act(async () => {
      await result.current.mutateAsync(TOKEN)
    })
    expect(mockClaim).toHaveBeenCalledWith(TOKEN)
    expect(sessionStorage.getItem(INVITE_STORAGE_KEY)).toBeNull()
  })

  it("clears the stored token when the claim is refused", async () => {
    sessionStorage.setItem(INVITE_STORAGE_KEY, TOKEN)
    mockClaim.mockResolvedValue({ outcome: "not_valid" })
    const qc = new QueryClient()
    const { result } = renderHook(() => useClaimClientInvite(), { wrapper: wrapper(qc) })
    await act(async () => {
      await result.current.mutateAsync(TOKEN)
    })
    expect(sessionStorage.getItem(INVITE_STORAGE_KEY)).toBeNull()
    await waitFor(() => expect(result.current.data).toEqual({ outcome: "not_valid" }))
  })

  it("clears the stored token even if the service throws", async () => {
    sessionStorage.setItem(INVITE_STORAGE_KEY, TOKEN)
    mockClaim.mockRejectedValue(new Error("boom"))
    const qc = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
    const { result } = renderHook(() => useClaimClientInvite(), { wrapper: wrapper(qc) })
    await act(async () => {
      await result.current.mutateAsync(TOKEN).catch(() => undefined)
    })
    expect(sessionStorage.getItem(INVITE_STORAGE_KEY)).toBeNull()
  })
})

describe("practitioner hooks", () => {
  it("lists, and each mutation invalidates the list", async () => {
    mockList.mockResolvedValue({ state: "off" })
    mockCreate.mockResolvedValue({ invite: {}, invitePath: "/signup#invite=x" })
    mockRevoke.mockResolvedValue({})
    mockRotate.mockResolvedValue({ invite: {}, invitePath: "/signup#invite=y" })
    const qc = new QueryClient()
    const spy = jest.spyOn(qc, "invalidateQueries")
    const { result } = renderHook(
      () => ({
        list: useClientInvites(),
        create: useCreateClientInvite(),
        revoke: useRevokeClientInvite(),
        rotate: useRotateClientInvite(),
      }),
      { wrapper: wrapper(qc) },
    )
    await waitFor(() => expect(result.current.list.data).toEqual({ state: "off" }))
    await act(async () => {
      await result.current.create.mutateAsync("c-1")
      await result.current.revoke.mutateAsync("i-1")
      await result.current.rotate.mutateAsync("i-1")
    })
    expect(mockCreate).toHaveBeenCalledWith("c-1")
    expect(mockRevoke).toHaveBeenCalledWith("i-1")
    expect(mockRotate).toHaveBeenCalledWith("i-1")
    expect(spy).toHaveBeenCalledTimes(3)
    expect(spy).toHaveBeenCalledWith({ queryKey: clientInvitesKey })
  })
})
