import { copyText } from "../copyText"

describe("copyText", () => {
  const originalClipboard = Object.getOwnPropertyDescriptor(navigator, "clipboard")
  const originalExec = document.execCommand

  afterEach(() => {
    if (originalClipboard) Object.defineProperty(navigator, "clipboard", originalClipboard)
    else Reflect.deleteProperty(navigator, "clipboard")
    document.execCommand = originalExec
  })

  function setClipboard(value: unknown) {
    Object.defineProperty(navigator, "clipboard", { value, configurable: true })
  }

  it("uses the async Clipboard API when present", async () => {
    const writeText = jest.fn().mockResolvedValue(undefined)
    setClipboard({ writeText })
    await expect(copyText("ABC")).resolves.toBe(true)
    expect(writeText).toHaveBeenCalledWith("ABC")
  })

  it("falls back to execCommand when the Clipboard API rejects", async () => {
    setClipboard({ writeText: jest.fn().mockRejectedValue(new Error("denied")) })
    const exec = jest.fn().mockReturnValue(true)
    document.execCommand = exec
    await expect(copyText("ABC")).resolves.toBe(true)
    expect(exec).toHaveBeenCalledWith("copy")
    expect(document.querySelector("textarea")).toBeNull()
  })

  it("falls back when there is no Clipboard API, and reports failure honestly", async () => {
    setClipboard(undefined)
    document.execCommand = jest.fn().mockReturnValue(false)
    await expect(copyText("ABC")).resolves.toBe(false)
  })

  it("returns false when execCommand throws", async () => {
    setClipboard(undefined)
    document.execCommand = jest.fn(() => {
      throw new Error("nope")
    })
    await expect(copyText("ABC")).resolves.toBe(false)
  })
})
