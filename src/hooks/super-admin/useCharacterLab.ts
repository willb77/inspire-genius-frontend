import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  analyseProfile,
  askAboutProfiles,
  compareProfiles,
  deleteProfile,
  deleteScenario,
  exportProfile,
  fetchRubric,
  fetchStarterQuestions,
  generateProfile,
  getProfile,
  listProfiles,
  listScenarios,
  patchProfile,
  runScenario,
  saveProfile,
  saveScenario,
  scoreBattery,
} from '@/services/super-admin/character-lab/characterLab.service'
import type { ProfilePatch } from '@/types/character-lab'

/** One key prefix, so every mutation invalidates the same list. */
const PROFILES_KEY = ['character-lab', 'profiles'] as const
const SCENARIOS_KEY = ['character-lab', 'scenarios'] as const

/**
 * The rubric is static per deploy, so it is cached hard. It is fetched rather
 * than duplicated in the frontend on purpose: the definitions shown to the
 * operator must be the same text the model was scored against, and a second
 * copy here would be free to drift from the one that did the work.
 */
export function useRubric() {
  return useQuery({
    queryKey: ['character-lab', 'rubric'],
    queryFn: fetchRubric,
    staleTime: Infinity,
    gcTime: Infinity,
  })
}

export function useGenerateProfile() {
  return useMutation({ mutationFn: generateProfile })
}

export function useScoreBattery() {
  return useMutation({ mutationFn: scoreBattery })
}

export function useAnalyseProfile() {
  return useMutation({ mutationFn: analyseProfile })
}

export function useExportProfile() {
  return useMutation({ mutationFn: exportProfile })
}

// ─── Saved profiles ─────────────────────────────────────────────────────

/**
 * The recall list.
 *
 * `staleTime: 0` — unlike the rubric, this changes whenever the operator saves,
 * and a demo that shows a stale list is a demo that looks broken. Every mutation
 * below invalidates it rather than writing into the cache by hand, so the list
 * always reflects what the server actually stored.
 */
export function useSavedProfiles() {
  return useQuery({ queryKey: PROFILES_KEY, queryFn: listProfiles })
}

export function useSavedProfile(id: string | null) {
  return useQuery({
    queryKey: [...PROFILES_KEY, id],
    queryFn: () => getProfile(id as string),
    enabled: !!id,
  })
}

export function useSaveProfile() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: saveProfile,
    onSuccess: () => qc.invalidateQueries({ queryKey: PROFILES_KEY }),
  })
}

export function usePatchProfile() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: ProfilePatch }) => patchProfile(id, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: PROFILES_KEY }),
  })
}

export function useDeleteProfile() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: deleteProfile,
    onSuccess: () => qc.invalidateQueries({ queryKey: PROFILES_KEY }),
  })
}

// ─── Comparison, questions, scenarios ───────────────────────────────────

export function useCompareProfiles() {
  return useMutation({ mutationFn: compareProfiles })
}

export function useStarterQuestions() {
  return useMutation({ mutationFn: fetchStarterQuestions })
}

export function useAskAboutProfiles() {
  return useMutation({ mutationFn: askAboutProfiles })
}

export function useRunScenario() {
  return useMutation({ mutationFn: runScenario })
}

export function useSavedScenarios() {
  return useQuery({ queryKey: SCENARIOS_KEY, queryFn: listScenarios })
}

export function useSaveScenario() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: saveScenario,
    onSuccess: () => qc.invalidateQueries({ queryKey: SCENARIOS_KEY }),
  })
}

export function useDeleteScenario() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: deleteScenario,
    onSuccess: () => qc.invalidateQueries({ queryKey: SCENARIOS_KEY }),
  })
}
