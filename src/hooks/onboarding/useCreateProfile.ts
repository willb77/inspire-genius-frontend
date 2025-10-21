import { useMutation, type UseMutationOptions } from '@tanstack/react-query'
import type { AxiosError } from 'axios'
import { createProfile, type CreateProfilePayload, type CreateProfileResponse } from '@/services/onboarding/profile.service'
import { toast } from 'sonner'

export function useCreateProfileMutation(options?: UseMutationOptions<CreateProfileResponse, AxiosError, CreateProfilePayload>) {
  return useMutation<CreateProfileResponse, AxiosError, CreateProfilePayload>({
    mutationFn: async (payload) => {
      const res = await createProfile(payload)
      // normalize success/failure handling here
      const failed = res?.status === false || res?.success === false
      if (failed) {
        const msg = res?.message || 'Failed to save profile'
        throw new Error(msg)
      }
      return res
    },
    onError: (err) => {
      const ax = err as AxiosError<{ message?: string }>
      const msg = ax?.response?.data?.message || (err as Error).message || 'Failed to save profile'
      toast.error(msg)
    },
    onSuccess: (data) => {
      const msg = data?.message || 'Profile saved'
      toast.success(msg)
    },
    ...options,
  })
}
