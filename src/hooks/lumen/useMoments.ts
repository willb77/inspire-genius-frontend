import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryOptions,
} from "@tanstack/react-query"
import type { AxiosError } from "axios"
import {
  askMoment,
  getMoments,
  setMomentState,
} from "@/services/lumen/moments.service"
import type {
  AskMomentRequest,
  Moment,
  MomentState,
  MomentsFeed,
} from "@/types/lumen"

const FEED_KEY = ["lumen", "moments"] as const

/** The caller's Moments feed, newest first. */
export function useMoments(
  limit = 20,
  offset = 0,
  options?: Partial<UseQueryOptions<MomentsFeed | undefined, AxiosError>>
) {
  return useQuery<MomentsFeed | undefined, AxiosError>({
    queryKey: [...FEED_KEY, limit, offset],
    queryFn: async () => {
      const res = await getMoments(limit, offset)
      return res.data
    },
    ...options,
  })
}

/**
 * Ask for a Moment.
 *
 * The backend writes it to the feed as it returns, so the feed is invalidated
 * on success — otherwise the new Moment would appear on the page but be absent
 * from the list right beside it.
 */
export function useAskMoment() {
  const queryClient = useQueryClient()
  return useMutation<Moment | undefined, AxiosError, AskMomentRequest>({
    mutationFn: async (body) => {
      const res = await askMoment(body)
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: FEED_KEY })
    },
  })
}

/** Mark a Moment acted / dismissed / saved. */
export function useSetMomentState() {
  const queryClient = useQueryClient()
  return useMutation<
    Moment | undefined,
    AxiosError,
    { momentId: string; state: MomentState }
  >({
    mutationFn: async ({ momentId, state }) => {
      const res = await setMomentState(momentId, state)
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: FEED_KEY })
    },
  })
}
