import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryOptions,
} from "@tanstack/react-query"
import type { AxiosError } from "axios"
import {
  advanceJourney,
  getCareerAreas,
  getJourney,
  resetJourney,
} from "@/services/direction-setting/journey.service"
import type { AdvanceInput, CareerAreas, Journey } from "@/types/direction-setting"

export const journeyKeys = {
  all: ["direction-setting"] as const,
  journey: ["direction-setting", "journey"] as const,
  careers: (limit: number) => ["direction-setting", "careers", limit] as const,
}

/**
 * The caller's journey state.
 *
 * Short `staleTime`: this is the thing the whole surface reads to decide what to
 * show next, and a stage completed in another tab should surface quickly. It is
 * a single small row, so refetching is cheap.
 */
export function useJourney(
  options?: Partial<UseQueryOptions<Journey | undefined, AxiosError>>
) {
  return useQuery<Journey | undefined, AxiosError>({
    queryKey: journeyKeys.journey,
    queryFn: async () => (await getJourney()).data,
    staleTime: 30 * 1000,
    ...options,
  })
}

/**
 * Record progress on a stage.
 *
 * Invalidates the journey rather than writing the response into the cache
 * directly: the backend derives `nextAction` and the overall status from the
 * full stage map, and re-reading it is the only way to be sure the surface
 * agrees with the server about what comes next.
 */
export function useAdvanceJourney() {
  const qc = useQueryClient()
  return useMutation<Journey | undefined, AxiosError, AdvanceInput>({
    mutationFn: async (body) => (await advanceJourney(body)).data,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: journeyKeys.journey })
    },
  })
}

/** Start the journey over. Clears progress and artefacts, keeps the account. */
export function useResetJourney() {
  const qc = useQueryClient()
  return useMutation<Journey | undefined, AxiosError, void>({
    mutationFn: async () => (await resetJourney()).data,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: journeyKeys.all })
    },
  })
}

/**
 * Stage 3 — ranked career areas.
 *
 * `retry: false` because the informative case (no PRISM yet) comes back as a
 * 200 with a `note`, so a genuine failure here is a real fault worth surfacing
 * immediately rather than retrying behind a spinner.
 */
export function useCareerAreas(
  limit = 5,
  options?: Partial<UseQueryOptions<CareerAreas | undefined, AxiosError>>
) {
  return useQuery<CareerAreas | undefined, AxiosError>({
    queryKey: journeyKeys.careers(limit),
    queryFn: async () => (await getCareerAreas(limit)).data,
    retry: false,
    staleTime: 5 * 60 * 1000,
    ...options,
  })
}
