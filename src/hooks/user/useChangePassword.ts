import { useMutation } from '@tanstack/react-query'
import type { AxiosError } from 'axios'
import { changePassword, type ChangePasswordRequest, type ChangePasswordResponse } from '@/services/user/change-password.service'
import { logAuditEvent } from '@/services/audit/audit.service'

export function useChangePassword() {
  return useMutation<ChangePasswordResponse, AxiosError, ChangePasswordRequest>({
    mutationFn: (payload) => changePassword(payload),
    onSuccess: () => {
      logAuditEvent({ action: "settings_changed", actor_email: "user", target_type: "settings", extra_data: { action: "password_changed" } })
    },
  })
}
