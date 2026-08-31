import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryOptions,
} from "@tanstack/react-query"
import type { AxiosError } from "axios"
import {
  getOnboardingStatus,
  requestPrismSurvey,
} from "@/services/lumen/onboarding.service"
import type {
  OnboardingStatus,
  PrismRequestBody,
  PrismRequestResult,
} from "@/types/lumen"

const STATUS_KEY = ["lumen", "onboarding", "status"] as const

/**
 * Where the user is in the Lumen funnel.
 *
 * No polling by default. A PRISM survey is completed on an external site over
 * minutes-to-days, so a background poll would burn requests for almost the whole
 * of that window; the waiting screens opt in via `refetchInterval` instead.
 */
export function useOnboardingStatus(
  options?: Partial<UseQueryOptions<OnboardingStatus | undefined, AxiosError>>
) {
  return useQuery<OnboardingStatus | undefined, AxiosError>({
    queryKey: STATUS_KEY,
    queryFn: async () => {
      const res = await getOnboardingStatus()
      return res.data
    },
    ...options,
  })
}

/**
 * Request the user's PRISM survey.
 *
 * Safe to retry: the backend returns the existing link for a request made in the
 * last 24 hours rather than minting a second one.
 */
export function useRequestPrismSurvey() {
  const queryClient = useQueryClient()
  return useMutation<PrismRequestResult | undefined, AxiosError, PrismRequestBody>({
    mutationFn: async (body) => {
      const res = await requestPrismSurvey(body)
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: STATUS_KEY })
    },
  })
}
