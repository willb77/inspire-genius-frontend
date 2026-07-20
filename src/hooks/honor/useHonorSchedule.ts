import { useMutation, useQuery, useQueryClient, type UseQueryOptions } from "@tanstack/react-query"
import { toast } from "sonner"
import {
  createCoachSession,
  deleteCoachSession,
  disconnectGoogle,
  getCoachActivityFeed,
  getCoachSchedule,
  getGoogleConnect,
  getGoogleStatus,
  getScheduleFeedUrl,
  updateCoachSession,
} from "@/services/honor/schedule.service"
import type {
  HonorActivityItem,
  HonorGoogleConnect,
  HonorGoogleStatus,
  HonorScheduleFeed,
  HonorSession,
  HonorSessionInput,
  HonorSessionPatch,
} from "@/types/honor"

/**
 * Honor Coach Workbench — live Activity + Schedule React Query hooks.
 *
 * Read hooks are READ-SAFE: the query fn swallows a 404 / network error and
 * resolves to an empty result, so an undeployed backend degrades to the honest
 * empty state instead of surfacing an error boundary. Mutations invalidate the
 * schedule query on success and toast on failure.
 */

const HK = "honor"

/** GET …/coach/activity — audit feed, newest first. Empty on any error. */
export function useHonorActivityFeed(
  options?: Partial<UseQueryOptions<HonorActivityItem[], Error>>,
) {
  return useQuery<HonorActivityItem[], Error>({
    queryKey: [HK, "activity-feed"],
    queryFn: async () => {
      try {
        return await getCoachActivityFeed()
      } catch {
        return [] as HonorActivityItem[]
      }
    },
    ...options,
  })
}

/** GET …/coach/schedule — sessions. Empty on any error. */
export function useHonorSchedule(options?: Partial<UseQueryOptions<HonorSession[], Error>>) {
  return useQuery<HonorSession[], Error>({
    queryKey: [HK, "sessions"],
    queryFn: async () => {
      try {
        return await getCoachSchedule()
      } catch {
        return [] as HonorSession[]
      }
    },
    ...options,
  })
}

/** GET …/coach/schedule/feed-url — iCal subscribe URL. Null on any error. */
export function useHonorScheduleFeed(options?: Partial<UseQueryOptions<HonorScheduleFeed | null, Error>>) {
  return useQuery<HonorScheduleFeed | null, Error>({
    queryKey: [HK, "schedule-feed"],
    // Only fetched when the user opens the Subscribe control (enabled by caller).
    queryFn: async () => {
      try {
        return await getScheduleFeedUrl()
      } catch {
        return null
      }
    },
    ...options,
  })
}

/** GET …/coach/schedule/google/connect — OAuth capability probe + consent URL. */
export function useHonorGoogleConnect(options?: Partial<UseQueryOptions<HonorGoogleConnect, Error>>) {
  return useQuery<HonorGoogleConnect, Error>({
    queryKey: [HK, "google-connect"],
    queryFn: async () => {
      try {
        return await getGoogleConnect()
      } catch {
        return { available: false, reason: "Not configured" } as HonorGoogleConnect
      }
    },
    ...options,
  })
}

/** GET …/coach/schedule/google/status — connection status. Not-connected on any error. */
export function useHonorGoogleStatus(options?: Partial<UseQueryOptions<HonorGoogleStatus, Error>>) {
  return useQuery<HonorGoogleStatus, Error>({
    queryKey: [HK, "google-status"],
    queryFn: async () => {
      try {
        return await getGoogleStatus()
      } catch {
        return { connected: false } as HonorGoogleStatus
      }
    },
    ...options,
  })
}

/** DELETE …/coach/schedule/google — disconnect; invalidates status + connect on success. */
export function useDisconnectGoogle() {
  const qc = useQueryClient()
  return useMutation<HonorGoogleStatus, Error, void>({
    mutationFn: () => disconnectGoogle(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [HK, "google-status"] })
      qc.invalidateQueries({ queryKey: [HK, "google-connect"] })
      toast.success("Google Calendar disconnected.")
    },
    onError: (e) => toast.error(e.message || "Could not disconnect Google Calendar."),
  })
}

/** POST …/coach/schedule — create a session; invalidates the schedule on success. */
export function useCreateHonorSession() {
  const qc = useQueryClient()
  return useMutation<HonorSession | undefined, Error, HonorSessionInput>({
    mutationFn: (input) => createCoachSession(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [HK, "sessions"] })
      toast.success("Session added.")
    },
    onError: (e) => toast.error(e.message || "Could not add session."),
  })
}

/** PATCH …/coach/schedule/{id} — edit a session. */
export function useUpdateHonorSession() {
  const qc = useQueryClient()
  return useMutation<HonorSession | undefined, Error, { id: string; patch: HonorSessionPatch }>({
    mutationFn: ({ id, patch }) => updateCoachSession(id, patch),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [HK, "sessions"] })
      toast.success("Session updated.")
    },
    onError: (e) => toast.error(e.message || "Could not update session."),
  })
}

/** DELETE …/coach/schedule/{id} — remove a session. */
export function useDeleteHonorSession() {
  const qc = useQueryClient()
  return useMutation<void, Error, string>({
    mutationFn: (id) => deleteCoachSession(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [HK, "sessions"] })
      toast.success("Session removed.")
    },
    onError: (e) => toast.error(e.message || "Could not remove session."),
  })
}
