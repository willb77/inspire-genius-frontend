/**
 * Stop conditions for the invitation-status poller.
 *
 * Regression cover for 2026-08-16: the tracker polled `refetchInterval: 5000`
 * unconditionally, so a batch whose status endpoint returned 500 was re-fetched
 * every 5 seconds for as long as the tab stayed open. The rule under test is
 * pure, so each stop condition is asserted directly rather than through a
 * QueryClient and fake timers.
 */
import {
  nextInvitationPollDelay,
  INVITATION_POLL_INTERVAL_MS,
  INVITATION_POLL_MAX_CONSECUTIVE_ERRORS,
  INVITATION_POLL_MAX_POLLS,
  INVITATION_POLL_EMPTY_GRACE_POLLS,
} from "../useBulkImport"
import type { InvitationStatusResponse } from "@/types/bulk-import"

/** Build a status response with the given summary buckets. */
function statusWith(
  summary: Partial<InvitationStatusResponse["summary"]>,
): InvitationStatusResponse {
  return {
    batch_id: "batch-1",
    invitations: [],
    summary: {
      total: 0,
      queued: 0,
      sent: 0,
      delivered: 0,
      opened: 0,
      failed: 0,
      ...summary,
    },
  }
}

describe("nextInvitationPollDelay", () => {
  describe("the 500-flood case", () => {
    it("keeps polling while failures are below the threshold", () => {
      expect(
        nextInvitationPollDelay({ consecutiveErrors: 1, pollCount: 1 }),
      ).toBe(INVITATION_POLL_INTERVAL_MS)
      expect(
        nextInvitationPollDelay({
          consecutiveErrors: INVITATION_POLL_MAX_CONSECUTIVE_ERRORS - 1,
          pollCount: 2,
        }),
      ).toBe(INVITATION_POLL_INTERVAL_MS)
    })

    it("stops once consecutive failures reach the threshold", () => {
      expect(
        nextInvitationPollDelay({
          consecutiveErrors: INVITATION_POLL_MAX_CONSECUTIVE_ERRORS,
          pollCount: 3,
        }),
      ).toBe(false)
    })

    it("stops when failures exceed the threshold", () => {
      expect(
        nextInvitationPollDelay({ consecutiveErrors: 25, pollCount: 25 }),
      ).toBe(false)
    })

    it("stops on a failing endpoint even when earlier data looked pending", () => {
      // The exact incident shape: a batch with work outstanding, then the
      // endpoint starts failing. Pending work must not keep it polling.
      expect(
        nextInvitationPollDelay({
          data: statusWith({ total: 10, queued: 10 }),
          consecutiveErrors: INVITATION_POLL_MAX_CONSECUTIVE_ERRORS,
          pollCount: 8,
        }),
      ).toBe(false)
    })
  })

  describe("terminal batch states", () => {
    it("stops when every recipient is delivered", () => {
      expect(
        nextInvitationPollDelay({
          data: statusWith({ total: 3, delivered: 3 }),
          consecutiveErrors: 0,
          pollCount: 4,
        }),
      ).toBe(false)
    })

    it("stops when recipients ended in a mix of terminal states", () => {
      expect(
        nextInvitationPollDelay({
          data: statusWith({ total: 5, delivered: 2, opened: 1, failed: 2 }),
          consecutiveErrors: 0,
          pollCount: 6,
        }),
      ).toBe(false)
    })

    it("stops when every recipient failed", () => {
      expect(
        nextInvitationPollDelay({
          data: statusWith({ total: 4, failed: 4 }),
          consecutiveErrors: 0,
          pollCount: 2,
        }),
      ).toBe(false)
    })

    it("keeps polling while any recipient is still queued", () => {
      expect(
        nextInvitationPollDelay({
          data: statusWith({ total: 5, queued: 2, delivered: 3 }),
          consecutiveErrors: 0,
          pollCount: 3,
        }),
      ).toBe(INVITATION_POLL_INTERVAL_MS)
    })

    it("keeps polling while any recipient is sent-but-not-delivered", () => {
      // `sent` is in-flight: SES has accepted it but no delivery notification
      // has arrived yet.
      expect(
        nextInvitationPollDelay({
          data: statusWith({ total: 5, sent: 1, delivered: 4 }),
          consecutiveErrors: 0,
          pollCount: 3,
        }),
      ).toBe(INVITATION_POLL_INTERVAL_MS)
    })
  })

  describe("empty batches", () => {
    it("tolerates an early empty read, to cover the send/mount race", () => {
      expect(
        nextInvitationPollDelay({
          data: statusWith({ total: 0 }),
          consecutiveErrors: 0,
          pollCount: 0,
        }),
      ).toBe(INVITATION_POLL_INTERVAL_MS)
    })

    it("stops once an empty batch has had its grace polls", () => {
      // This is the literal incident response body:
      // {"batch_id":"...","invitations":[],"summary":{"total":0}}
      expect(
        nextInvitationPollDelay({
          data: statusWith({ total: 0 }),
          consecutiveErrors: 0,
          pollCount: INVITATION_POLL_EMPTY_GRACE_POLLS,
        }),
      ).toBe(false)
    })
  })

  describe("absolute ceiling", () => {
    it("stops at the max poll count even with work outstanding", () => {
      expect(
        nextInvitationPollDelay({
          data: statusWith({ total: 2, queued: 2 }),
          consecutiveErrors: 0,
          pollCount: INVITATION_POLL_MAX_POLLS,
        }),
      ).toBe(false)
    })

    it("still polls one step before the ceiling", () => {
      expect(
        nextInvitationPollDelay({
          data: statusWith({ total: 2, queued: 2 }),
          consecutiveErrors: 0,
          pollCount: INVITATION_POLL_MAX_POLLS - 1,
        }),
      ).toBe(INVITATION_POLL_INTERVAL_MS)
    })

    it("bounds the ceiling to roughly ten minutes", () => {
      const totalMs = INVITATION_POLL_MAX_POLLS * INVITATION_POLL_INTERVAL_MS
      expect(totalMs).toBe(10 * 60 * 1000)
    })
  })

  describe("before any response", () => {
    it("polls when no data has arrived yet", () => {
      expect(
        nextInvitationPollDelay({ consecutiveErrors: 0, pollCount: 0 }),
      ).toBe(INVITATION_POLL_INTERVAL_MS)
    })
  })
})
