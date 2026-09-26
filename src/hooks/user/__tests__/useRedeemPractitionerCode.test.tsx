import { renderHook, act } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { useRedeemPractitionerCode } from "../useRedeemPractitionerCode"

jest.mock("@/services/practitioner-code/practitionerCode.service", () => ({
  redeemPractitionerCode: jest.fn(),
}))
import { redeemPractitionerCode } from "@/services/practitioner-code/practitionerCode.service"

const qc = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={qc}>{children}</QueryClientProvider>
)

describe("useRedeemPractitionerCode", () => {
  it("wraps the redeem service", async () => {
    ;(redeemPractitionerCode as jest.Mock).mockResolvedValue({ practitionerName: "Alice Able" })
    const { result } = renderHook(() => useRedeemPractitionerCode(), { wrapper })
    let out: unknown
    await act(async () => {
      out = await result.current.mutateAsync("ABCDEFGHJ")
    })
    expect(out).toEqual({ practitionerName: "Alice Able" })
    expect(redeemPractitionerCode).toHaveBeenCalledWith("ABCDEFGHJ")
  })
})
