import { useQuery } from "@tanstack/react-query"
import type { AxiosError } from "axios"
import { getBlueprintPrograms, getOccupationLocal } from "@/services/job-fit/pathwayCredentials.service"
import type { BlueprintPrograms, LocalKind, LocalRead } from "@/types/job-fit/pathway"

export const pathwayCredentialKeys = {
  local: (code: string, kind: LocalKind) => ["occupations", "local", code, kind] as const,
  programs: (blueprintId: string) => ["curriculum", "blueprint-programs", blueprintId] as const,
}

/** OD-5 listings for one occupation and kind. Idle while `code` is null. */
export function useOccupationLocal(code: string | null, kind: LocalKind) {
  return useQuery<LocalRead, AxiosError>({
    queryKey: pathwayCredentialKeys.local(code ?? "", kind),
    queryFn: () => getOccupationLocal(code as string, kind),
    enabled: !!code,
    staleTime: 60 * 60_000,
    retry: false,
  })
}

/** CUR programmes linked to a blueprint. Idle while `blueprintId` is null. */
export function useBlueprintPrograms(blueprintId: string | null) {
  return useQuery<BlueprintPrograms, AxiosError>({
    queryKey: pathwayCredentialKeys.programs(blueprintId ?? ""),
    queryFn: () => getBlueprintPrograms(blueprintId as string),
    enabled: !!blueprintId,
    staleTime: 10 * 60_000,
    retry: false,
  })
}
