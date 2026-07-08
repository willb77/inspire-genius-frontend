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
import {
  bulkInviteUsers,
  type BulkInviteData,
  type InviteUserPayload,
} from "@/services/super-admin/user-management/user-management.service"
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

/**
 * Bulk demo/skip-onboarding provisioning. When the importer's "Skip
 * onboarding" toggle is on, the validated rows are sent straight to the
 * auth-service bulk endpoint (/v1/user-management/invite/bulk) with
 * demo_account=true on every row — the SAME backend as the single Add User
 * "Skip onboarding" path. Each user is created active + already-onboarded and
 * emailed a one-click magic sign-in link, so the compose/send/track steps are
 * not used. Honored on Dev/Staging-B; the backend rejects it (400) in prod.
 */
export function useBulkDemoInvite() {
  return useMutation<BulkInviteData, AxiosError, BulkUserRecord[]>({
    mutationFn: async (records) => {
      const users: InviteUserPayload[] = records.map((r) => ({
        email: r.email1,
        first_name: r.fname,
        last_name: r.lname,
        role: r.user_type,
        demo_account: true,
      }))
      const resp = await bulkInviteUsers(users)
      return (
        resp.data ?? {
          summary: { total: 0, successful: 0, failed: 0 },
          successful_invitations: [],
          failed_invitations: [],
        }
      )
    },
    onSuccess: (data) => {
      const { successful, failed } = data.summary
      if (failed === 0) {
        toast.success(`${successful} demo account(s) provisioned — magic sign-in links sent`)
      } else if (successful > 0) {
        toast.warning(`${successful} provisioned, ${failed} failed — see results`)
      } else {
        toast.error(`Failed to provision demo accounts (${failed} errors)`)
      }
    },
    onError: (error) => {
      toast.error(`Demo provisioning failed: ${error.message}`)
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
