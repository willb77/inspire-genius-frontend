import { useMutation } from '@tanstack/react-query'
import type { AxiosError } from 'axios'
import { updatePreferences, type UpdatePreferencesRequestBody, type UpdatePreferencesResponse } from '@/services/coaches/preferences.service'

export function useUpdatePreferences() {
  return useMutation<UpdatePreferencesResponse, AxiosError, { agentId: string; body: UpdatePreferencesRequestBody }>({
    mutationFn: ({ agentId, body }) => updatePreferences(agentId, body),
  })
}
