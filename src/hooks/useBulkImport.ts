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

/** Hard ceiling on import-status polls — 300 x 2s = 10 minutes. */
export const IMPORT_POLL_MAX_POLLS = 300

/** Consecutive failed fetches after which import-status polling gives up. */
export const IMPORT_POLL_MAX_CONSECUTIVE_ERRORS = 3

export function useBulkImportStatus(batchId: string | null) {
  return useQuery<BulkImportStatusResponse, AxiosError>({
    queryKey: ["bulk-import-status", batchId],
    queryFn: () => getBulkImportStatus(batchId!),
    enabled: !!batchId,
    retry: 1,
    refetchOnWindowFocus: false,
    refetchInterval: (query) => {
      // Same failure modes as the invitation poller below: this already
      // stopped on a terminal status, but a batch stuck on "processing" —
      // or an endpoint returning 500 — polled every 2s indefinitely.
      if (query.state.fetchFailureCount >= IMPORT_POLL_MAX_CONSECUTIVE_ERRORS) {
        return false
      }
      const polls = query.state.dataUpdateCount + query.state.errorUpdateCount
      if (polls >= IMPORT_POLL_MAX_POLLS) return false
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

/** Base gap between two invitation-status polls, in ms. */
export const INVITATION_POLL_INTERVAL_MS = 5000

/**
 * Consecutive failed fetches after which polling gives up.
 *
 * React Query resets `fetchFailureCount` to 0 on the next success, so this
 * counts a genuine run of failures rather than a lifetime total.
 */
export const INVITATION_POLL_MAX_CONSECUTIVE_ERRORS = 3

/** Hard ceiling on polls for one batch — 120 x 5s = 10 minutes. */
export const INVITATION_POLL_MAX_POLLS = 120

/**
 * How many polls a batch may report `total: 0` before we treat it as "there
 * is nothing here" and stop. A short grace covers the race where the tracker
 * mounts before invitation-service has written the batch rows.
 */
export const INVITATION_POLL_EMPTY_GRACE_POLLS = 3

/**
 * Decide whether to poll invitation status again, and after how long.
 *
 * Extracted from the hook so the stop conditions are unit-testable without a
 * QueryClient, in the same shape as `runChunkedBulkInvite` above.
 *
 * This exists because the previous implementation was an unconditional
 * `refetchInterval: 5000` with no terminal state and no error handling. On
 * 2026-08-16 a bulk import failed upstream and every poll returned 500; the
 * tracker kept firing every 5s for as long as the tab stayed open, producing
 * hundreds of console errors and burying the one message that mattered. The
 * underlying 500 is fixed, but a poller with no stop condition would do the
 * same thing on the next failure, so the stop conditions belong here.
 *
 * Returns `false` to stop polling, or a delay in ms.
 */
export function nextInvitationPollDelay(state: {
  data?: InvitationStatusResponse
  /** Consecutive failed fetches (React Query `fetchFailureCount`). */
  consecutiveErrors: number
  /** Completed fetches, successful or failed. */
  pollCount: number
}): number | false {
  // 1. The endpoint is failing. Stop rather than hammer it — this is the
  //    case that produced the 500 flood.
  if (state.consecutiveErrors >= INVITATION_POLL_MAX_CONSECUTIVE_ERRORS) {
    return false
  }

  // 2. Absolute ceiling, so a batch that never reaches a terminal state
  //    (e.g. SES notifications never arrive) cannot poll forever.
  if (state.pollCount >= INVITATION_POLL_MAX_POLLS) return false

  const summary = state.data?.summary
  if (summary) {
    // 3. Nothing was ever staged for this batch. Allow a few polls first:
    //    send-bulk and the tracker mount race, and an early empty read is
    //    not proof the batch is empty.
    if (summary.total === 0) {
      return state.pollCount >= INVITATION_POLL_EMPTY_GRACE_POLLS
        ? false
        : INVITATION_POLL_INTERVAL_MS
    }

    // 4. Every recipient has reached a terminal state (delivered / opened /
    //    failed). `queued` and `sent` are the only in-flight buckets.
    const pending = (summary.queued ?? 0) + (summary.sent ?? 0)
    if (pending === 0) return false
  }

  return INVITATION_POLL_INTERVAL_MS
}

export function useInvitationStatus(batchId: string | null) {
  return useQuery<InvitationStatusResponse, AxiosError>({
    queryKey: ["invitation-status", batchId],
    queryFn: () => getInvitationStatus(batchId!),
    enabled: !!batchId,
    // One retry per poll, not React Query's default of 3. With a 5s interval
    // the default turned each failing tick into 4 requests.
    retry: 1,
    // Refocusing the tab must not add an unscheduled burst on top of the
    // interval.
    refetchOnWindowFocus: false,
    refetchInterval: (query) =>
      nextInvitationPollDelay({
        data: query.state.data,
        consecutiveErrors: query.state.fetchFailureCount,
        pollCount: query.state.dataUpdateCount + query.state.errorUpdateCount,
      }),
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
