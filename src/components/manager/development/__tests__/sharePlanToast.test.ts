import { sharePlanToast, SHARE_PLAN_ERROR } from "../sharePlanToast"

jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn(), warning: jest.fn() },
}))
import { toast } from "sonner"

beforeEach(() => jest.clearAllMocks())

describe("sharePlanToast (OM-F3)", () => {
  it("notified → says it reached their notifications", () => {
    sharePlanToast({ notified: true, alreadySent: false }, "Ann")
    expect(toast.success).toHaveBeenCalledWith("Sent to Ann's notifications.")
  })

  it("already sent today → says so, not a failure", () => {
    sharePlanToast({ notified: false, alreadySent: true }, "Ann")
    expect(toast.success).toHaveBeenCalledWith("Already sent to Ann today.")
    expect(toast.warning).not.toHaveBeenCalled()
  })

  it("not notified → a warning that names where the plan still is", () => {
    sharePlanToast({ notified: false, alreadySent: false }, "Ann")
    expect(toast.warning).toHaveBeenCalledWith(
      "Couldn't notify Ann; their plan is still on their My Development page.",
    )
    expect(toast.success).not.toHaveBeenCalled()
  })

  it("a server that predates OM-F3 (no notified field) keeps the old wording", () => {
    sharePlanToast({ memberId: "m-1" }, "Ann")
    expect(toast.success).toHaveBeenCalledWith("Development plan shared with Ann.")
    sharePlanToast(undefined, "Ann")
    expect(toast.success).toHaveBeenCalledTimes(2)
    expect(toast.warning).not.toHaveBeenCalled()
  })

  it("falls back to 'the member' with no name", () => {
    sharePlanToast({ notified: true })
    expect(toast.success).toHaveBeenCalledWith("Sent to the member's notifications.")
  })

  it("exports the unchanged error text", () => {
    expect(SHARE_PLAN_ERROR).toBe("Couldn't share the plan. Try again.")
  })
})
