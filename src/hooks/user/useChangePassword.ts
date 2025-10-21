import { useMutation } from '@tanstack/react-query'
import type { AxiosError } from 'axios'
import { changePassword, type ChangePasswordRequest, type ChangePasswordResponse } from '@/services/user/change-password.service'

export function useChangePassword() {
  return useMutation<ChangePasswordResponse, AxiosError, ChangePasswordRequest>({
    mutationFn: (payload) => changePassword(payload),
  })
}
