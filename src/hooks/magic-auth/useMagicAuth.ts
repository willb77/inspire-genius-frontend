import { useMutation } from "@tanstack/react-query"
import type { AxiosError } from "axios"
import {
  requestMagicLink,
  verifyMagicLink,
} from "@/services/magic-auth/magic-auth.service"
import type { RequestMagicLinkPayload, VerifyMagicLinkPayload } from "@/types/magic-auth"
import { toast } from "sonner"

export function useRequestMagicLink() {
  return useMutation<
    { success?: boolean; message?: string },
    AxiosError<{ message?: string }>,
    RequestMagicLinkPayload
  >({
    mutationFn: (payload) => requestMagicLink(payload),
    onSuccess: (resp) => {
      toast.success(resp?.message || "Magic link sent! Check your email.")
    },
    onError: (error) => {
      const msg = error.response?.data?.message || "Failed to send magic link"
      toast.error(msg)
    },
  })
}

export function useVerifyMagicLink() {
  return useMutation<
    Awaited<ReturnType<typeof verifyMagicLink>>,
    AxiosError<{ message?: string }>,
    VerifyMagicLinkPayload
  >({
    mutationFn: (payload) => verifyMagicLink(payload),
    onError: (error) => {
      const msg = error.response?.data?.message || "Magic link verification failed"
      toast.error(msg)
    },
  })
}
