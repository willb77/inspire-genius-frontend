import { useEffect, useRef } from "react"
import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryOptions,
} from "@tanstack/react-query"
import type { AxiosError } from "axios"
import {
  advanceJourney,
  generateJourneyReport,
  getCareerAreas,
  getJourney,
  resetJourney,
} from "@/services/direction-setting/journey.service"
import type {
  AdvanceInput,
  CareerAreas,
  Journey,
  JourneyReport,
  ReportFormat,
} from "@/types/direction-setting"

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

/**
 * Mark a stage complete once it has actually produced something.
 *
 * Stages 2, 3 and 4 rendered real content for months and were never recorded,
 * because only the pages that *write* something (Establish, Goals, Matches,
 * Interview, Rehearse) called `advance`. The read-only stages produced their
 * output and told the journey nothing, so the map showed `not_started` for work
 * the person had plainly done — and `nextAction`, which is just the first
 * unstarted stage, sent someone who had reached stage 10 back to stage 0 to
 * "create an account".
 *
 * Two rules make this honest rather than merely tidy:
 *
 * 1. **`produced`, not "visited".** Landing on Career areas with no PRISM on
 *    file yields an empty list and an explanatory note; that is the page
 *    working correctly, but nothing was produced and the stage must stay
 *    unstarted. Each caller passes the condition that means *this stage has an
 *    outcome*, never `true`.
 * 2. **Never walks a stage backwards.** It only ever writes `complete`, and
 *    only when the stage is not already complete. A user who marked something
 *    done by hand cannot have it undone by a later visit that happened to load
 *    thin data.
 *
 * Fire-and-forget, like every other progress write in this vertical: the
 * content is the point, and a failed bookkeeping write must never cost the user
 * what they came for. The worst case is the map still says not-started, which
 * is exactly the state they were already in.
 */
export function useRecordStageComplete(stageId: string, produced: boolean): void {
  const { data: journey } = useJourney()
  const advance = useAdvanceJourney()
  // Wait for the journey before deciding anything. Without this the first
  // render — journey still in flight, so `stageStatus` is undefined — reads as
  // "not complete" and fires a redundant write on EVERY visit to a stage the
  // person finished long ago. Harmless in effect, since `advance` is idempotent
  // and only ever writes `complete` over `complete`, but it is a POST per page
  // load for no reason, and it made the already-complete guard below a comment
  // rather than a behaviour.
  const loaded = journey !== undefined
  const alreadyComplete = journey?.stageStatus?.[stageId] === "complete"
  // Guards against a re-render firing a second write while the first is still
  // in flight — `alreadyComplete` cannot update until the journey refetches.
  const sent = useRef(false)

  useEffect(() => {
    if (!loaded || !produced || alreadyComplete || sent.current) return
    sent.current = true
    advance.mutate({ stageId, state: "complete" })
    // `advance` is a stable mutation object; including it would re-run this on
    // every render of the consuming page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stageId, loaded, produced, alreadyComplete])
}

/**
 * Render the journey to a downloadable file.
 *
 * A mutation rather than a query: it generates a document server-side each
 * time, and caching a presigned URL that expires would hand someone a dead link
 * on their second click.
 *
 * Does not invalidate the journey — exporting reads the journey, it does not
 * change it, and a refetch here would be pure noise.
 */
export function useJourneyReport() {
  return useMutation<JourneyReport | undefined, AxiosError, ReportFormat | void>({
    mutationFn: async (format) =>
      (await generateJourneyReport((format as ReportFormat) || "docx")).data,
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
