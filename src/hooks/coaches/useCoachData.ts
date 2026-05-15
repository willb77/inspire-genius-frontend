import { useMemo } from 'react'
import { useAgents } from '@/hooks/coaches/useAgents'
import { useTones } from '@/hooks/coaches/useTones'
import { useAccents } from '@/hooks/coaches/useAccents'
import { useGenders } from '@/hooks/coaches/useGenders'

export type Option = { label: string; value: string }
export type Agent = {
  id: string
  name: string
  user_gender: { id: string; name: string } | null
  user_accent: { id: string; name: string } | null
  user_tones: Array<{ id: string; name: string }> | null
}

export function useCoachData(params: { page: number; page_size: number }) {
  const { data: agentsResp, isLoading: agentsLoading } = useAgents(params)
  const { data: tonesResp, isLoading: tonesLoading } = useTones()
  const { data: accentsResp, isLoading: accentsLoading } = useAccents()
  const { data: gendersResp, isLoading: gendersLoading } = useGenders()

  const toneOptions = useMemo<Option[]>(() => {
    const list = (tonesResp as { data?: { Tones?: Array<{ id: string; name: string }> } } | undefined)?.data?.Tones ?? []
    return Array.isArray(list) ? list.map((t) => ({ label: t.name, value: t.id })) : []
  }, [tonesResp])

  const accentOptions = useMemo<Option[]>(() => {
    const list = (accentsResp as { data?: { Tones?: Array<{ id: string; name: string }> } } | undefined)?.data?.Tones ?? []
    return Array.isArray(list) ? list.map((a) => ({ label: a.name, value: a.id })) : []
  }, [accentsResp])

  const genderOptions = useMemo<Option[]>(() => {
    const list = (gendersResp as { data?: { Genders?: Array<{ id: string; name: string }> } } | undefined)?.data?.Genders ?? []
    return Array.isArray(list) ? list.map((g) => ({ label: g.name, value: g.id })) : []
  }, [gendersResp])

  const agents = useMemo<Agent[]>(() => {
    const raw = (agentsResp as { data?: Agent[] | { agents?: Agent[] } } | undefined)?.data
    const list = Array.isArray(raw) ? raw : (raw as { agents?: Agent[] } | undefined)?.agents ?? []
    return Array.isArray(list) ? list : []
  }, [agentsResp])

  const isAnyLoading = agentsLoading || tonesLoading || accentsLoading || gendersLoading

  return {
    agents,
    toneOptions,
    accentOptions,
    genderOptions,
    isLoading: isAnyLoading,
  }
}
