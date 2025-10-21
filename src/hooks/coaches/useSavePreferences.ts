import { useMutation } from '@tanstack/react-query'
import { savePreferences, type SavePreferencesRequest, type SavePreferencesResponse } from '@/services/coaches/preferences.service'
import type { AxiosError } from 'axios'

export function useSavePreferences() {
  return useMutation<SavePreferencesResponse, AxiosError, SavePreferencesRequest>({
    mutationFn: (payload) => savePreferences(payload),
  })
}
