import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type { AxiosError } from "axios"
import {
  createSavedPrompt,
  deleteSavedPrompt,
  getSavedPrompts,
  useSavedPrompt as touchSavedPrompt,
} from "@/services/lumen/savedPrompts.service"
import type { SavedPrompt } from "@/types/lumen"

const KEY = ["lumen", "saved-prompts"] as const

/**
 * The caller's kept situations, most-reached-for first.
 *
 * `retry: false` so an environment whose agent-engine predates the saved-prompts
 * routes fails fast with a 404 instead of retrying three times. Callers use
 * `isError` to hide the pin controls entirely there — an enabled button that
 * silently 404s is worse than no button.
 */
export function useSavedPrompts() {
  return useQuery<SavedPrompt[], AxiosError>({
    queryKey: KEY,
    queryFn: async () => (await getSavedPrompts()).data?.prompts ?? [],
    retry: false,
  })
}

/** Keep a situation. Re-saving an existing one promotes it rather than duplicating. */
export function useCreateSavedPrompt() {
  const queryClient = useQueryClient()
  return useMutation<
    SavedPrompt | undefined,
    AxiosError,
    { text: string; label?: string }
  >({
    mutationFn: async ({ text, label }) => (await createSavedPrompt(text, label)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  })
}

/**
 * Record that a saved situation was reused.
 *
 * Fire-and-forget from the UI's point of view: the ask itself must not wait on
 * a counter, and a failed bump is a slightly stale ordering, not a lost Moment.
 */
export function useTouchSavedPrompt() {
  const queryClient = useQueryClient()
  return useMutation<SavedPrompt | undefined, AxiosError, string>({
    mutationFn: async (promptId) => (await touchSavedPrompt(promptId)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  })
}

/** Unpin a situation. The Moments it produced are kept. */
export function useDeleteSavedPrompt() {
  const queryClient = useQueryClient()
  return useMutation<unknown, AxiosError, string>({
    mutationFn: async (promptId) => (await deleteSavedPrompt(promptId)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  })
}
