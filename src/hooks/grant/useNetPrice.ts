import { useMutation, type UseMutationOptions } from "@tanstack/react-query"
import type { AxiosError } from "axios"
import { calculateNetPrice } from "@/services/grant/netPrice.service"
import type { NetPriceEstimate, NetPriceRequest } from "@/types/grant"
import { MOCK_NET_PRICE, USE_GRANT_MOCKS } from "./mocks"

/** Net-price estimate (POST /v1/net-price), mock-backed for UI-0. */
export function useNetPrice(
  options?: UseMutationOptions<NetPriceEstimate, AxiosError, NetPriceRequest>
) {
  return useMutation<NetPriceEstimate, AxiosError, NetPriceRequest>({
    mutationKey: ["grant", "net-price"],
    mutationFn: async (body) => {
      if (USE_GRANT_MOCKS) return { ...MOCK_NET_PRICE, institutionId: body.institutionId }
      const res = await calculateNetPrice(body)
      return res.data as NetPriceEstimate
    },
    ...options,
  })
}
