/**
 * Batching rules for the bulk "Skip onboarding" import.
 *
 * Why this exists: /v1/user-management/invite/bulk accepts up to 50 rows, but
 * the real limit is TIME — auth-service has a 30s Lambda timeout and API
 * Gateway caps at 30s, while each row costs a Cognito create + Aurora writes +
 * an SES send (~2s/row measured on staging-b). A single 50-row request runs
 * 50-100s: it times out having already created some students, and returns
 * nothing, so the operator cannot tell who exists.
 *
 * These tests pin the three properties that make a 50-student upload safe.
 */
import {
  runChunkedBulkInvite,
  BULK_INVITE_CHUNK_SIZE,
} from "../useBulkImport"
import type {
  BulkInviteData,
  InviteUserPayload,
} from "@/services/super-admin/user-management/user-management.service"

function users(n: number): InviteUserPayload[] {
  return Array.from({ length: n }, (_, i) => ({
    email: `student${i}@school.test`,
    first_name: `First${i}`,
    last_name: `Last${i}`,
    role: "user",
    demo_account: true,
  }))
}

/** A sender that succeeds, numbering rows per-request (as the server does). */
function okSender(calls: InviteUserPayload[][]) {
  return async (chunk: InviteUserPayload[]) => {
    calls.push(chunk)
    const data: BulkInviteData = {
      summary: { total: chunk.length, successful: chunk.length, failed: 0 },
      successful_invitations: chunk.map((u, i) => ({
        index: i, // per-REQUEST numbering — restarts at 0 every chunk
        email: u.email,
        name: `${u.first_name} ${u.last_name}`,
      })),
      failed_invitations: [],
    }
    return { data }
  }
}

describe("runChunkedBulkInvite", () => {
  it("never exceeds the chunk size in a single request", async () => {
    const calls: InviteUserPayload[][] = []
    await runChunkedBulkInvite(users(50), { send: okSender(calls) })

    expect(calls.length).toBe(Math.ceil(50 / BULK_INVITE_CHUNK_SIZE))
    for (const c of calls) {
      expect(c.length).toBeLessThanOrEqual(BULK_INVITE_CHUNK_SIZE)
    }
    // Every student sent exactly once, none dropped or duplicated.
    const sent = calls.flat().map((u) => u.email)
    expect(new Set(sent).size).toBe(50)
  })

  it("stays under the endpoint's own 50-row cap", () => {
    expect(BULK_INVITE_CHUNK_SIZE).toBeLessThanOrEqual(50)
  })

  it("re-bases per-request row indices onto the whole upload", async () => {
    // The server restarts `index` at 0 for each chunk. Without re-basing the
    // results table shows several "row 0"s and the operator cannot map a
    // failure back to a spreadsheet line.
    const result = await runChunkedBulkInvite(users(20), { send: okSender([]) })
    const indices = result.successful_invitations.map((r) => r.index)
    expect(indices).toEqual(Array.from({ length: 20 }, (_, i) => i))
  })

  it("keeps earlier successes and continues after a failing chunk", async () => {
    let call = 0
    const send = async (chunk: InviteUserPayload[]) => {
      call += 1
      if (call === 2) throw new Error("Network Error")
      const data: BulkInviteData = {
        summary: { total: chunk.length, successful: chunk.length, failed: 0 },
        successful_invitations: chunk.map((u, i) => ({
          index: i,
          email: u.email,
          name: u.email,
        })),
        failed_invitations: [],
      }
      return { data }
    }

    const result = await runChunkedBulkInvite(users(24), { send })

    // 3 chunks of 8; the middle one failed.
    expect(call).toBe(3)
    expect(result.summary.successful).toBe(16)
    expect(result.summary.failed).toBe(8)
    // The failed chunk's rows are named individually so the operator can
    // re-upload exactly those students.
    expect(result.failed_invitations.map((r) => r.email)).toEqual(
      users(24).slice(8, 16).map((u) => u.email),
    )
    expect(result.failed_invitations.every((r) => r.error === "Network Error")).toBe(true)
    // Failed rows keep their true position in the upload.
    expect(result.failed_invitations.map((r) => r.index)).toEqual([8, 9, 10, 11, 12, 13, 14, 15])
  })

  it("summary counts reflect the merged result, not the last chunk", async () => {
    const result = await runChunkedBulkInvite(users(50), { send: okSender([]) })
    expect(result.summary).toEqual({ total: 50, successful: 50, failed: 0 })
  })

  it("reports progress so a ~2 minute upload does not look hung", async () => {
    const seen: Array<{ done: number; total: number }> = []
    await runChunkedBulkInvite(users(50), {
      send: okSender([]),
      onProgress: (p) => seen.push({ ...p }),
    })
    expect(seen[0]).toEqual({ done: 0, total: 50 })
    // Never overshoots the total, and finishes exactly at it.
    expect(seen.every((p) => p.done <= p.total)).toBe(true)
    expect(seen[seen.length - 1]).toEqual({ done: 50, total: 50 })
  })

  it("sends chunks sequentially, not concurrently", async () => {
    let inFlight = 0
    let maxInFlight = 0
    const send = async (chunk: InviteUserPayload[]) => {
      inFlight += 1
      maxInFlight = Math.max(maxInFlight, inFlight)
      await new Promise((r) => setTimeout(r, 1))
      inFlight -= 1
      return {
        data: {
          summary: { total: chunk.length, successful: chunk.length, failed: 0 },
          successful_invitations: chunk.map((u, i) => ({ index: i, email: u.email, name: u.email })),
          failed_invitations: [],
        } as BulkInviteData,
      }
    }
    await runChunkedBulkInvite(users(24), { send })
    expect(maxInFlight).toBe(1)
  })

  it("handles an empty upload without calling the endpoint", async () => {
    const calls: InviteUserPayload[][] = []
    const result = await runChunkedBulkInvite([], { send: okSender(calls) })
    expect(calls.length).toBe(0)
    expect(result.summary).toEqual({ total: 0, successful: 0, failed: 0 })
  })

  it("a single short upload still goes in one request", async () => {
    const calls: InviteUserPayload[][] = []
    await runChunkedBulkInvite(users(3), { send: okSender(calls) })
    expect(calls.length).toBe(1)
    expect(calls[0].length).toBe(3)
  })

  it("tolerates a response with no data body", async () => {
    const result = await runChunkedBulkInvite(users(8), { send: async () => ({}) })
    expect(result.summary).toEqual({ total: 8, successful: 0, failed: 0 })
  })
})
