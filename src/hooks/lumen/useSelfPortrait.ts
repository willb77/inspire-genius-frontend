import { useQuery, type UseQueryOptions } from "@tanstack/react-query"
import type { AxiosError } from "axios"
import { getSelfPortrait } from "@/services/lumen/selfPortrait.service"
import type { SelfPortrait } from "@/types/lumen"

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
