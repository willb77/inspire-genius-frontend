/**
 * @jest-environment jsdom
 *
 * Credit-write mutation-hook tests: success invalidates the existing credit
 * query keys + calls the service; a 503 maps to the friendly "not enabled yet"
 * toast; other errors surface the server message.
 */
import { renderHook, act } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { toast } from "sonner"
import type { AxiosError } from "axios"
import {
  useAllocateCredits,
  usePurchaseCredits,
  useRefundCredits,
  useUseCredits,
} from "../useCreditsMutations"
import {
  allocateCredits,
  purchaseCredits,
  refundCredits,
  useCredits,
} from "@/services/credits/credits.service"

jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }))
jest.mock("@/services/credits/credits.service", () => ({
  purchaseCredits: jest.fn(),
  allocateCredits: jest.fn(),
  useCredits: jest.fn(),
  refundCredits: jest.fn(),
}))

function makeWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  const invalidateSpy = jest.spyOn(queryClient, "invalidateQueries")
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
  return { wrapper, invalidateSpy }
}

const tx = {
  transaction_id: "t1",
  ledger_id: "l1",
  type: "purchase" as const,
  amount: 500,
  balance: 1800,
  counterparty_id: null,
  idempotent_replay: false,
}

beforeEach(() => jest.clearAllMocks())

describe("usePurchaseCredits", () => {
  test("success calls the service, invalidates distributor keys, and toasts", async () => {
    ;(purchaseCredits as jest.Mock).mockResolvedValue(tx)
    const { wrapper, invalidateSpy } = makeWrapper()
    const { result } = renderHook(() => usePurchaseCredits(), { wrapper })

    await act(async () => {
      await result.current.mutateAsync({ amount: 500 })
    })

    expect(purchaseCredits).toHaveBeenCalledWith({ amount: 500 })
    const invalidatedKeys = invalidateSpy.mock.calls.map((c) => (c[0] as { queryKey: string[] }).queryKey[0])
    expect(invalidatedKeys).toEqual(
      expect.arrayContaining(["distributor-credits", "distributor-transactions", "distributor-practitioners"]),
    )
    expect(toast.success).toHaveBeenCalledWith("Credits purchased.")
  })

  test("idempotent replay shows the already-recorded toast", async () => {
    ;(purchaseCredits as jest.Mock).mockResolvedValue({ ...tx, idempotent_replay: true })
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => usePurchaseCredits(), { wrapper })
    await act(async () => {
      await result.current.mutateAsync({ amount: 500 })
    })
    expect(toast.success).toHaveBeenCalledWith("That purchase was already recorded.")
  })

  test("503 maps to the friendly not-enabled toast", async () => {
    const err = { response: { status: 503 } } as AxiosError
    ;(purchaseCredits as jest.Mock).mockRejectedValue(err)
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => usePurchaseCredits(), { wrapper })
    await act(async () => {
      await result.current.mutateAsync({ amount: 500 }).catch(() => {})
    })
    expect(toast.error).toHaveBeenCalledWith("Credit writes aren't enabled yet.")
  })

  test("non-503 error surfaces the server message", async () => {
    const err = { response: { status: 400, data: { message: "Insufficient balance" } } } as AxiosError
    ;(purchaseCredits as jest.Mock).mockRejectedValue(err)
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => usePurchaseCredits(), { wrapper })
    await act(async () => {
      await result.current.mutateAsync({ amount: 500 }).catch(() => {})
    })
    expect(toast.error).toHaveBeenCalledWith("Insufficient balance")
  })

  test("error with no response falls back to the generic message", async () => {
    ;(purchaseCredits as jest.Mock).mockRejectedValue(new Error("network"))
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => usePurchaseCredits(), { wrapper })
    await act(async () => {
      await result.current.mutateAsync({ amount: 500 }).catch(() => {})
    })
    expect(toast.error).toHaveBeenCalledWith("Something went wrong. Please try again.")
  })
})

describe("useAllocateCredits", () => {
  test("success calls service + toasts", async () => {
    ;(allocateCredits as jest.Mock).mockResolvedValue({ ...tx, type: "allocate" })
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useAllocateCredits(), { wrapper })
    await act(async () => {
      await result.current.mutateAsync({ practitioner_id: "p1", amount: 100 })
    })
    expect(allocateCredits).toHaveBeenCalledWith({ practitioner_id: "p1", amount: 100 })
    expect(toast.success).toHaveBeenCalledWith("Credits allocated.")
  })
})

describe("useUseCredits", () => {
  test("success invalidates the practitioner key + toasts", async () => {
    ;(useCredits as jest.Mock).mockResolvedValue({ ...tx, type: "use" })
    const { wrapper, invalidateSpy } = makeWrapper()
    const { result } = renderHook(() => useUseCredits(), { wrapper })
    await act(async () => {
      await result.current.mutateAsync({ amount: 1 })
    })
    const invalidatedKeys = invalidateSpy.mock.calls.map((c) => (c[0] as { queryKey: string[] }).queryKey[0])
    expect(invalidatedKeys).toContain("practitioner-credits")
    expect(toast.success).toHaveBeenCalledWith("Credit used.")
  })
})

describe("useRefundCredits", () => {
  test("success toasts refunded", async () => {
    ;(refundCredits as jest.Mock).mockResolvedValue({ ...tx, type: "refund" })
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useRefundCredits(), { wrapper })
    await act(async () => {
      await result.current.mutateAsync({ transaction_id: "t1" })
    })
    expect(refundCredits).toHaveBeenCalledWith({ transaction_id: "t1" })
    expect(toast.success).toHaveBeenCalledWith("Credits refunded.")
  })
})
