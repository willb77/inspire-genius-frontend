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
 * Rows per request to /v1/user-management/invite/bulk.
 *
 * The endpoint accepts up to 50, but the binding constraint is TIME, not the
 * row cap: ig-{env}-auth-service has a 30s Lambda timeout and API Gateway caps
 * at 30s too, while each row costs a Cognito admin_create_user + role lookup +
 * two Aurora inserts + an SES send. A measured 2-row call on staging-b took
 * ~4.2s (~2s/row), so a single 50-row request would run 50-100s and time out
 * around row 13-20 — committing some students, returning nothing, and leaving
 * the operator with no record of who was created.
 *
 * 8 rows ≈ 17s at the measured rate, which keeps a cold start inside the
 * budget. Raise this only with fresh timing evidence from the deployed
 * environment, not from local reasoning.
 */
export const BULK_INVITE_CHUNK_SIZE = 8


/**
 * Send `users` to the bulk-invite endpoint in chunks and merge the responses.
 *
 * Extracted from the hook so the batching rules are unit-testable without a
 * QueryClient: the sender is injected, so a test can assert chunk boundaries,
 * index re-basing and partial-failure behaviour directly.
 *
 * Guarantees:
 *  - never sends more than `chunkSize` rows in one request (the endpoint caps
 *    at 50, but the real limit is the 30s Lambda/API-Gateway timeout);
 *  - `index` is re-based onto the whole upload, because the server numbers
 *    rows per REQUEST and every chunk restarts at 0;
 *  - a failing chunk neither discards earlier successes nor stops later
 *    chunks — its rows are reported as failures with the cause, so the
 *    operator can re-upload just those. Re-running is safe: the backend
 *    rejects duplicates per row.
 */
export async function runChunkedBulkInvite(
  users: InviteUserPayload[],
  opts: {
    send: (chunk: InviteUserPayload[]) => Promise<{ data?: BulkInviteData }>
    onProgress?: (progress: { done: number; total: number }) => void
    chunkSize?: number
  },
): Promise<BulkInviteData> {
  const chunkSize = opts.chunkSize ?? BULK_INVITE_CHUNK_SIZE
  const merged: BulkInviteData = {
    summary: { total: users.length, successful: 0, failed: 0 },
    successful_invitations: [],
    failed_invitations: [],
  }

  opts.onProgress?.({ done: 0, total: users.length })

  // Sequential, NOT parallel: each row costs a Cognito create, Aurora writes
  // and an SES send. Firing chunks concurrently multiplies that load against
  // one user pool for no wall-clock benefit that matters here, and makes a
  // partial failure much harder to reason about.
  for (let offset = 0; offset < users.length; offset += chunkSize) {
    const chunk = users.slice(offset, offset + chunkSize)
    try {
      const resp = await opts.send(chunk)
      const data = resp.data
      if (data) {
        merged.successful_invitations.push(
          ...data.successful_invitations.map((row) => ({ ...row, index: row.index + offset })),
        )
        merged.failed_invitations.push(
          ...data.failed_invitations.map((row) => ({ ...row, index: row.index + offset })),
        )
      }
    } catch (err) {
      const message =
        (err as { message?: string })?.message ?? "Request failed — batch not processed"
      merged.failed_invitations.push(
        ...chunk.map((u, i) => ({
          index: offset + i,
          email: u.email,
          name: [u.first_name, u.last_name].filter(Boolean).join(" ") || u.email,
          error: message,
        })),
      )
    }
    opts.onProgress?.({ done: Math.min(offset + chunkSize, users.length), total: users.length })
  }

  merged.summary.successful = merged.successful_invitations.length
  merged.summary.failed = merged.failed_invitations.length
  return merged
}

/**
 * Bulk demo/skip-onboarding provisioning. When the importer's "Skip
 * onboarding" toggle is on, the validated rows are sent to the auth-service
 * bulk endpoint (/v1/user-management/invite/bulk) with demo_account=true on
 * every row — the SAME backend as the single Add User "Skip onboarding" path.
 * Each user is created active + already-onboarded and emailed a one-click
 * magic sign-in link, so the compose/send/track steps are not used. Honored on
 * Dev/Staging-B; the backend rejects it (400) in prod.
 *
 * Rows are sent in chunks of BULK_INVITE_CHUNK_SIZE (see above) and the
 * per-chunk responses are merged, so an upload larger than one request's time
 * budget still completes. Callers may pass `onProgress` to report progress —
 * a 50-row upload takes ~2 minutes, and silence for that long reads as a hang
 * and invites a mid-import refresh.
 */
export function useBulkDemoInvite(options?: {
  onProgress?: (progress: { done: number; total: number }) => void
}) {
  return useMutation<BulkInviteData, AxiosError, BulkUserRecord[]>({
    mutationFn: async (records) => {
      const users: InviteUserPayload[] = records.map((r) => ({
        email: r.email1,
        first_name: r.fname,
        last_name: r.lname,
        role: r.user_type,
        demo_account: true,
        // Carry the reporting line through the demo path too. Without this the
        // "Skip onboarding" route provisions working accounts that belong to
        // no manager — which is exactly the state the Manager column exists to
        // fix, reached by a different door.
        manager_email: r.manager_email || undefined,
        department: r.department || undefined,
        position: r.position || undefined,
      }))

      return runChunkedBulkInvite(users, {
        send: bulkInviteUsers,
        onProgress: options?.onProgress,
      })
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
