/**
 * DOC-AV-1 — reading the server's virus-scan outcome off a document.
 */
import {
  DocumentRejectedError,
  DocumentStillCheckingError,
  SCAN_AWAITING_DETAIL,
  SCAN_RESULT_RECEIVED_DETAIL,
  isAwaitingScan,
  scanRejection,
} from "../scan"
import { checkingNotice, scanErrorMessage } from "../checkingNotice"
import { toast } from "sonner"

jest.mock("sonner", () => ({ toast: { loading: jest.fn(), dismiss: jest.fn() } }))

describe("isAwaitingScan", () => {
  it("is true only for scanning WITH one of the two scan markers", () => {
    expect(isAwaitingScan({ status: "scanning", status_detail: SCAN_AWAITING_DETAIL })).toBe(true)
    // The result event got there first and the server is finishing the file.
    expect(isAwaitingScan({ status: "scanning", status_detail: SCAN_RESULT_RECEIVED_DETAIL })).toBe(true)
    expect(isAwaitingScan({ status: "extracting", status_detail: SCAN_RESULT_RECEIVED_DETAIL })).toBe(false)
    // Today's pipeline passes through "scanning" with no detail: not a wait.
    expect(isAwaitingScan({ status: "scanning", status_detail: null })).toBe(false)
    expect(isAwaitingScan({ status: "extracting", status_detail: SCAN_AWAITING_DETAIL })).toBe(false)
    expect(isAwaitingScan({ status: "ready", status_detail: null })).toBe(false)
  })
})

describe("scanRejection", () => {
  it("reads the reason after the prefix", () => {
    expect(
      scanRejection({ status: "failed", status_detail: "Virus scan failed: A threat was found in this file" }),
    ).toBe("A threat was found in this file")
  })
  it("gives a plain reason when the server gave none", () => {
    expect(scanRejection({ status: "failed", status_detail: "Virus scan failed" })).toBe(
      "it didn't pass the virus check",
    )
  })
  it("is null for any other failure, and for a non-failed document carrying old text", () => {
    expect(scanRejection({ status: "failed", status_detail: "Processing error" })).toBeNull()
    expect(scanRejection({ status: "failed", status_detail: null })).toBeNull()
    expect(scanRejection({ status: "ready", status_detail: "Virus scan failed: stale" })).toBeNull()
  })
})

describe("scanErrorMessage", () => {
  it("returns the message for the two scan errors only", () => {
    expect(scanErrorMessage(new DocumentRejectedError("A threat was found in this file"))).toBe(
      "This file wasn't accepted: A threat was found in this file",
    )
    expect(scanErrorMessage(new DocumentStillCheckingError())).toMatch(/still checking this file/)
    expect(scanErrorMessage(new Error("Upload network error"))).toBeNull()
    expect(scanErrorMessage("nope")).toBeNull()
  })
})

describe("checkingNotice", () => {
  beforeEach(() => jest.clearAllMocks())
  it("shows nothing unless the server said it was waiting", () => {
    const n = checkingNotice("cv.pdf")
    n.done()
    expect(toast.loading).not.toHaveBeenCalled()
    expect(toast.dismiss).not.toHaveBeenCalled()
  })
  it("shows the checking line once and dismisses that same toast", () => {
    const n = checkingNotice("cv.pdf")
    n.onChecking()
    expect(toast.loading).toHaveBeenCalledWith("Checking cv.pdf for viruses…", expect.objectContaining({ id: expect.any(String) }))
    const id = (toast.loading as jest.Mock).mock.calls[0][1].id
    n.done()
    expect(toast.dismiss).toHaveBeenCalledWith(id)
  })
})
