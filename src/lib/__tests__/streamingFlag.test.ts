import {
  isStreamTextResponsesEnabled,
  setStreamTextResponsesEnabled,
  STREAM_FLAG_KEY,
} from "../streamingFlag"

describe("streamingFlag", () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it("returns false when the flag is not set", () => {
    expect(isStreamTextResponsesEnabled()).toBe(false)
  })

  it("returns true only when the flag is exactly 'true'", () => {
    localStorage.setItem(STREAM_FLAG_KEY, "true")
    expect(isStreamTextResponsesEnabled()).toBe(true)
  })

  it("returns false for any other string value", () => {
    localStorage.setItem(STREAM_FLAG_KEY, "yes")
    expect(isStreamTextResponsesEnabled()).toBe(false)

    localStorage.setItem(STREAM_FLAG_KEY, "1")
    expect(isStreamTextResponsesEnabled()).toBe(false)

    localStorage.setItem(STREAM_FLAG_KEY, "TRUE")
    expect(isStreamTextResponsesEnabled()).toBe(false)
  })

  it("setStreamTextResponsesEnabled(true) writes 'true'", () => {
    setStreamTextResponsesEnabled(true)
    expect(localStorage.getItem(STREAM_FLAG_KEY)).toBe("true")
    expect(isStreamTextResponsesEnabled()).toBe(true)
  })

  it("setStreamTextResponsesEnabled(false) removes the key", () => {
    localStorage.setItem(STREAM_FLAG_KEY, "true")
    setStreamTextResponsesEnabled(false)
    expect(localStorage.getItem(STREAM_FLAG_KEY)).toBeNull()
    expect(isStreamTextResponsesEnabled()).toBe(false)
  })

  it("returns false when localStorage throws (SSR / privacy mode)", () => {
    const originalGetItem = Storage.prototype.getItem
    Storage.prototype.getItem = jest.fn(() => {
      throw new Error("Storage unavailable")
    })
    try {
      expect(isStreamTextResponsesEnabled()).toBe(false)
    } finally {
      Storage.prototype.getItem = originalGetItem
    }
  })
})
