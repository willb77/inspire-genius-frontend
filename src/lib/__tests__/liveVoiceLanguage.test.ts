import { I18N_STORAGE_KEY, liveVoiceLanguage } from "../voiceLanguage"

/**
 * `voice_start` on the live-voice socket used to be hardcoded to "en-US" in
 * every sender, so a Polish or Czech speaker was transcribed as US English by
 * the server no matter what language they had chosen. These tests pin the
 * helper those senders now share.
 */
describe("liveVoiceLanguage", () => {
  afterEach(() => {
    window.localStorage.clear()
    jest.restoreAllMocks()
  })

  it("sends the language the user chose in the app", () => {
    window.localStorage.setItem(I18N_STORAGE_KEY, "pl")
    expect(liveVoiceLanguage()).toBe("pl")
  })

  it("keeps a region-qualified tag intact", () => {
    window.localStorage.setItem(I18N_STORAGE_KEY, "zh-CN")
    expect(liveVoiceLanguage()).toBe("zh-CN")
  })

  it("uses the browser language when nothing is stored", () => {
    jest.spyOn(window.navigator, "language", "get").mockReturnValue("cs-CZ")
    expect(liveVoiceLanguage()).toBe("cs-CZ")
  })

  it("falls back to en-US, never undefined, when the language cannot be read", () => {
    jest.spyOn(window.localStorage.__proto__, "getItem").mockImplementation(() => {
      throw new Error("SecurityError")
    })
    jest.spyOn(window.navigator, "language", "get").mockReturnValue("")
    expect(liveVoiceLanguage()).toBe("en-US")
  })
})
