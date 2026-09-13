import { I18N_STORAGE_KEY, ttsLanguage } from "../voiceLanguage"

/**
 * The contract here is small but load-bearing: get it wrong and either every
 * user hears the wrong language, or nobody hears a native voice at all and the
 * feature looks shipped while doing nothing.
 *
 * The most valuable test in this file is the last one — it pins the storage
 * key against the real i18n config, because that coupling is invisible from
 * either file alone.
 */

const setStore = (value: string | null) => {
  if (value === null) window.localStorage.removeItem(I18N_STORAGE_KEY)
  else window.localStorage.setItem(I18N_STORAGE_KEY, value)
}

describe("ttsLanguage", () => {
  afterEach(() => {
    window.localStorage.clear()
    jest.restoreAllMocks()
  })

  it("returns the language i18next stored", () => {
    setStore("fr")
    expect(ttsLanguage()).toBe("fr")
  })

  it("preserves a region-qualified tag", () => {
    // zh-CN must survive intact — the server maps it to cmn-CN, and it cannot
    // do that if the region has already been stripped here.
    setStore("zh-CN")
    expect(ttsLanguage()).toBe("zh-CN")
  })

  it("falls back to navigator.language when nothing is stored", () => {
    setStore(null)
    jest.spyOn(window.navigator, "language", "get").mockReturnValue("de-DE")
    expect(ttsLanguage()).toBe("de-DE")
  })

  it("prefers the stored value over navigator", () => {
    // The user's explicit in-app choice beats their browser's setting.
    setStore("ja")
    jest.spyOn(window.navigator, "language", "get").mockReturnValue("de-DE")
    expect(ttsLanguage()).toBe("ja")
  })

  it("treats an empty stored value as absent", () => {
    setStore("   ")
    jest.spyOn(window.navigator, "language", "get").mockReturnValue("it")
    expect(ttsLanguage()).toBe("it")
  })

  it("returns undefined rather than throwing when storage is unavailable", () => {
    // Private windows and embedded webviews THROW on access rather than
    // returning null. undefined is the correct answer: the server then
    // behaves exactly as it did before this field existed.
    jest.spyOn(window.localStorage.__proto__, "getItem").mockImplementation(() => {
      throw new Error("SecurityError")
    })
    jest.spyOn(window.navigator, "language", "get").mockReturnValue("")
    expect(ttsLanguage()).toBeUndefined()
  })

  it("survives storage throwing and still reads navigator", () => {
    jest.spyOn(window.localStorage.__proto__, "getItem").mockImplementation(() => {
      throw new Error("SecurityError")
    })
    jest.spyOn(window.navigator, "language", "get").mockReturnValue("ko")
    expect(ttsLanguage()).toBe("ko")
  })

  it("uses the same storage key the i18n detector is configured with", () => {
    // src/lib/i18n.ts sets lookupLocalStorage: 'i18nextLng'. If that changes
    // and this does not, ttsLanguage() silently returns the browser locale
    // forever and the user's in-app choice stops being honoured — with no
    // error anywhere. Read the config as text so this does not import i18next
    // (which would run i18n.init() inside jsdom).
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fs = require("fs") as typeof import("fs")
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const path = require("path") as typeof import("path")
    const config = fs.readFileSync(
      path.join(__dirname, "..", "i18n.ts"),
      "utf8",
    )
    expect(config).toContain(`lookupLocalStorage: '${I18N_STORAGE_KEY}'`)
    expect(config).toContain("order: ['localStorage', 'navigator']")
  })
})
