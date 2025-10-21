import { useMutation, useQueryClient, type UseMutationOptions } from '@tanstack/react-query'
import type { AxiosError } from 'axios'
import { updateProfile, type CreateProfilePayload, type CreateProfileResponse } from '@/services/onboarding/profile.service'

export function useUpdateProfile(options?: UseMutationOptions<CreateProfileResponse, AxiosError, CreateProfilePayload>) {
  const qc = useQueryClient()
  return useMutation<CreateProfileResponse, AxiosError, CreateProfilePayload>({
    mutationFn: (payload) => updateProfile(payload),
    onSuccess: async (data, variables, context) => {
      await qc.invalidateQueries({ queryKey: ['me'] })
      if (options?.onSuccess) return options.onSuccess(data, variables, context)
    },
    onError: (error, variables, context) => {
      if (options?.onError) return options.onError(error, variables, context)
    },
    ...options,
  })
}
