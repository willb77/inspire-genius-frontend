import { useMutation, useQuery, type UseQueryOptions } from "@tanstack/react-query"
import type { AxiosError } from "axios"
import { askSelfPortrait, getSelfPortrait } from "@/services/lumen/selfPortrait.service"
import type { PortraitAnswer, SelfPortrait } from "@/types/lumen"

/**
 * The caller's composed Behavioral Self-Portrait.
 *
 * Composed server-side from every instrument on file, so it changes only when a
 * new assessment lands — a long `staleTime` avoids recomposing on every mount.
 */
export function useSelfPortrait(
  options?: Partial<UseQueryOptions<SelfPortrait | undefined, AxiosError>>
) {
  return useQuery<SelfPortrait | undefined, AxiosError>({
    queryKey: ["lumen", "self-portrait", "me"],
    queryFn: async () => {
      const res = await getSelfPortrait("me")
      return res.data
    },
    staleTime: 5 * 60 * 1000,
    ...options,
  })
}

/**
 * The narrated DESCRIPTION of the portrait (no question) — the plain-language
 * read shown above the source list. Cached like the portrait itself; it changes
 * only when a new instrument lands, so a long `staleTime` avoids re-narrating on
 * every mount.
 */
export function useSelfPortraitDescription(
  options?: Partial<UseQueryOptions<PortraitAnswer | undefined, AxiosError>>
) {
  return useQuery<PortraitAnswer | undefined, AxiosError>({
    queryKey: ["lumen", "self-portrait", "describe", "me"],
    queryFn: async () => {
      const res = await askSelfPortrait()
      return res.data
    },
    staleTime: 5 * 60 * 1000,
    ...options,
  })
}

/** Ask a free-text question about the portrait; the answer renders inline. */
export function useAskSelfPortrait() {
  return useMutation<PortraitAnswer | undefined, AxiosError, string>({
    mutationFn: async (question: string) => {
      const res = await askSelfPortrait(question)
      return res.data
    },
  })
}
