/**
 * @jest-environment jsdom
 *
 * DOC-AV-1 — triggerProcessing on a tier that virus-scans asynchronously.
 * The first block pins that every other tier sees exactly one request and
 * today's response, whatever status it carries.
 */
import { api } from "@/lib/axios"
import {
  DocumentRejectedError,
  DocumentStillCheckingError,
  SCAN_AWAITING_DETAIL,
  triggerProcessing,
} from "../documentService"

jest.mock("@/lib/axios", () => ({ api: { post: jest.fn(), get: jest.fn() } }))
const mockApi = api as jest.Mocked<typeof api>

const doc = (status: string, status_detail: string | null = null) => ({ id: "d1", status, status_detail })
const wrap = (d: unknown) => ({ data: { data: d } })

describe("triggerProcessing — tiers with no async scan (today)", () => {
  beforeEach(() => jest.clearAllMocks())

  it.each([
    ["ready", null],
    ["scanning", null],
    ["extracting", null],
    ["failed", "Processing error"],
    ["pending", "Awaiting upload"],
  ])("status %s / %s → returned as-is after ONE request", async (status, detail) => {
    const onChecking = jest.fn()
    mockApi.post.mockResolvedValueOnce(wrap(doc(status, detail)))
    await expect(triggerProcessing("d1", { onChecking })).resolves.toEqual(doc(status, detail))
    expect(mockApi.post).toHaveBeenCalledTimes(1)
    expect(mockApi.get).not.toHaveBeenCalled()
    expect(onChecking).not.toHaveBeenCalled()
  })
})

describe("triggerProcessing — awaiting virus scan", () => {
  beforeEach(() => jest.clearAllMocks())

  it("says it's checking once, polls until ready, and returns the finished document", async () => {
    const onChecking = jest.fn()
    mockApi.post.mockResolvedValueOnce(wrap(doc("scanning", SCAN_AWAITING_DETAIL)))
    mockApi.get
      .mockResolvedValueOnce(wrap(doc("scanning", SCAN_AWAITING_DETAIL)))
      .mockResolvedValueOnce(wrap(doc("extracting")))
      .mockResolvedValueOnce(wrap(doc("ready")))
    await expect(triggerProcessing("d1", { onChecking, pollMs: 0 })).resolves.toEqual(doc("ready"))
    expect(onChecking).toHaveBeenCalledTimes(1)
    expect(mockApi.get).toHaveBeenCalledTimes(3)
    expect(mockApi.get).toHaveBeenCalledWith("/v1/documents/d1")
  })

  it("throws DocumentRejectedError when the scan refuses the file", async () => {
    mockApi.post.mockResolvedValueOnce(wrap(doc("scanning", SCAN_AWAITING_DETAIL)))
    mockApi.get.mockResolvedValueOnce(wrap(doc("failed", "Virus scan failed: A threat was found in this file")))
    const err = await triggerProcessing("d1", { pollMs: 0 }).catch((e) => e)
    expect(err).toBeInstanceOf(DocumentRejectedError)
    expect(err.reason).toBe("A threat was found in this file")
  })

  it("throws for a refusal already on the first response, without polling", async () => {
    mockApi.post.mockResolvedValueOnce(wrap(doc("failed", "Virus scan failed: This file couldn't be checked")))
    await expect(triggerProcessing("d1", { pollMs: 0 })).rejects.toBeInstanceOf(DocumentRejectedError)
    expect(mockApi.get).not.toHaveBeenCalled()
  })

  it("returns (does not throw) a file that failed for a reason other than the scan", async () => {
    mockApi.post.mockResolvedValueOnce(wrap(doc("scanning", SCAN_AWAITING_DETAIL)))
    mockApi.get.mockResolvedValueOnce(wrap(doc("failed", "Processing error")))
    await expect(triggerProcessing("d1", { pollMs: 0 })).resolves.toEqual(doc("failed", "Processing error"))
  })

  it("gives up with DocumentStillCheckingError when the wait runs out", async () => {
    mockApi.post.mockResolvedValueOnce(wrap(doc("scanning", SCAN_AWAITING_DETAIL)))
    mockApi.get.mockResolvedValue(wrap(doc("scanning", SCAN_AWAITING_DETAIL)))
    await expect(triggerProcessing("d1", { pollMs: 5, waitMs: 30 })).rejects.toBeInstanceOf(
      DocumentStillCheckingError,
    )
    expect(mockApi.get.mock.calls.length).toBeGreaterThan(0)
  })
})
