/**
 * History "review" — the banner may only claim what the server confirmed.
 *
 * A user on staging-b, 2026-10-02: ticked a past conversation in History,
 * the banner read "Reviewing 1 additional conversation alongside the active
 * chat.", and Meridian said "I don't see a selected conversation". The tick had
 * never been sent (FE #133, 2026-06-12). These tests pin both halves: the
 * selection is sent on every send path, and the banner reads the reply.
 *
 * @jest-environment node
 */
import fs from "fs"
import path from "path"

import {
  MAX_REVIEW_CONVERSATIONS,
  loadedReviewIds,
  reviewBannerState,
  reviewContext,
} from "@/lib/chat/reviewSelection"

const A = "11111111-1111-4111-8111-111111111111"
const B = "22222222-2222-4222-8222-222222222222"
const C = "33333333-3333-4333-8333-333333333333"
const D = "44444444-4444-4444-8444-444444444444"

describe("reviewContext", () => {
  it("adds nothing when nothing is ticked, so the request body is unchanged", () => {
    expect(reviewContext([])).toEqual({})
    expect({ conversation_id: "x", ...reviewContext([]) }).toEqual({ conversation_id: "x" })
  })

  it("sends the ticked ids, de-duplicated and capped at the server's limit", () => {
    expect(reviewContext([A, A, B, "", C, D])).toEqual({
      review_conversation_ids: [A, B, C],
    })
    expect(MAX_REVIEW_CONVERSATIONS).toBe(3)
  })
})

describe("reviewBannerState", () => {
  it("is silent with nothing selected", () => {
    expect(reviewBannerState([], null)).toEqual({ kind: "none" })
  })

  it("claims nothing before a message has been sent with the selection", () => {
    expect(reviewBannerState([A], null)).toEqual({ kind: "pending", count: 1 })
  })

  it("says read only when the server loaded every selected conversation", () => {
    expect(reviewBannerState([A], { sent: [A], loaded: [A.toUpperCase()] })).toEqual({
      kind: "loaded",
      count: 1,
    })
  })

  it("says what failed when the server loaded fewer — the screenshot case", () => {
    // Exactly what staging-b did before this change: ticked, nothing loaded.
    expect(reviewBannerState([A], { sent: [A], loaded: [] })).toEqual({
      kind: "missing",
      count: 1,
      missing: 1,
    })
    expect(reviewBannerState([A, B, C, D], { sent: [A, B, C], loaded: [A, B, C] })).toEqual({
      kind: "missing",
      count: 4,
      missing: 1,
    })
  })
})

describe("loadedReviewIds", () => {
  it("reads the server's confirmation defensively", () => {
    expect(loadedReviewIds({ referenced_conversation_ids: [A, 7, null, B] })).toEqual([A, B])
    expect(loadedReviewIds({ referenced_conversation_ids: A })).toEqual([])
    expect(loadedReviewIds(undefined)).toEqual([])
    expect(loadedReviewIds(null)).toEqual([])
  })
})

// ── static: the wiring in MeridianChat ─────────────────────────────────

const PAGE = fs.readFileSync(
  path.resolve(__dirname, "../../../pages/user/MeridianChat.tsx"),
  "utf8",
)

describe("MeridianChat wiring", () => {
  it("sends the selection on every send path (SSE, its async redirect, async-jobs)", () => {
    const sendContexts = PAGE.match(/context:\s*\{[^}]*\}/gs) ?? []
    const chatSends = sendContexts.filter((c) => c.includes("session_id: sessionForJob"))
    expect(chatSends.length).toBe(3)
    for (const c of chatSends) expect(c).toContain("...review")
    expect(PAGE).toContain("const review = reviewContext(reviewConversationIds);")
  })

  it("records the server's confirmation on both settle paths", () => {
    expect(PAGE.match(/settleReview\((metadata|_sseLastComplete\.metadata)\)/g)?.length).toBe(2)
  })

  it("no longer renders the claim that was never true", () => {
    expect(PAGE).not.toContain("meridian.reviewingBanner")
    expect(PAGE).toContain("reviewBannerState(reviewConversationIds, reviewOutcome)")
  })

  it("resets the confirmation when the selection changes", () => {
    expect(PAGE).toMatch(/setReviewConversationIds\(ids\);\s*setReviewOutcome\(null\);/)
  })
})
