import { useMutation, useQuery } from "@tanstack/react-query"
import type { AxiosError } from "axios"
import { toast } from "sonner"
import {
  bulkImportUsers,
  getBulkImportStatus,
  sendBulkInvitations,
  getInvitationStatus,
  resendInvitation,
} from "@/services/bulk-import"
import type {
  BulkUserRecord,
  BulkImportResponse,
  BulkImportStatusResponse,
  SendBulkInvitationsPayload,
  SendBulkResponse,
  InvitationStatusResponse,
} from "@/types/bulk-import"

export function useBulkImport() {
  return useMutation<BulkImportResponse, AxiosError, BulkUserRecord[]>({
    mutationFn: bulkImportUsers,
    onSuccess: (data) => {
      toast.success(`Import complete: ${data.succeeded} users created, ${data.failed} failed`)
    },
    onError: (error) => {
      toast.error(`Import failed: ${error.message}`)
    },
  })
}

export function useBulkImportStatus(batchId: string | null) {
  return useQuery<BulkImportStatusResponse, AxiosError>({
    queryKey: ["bulk-import-status", batchId],
    queryFn: () => getBulkImportStatus(batchId!),
    enabled: !!batchId,
    refetchInterval: (query) => {
      const status = query.state.data?.status
      return status === "completed" || status === "failed" ? false : 2000
    },
  })
}

export function useSendInvitations() {
  return useMutation<SendBulkResponse, AxiosError, SendBulkInvitationsPayload>({
    mutationFn: sendBulkInvitations,
    onSuccess: (data) => {
      toast.success(`${data.queued} invitations queued for delivery`)
    },
    onError: (error) => {
      toast.error(`Failed to send invitations: ${error.message}`)
    },
  })
}

export function useInvitationStatus(batchId: string | null) {
  return useQuery<InvitationStatusResponse, AxiosError>({
    queryKey: ["invitation-status", batchId],
    queryFn: () => getInvitationStatus(batchId!),
    enabled: !!batchId,
    refetchInterval: 5000,
  })
}

export function useResendInvitation() {
  return useMutation<unknown, AxiosError, string>({
    mutationFn: resendInvitation,
    onSuccess: () => {
      toast.success("Invitation resent")
    },
    onError: (error) => {
      toast.error(`Resend failed: ${error.message}`)
    },
  })
}
