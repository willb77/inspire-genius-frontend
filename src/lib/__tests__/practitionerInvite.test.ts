/**
 * @jest-environment jsdom
 *
 * PI-4 S6 — the invite token moves from the URL fragment to sessionStorage
 * ONLY, the fragment is cleared, and nothing happens without `invite=`.
 */
import {
  INVITE_STORAGE_KEY,
  captureInviteFromLocation,
  clearStoredInvite,
  inviteFromHash,
  readStoredInvite,
} from "../practitionerInvite"

const TOKEN = "AbCdEfGhIjKlMnOpQrStUvWxYz0123456789_-abcde" // 43 chars, token_urlsafe shape

function storageHolds(storage: Storage, needle: string): boolean {
  for (let i = 0; i < storage.length; i++) {
    const k = storage.key(i) ?? ""
    if (k.includes(needle) || (storage.getItem(k) ?? "").includes(needle)) return true
  }
  return false
}

beforeEach(() => {
  sessionStorage.clear()
  localStorage.clear()
  window.history.replaceState(null, "", "/")
})

describe("inviteFromHash", () => {
  it("reads invite= from a fragment, with or without the #", () => {
    expect(inviteFromHash(`#invite=${TOKEN}`)).toBe(TOKEN)
    expect(inviteFromHash(`invite=${TOKEN}`)).toBe(TOKEN)
    expect(inviteFromHash(`#x=1&invite=${TOKEN}`)).toBe(TOKEN)
  })
  it("is null for an empty or unrelated fragment", () => {
    expect(inviteFromHash("")).toBeNull()
    expect(inviteFromHash("#")).toBeNull()
    expect(inviteFromHash("#section-2")).toBeNull()
  })
})

describe("captureInviteFromLocation", () => {
  it("moves the token to sessionStorage and clears the fragment", () => {
    window.history.pushState(null, "", `/signup?lang=en#invite=${TOKEN}`)
    expect(captureInviteFromLocation()).toBe(true)
    expect(sessionStorage.getItem(INVITE_STORAGE_KEY)).toBe(TOKEN)
    expect(window.location.hash).toBe("")
    expect(window.location.pathname).toBe("/signup")
    // The query string is kept, and the token is never put in it.
    expect(window.location.search).toBe("?lang=en")
    expect(window.location.href).not.toContain(TOKEN)
  })

  it("never writes the token to localStorage", () => {
    window.history.pushState(null, "", `/signup#invite=${TOKEN}`)
    captureInviteFromLocation()
    expect(localStorage.length).toBe(0)
    expect(storageHolds(localStorage, TOKEN)).toBe(false)
  })

  it("touches nothing on a plain /signup", () => {
    window.history.pushState(null, "", "/signup")
    const spy = jest.spyOn(window.history, "replaceState")
    expect(captureInviteFromLocation()).toBe(false)
    expect(spy).not.toHaveBeenCalled()
    expect(sessionStorage.length).toBe(0)
    expect(localStorage.length).toBe(0)
    spy.mockRestore()
  })

  it("leaves an unrelated fragment alone", () => {
    window.history.pushState(null, "", "/signup#terms")
    const spy = jest.spyOn(window.history, "replaceState")
    expect(captureInviteFromLocation()).toBe(false)
    expect(spy).not.toHaveBeenCalled()
    expect(window.location.hash).toBe("#terms")
    spy.mockRestore()
  })

  it("clears a malformed invite fragment but stores nothing", () => {
    window.history.pushState(null, "", "/signup#invite=<script>")
    expect(captureInviteFromLocation()).toBe(false)
    expect(window.location.hash).toBe("")
    expect(sessionStorage.length).toBe(0)
  })

  it("survives storage that throws (private mode)", () => {
    window.history.pushState(null, "", `/signup#invite=${TOKEN}`)
    const spy = jest.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("quota")
    })
    expect(captureInviteFromLocation()).toBe(false)
    expect(window.location.hash).toBe("")
    spy.mockRestore()
  })

  it("still stores when replaceState throws", () => {
    const loc = { hash: `#invite=${TOKEN}`, pathname: "/signup", search: "" }
    const hist = {
      state: null,
      replaceState: () => {
        throw new Error("sandboxed")
      },
    }
    expect(captureInviteFromLocation(loc, hist)).toBe(true)
    expect(readStoredInvite()).toBe(TOKEN)
  })
})

describe("readStoredInvite / clearStoredInvite", () => {
  it("reads a well-formed token and clears it", () => {
    sessionStorage.setItem(INVITE_STORAGE_KEY, TOKEN)
    expect(readStoredInvite()).toBe(TOKEN)
    clearStoredInvite()
    expect(readStoredInvite()).toBeNull()
    expect(sessionStorage.getItem(INVITE_STORAGE_KEY)).toBeNull()
  })
  it("ignores a malformed stored value", () => {
    sessionStorage.setItem(INVITE_STORAGE_KEY, "bad token!")
    expect(readStoredInvite()).toBeNull()
  })
  it("returns null when storage throws", () => {
    const spy = jest.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("denied")
    })
    expect(readStoredInvite()).toBeNull()
    spy.mockRestore()
  })
})
