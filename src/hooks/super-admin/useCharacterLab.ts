import { useMutation, useQuery } from '@tanstack/react-query'
import {
  analyseProfile,
  exportProfile,
  fetchRubric,
  generateProfile,
  scoreBattery,
} from '@/services/super-admin/character-lab/characterLab.service'

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
