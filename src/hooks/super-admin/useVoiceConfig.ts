import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getVoiceConfig, updateVoiceConfig, type VoiceConfigUpdate } from '@/services/voiceConfigService'

const QUERY_KEY = ['voice-config']

export function useVoiceConfig() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: getVoiceConfig,
    staleTime: 60 * 1000, // 60 seconds — matches backend cache TTL
  })
}

export function useUpdateVoiceConfig() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: VoiceConfigUpdate) => updateVoiceConfig(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY })
    },
  })
}
