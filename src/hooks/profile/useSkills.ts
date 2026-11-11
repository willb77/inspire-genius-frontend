import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type { AxiosError } from "axios"
import { getSkillSuggestions, getSkills, removeSkill, saveSkill } from "@/services/profile/skills.service"
import type { SaveSkillIn } from "@/types/profile/skills"

export const skillKeys = {
  mine: ["me-skills", "mine"] as const,
  suggestions: ["me-skills", "suggestions"] as const,
}

/** My confirmed skills, newest first. Idle while `enabled` is false. */
export function useSkills(enabled: boolean) {
  return useQuery({
    queryKey: skillKeys.mine,
    queryFn: getSkills,
    enabled,
    staleTime: 30_000,
    retry: false,
  })
}

/** Suggestions from my résumé — fetched only when the person asks (`enabled`). */
export function useSkillSuggestions(enabled: boolean) {
  return useQuery({
    queryKey: skillKeys.suggestions,
    queryFn: getSkillSuggestions,
    enabled,
    staleTime: 60_000,
    retry: false,
  })
}

function useInvalidateSkills() {
  const qc = useQueryClient()
  return () => {
    void qc.invalidateQueries({ queryKey: skillKeys.mine })
    void qc.invalidateQueries({ queryKey: skillKeys.suggestions })
  }
}

export function useSaveSkill() {
  const invalidate = useInvalidateSkills()
  return useMutation<Awaited<ReturnType<typeof saveSkill>>, AxiosError, SaveSkillIn>({
    mutationFn: saveSkill,
    onSuccess: invalidate,
  })
}

export function useRemoveSkill() {
  const invalidate = useInvalidateSkills()
  return useMutation<Awaited<ReturnType<typeof removeSkill>>, AxiosError, string>({
    mutationFn: removeSkill,
    onSuccess: invalidate,
  })
}
