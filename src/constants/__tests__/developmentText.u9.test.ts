import { createHash } from "node:crypto"
import {
  DEV_TEXT,
  DEV_TEXT_BY_AUDIENCE,
  DEV_TEXT_PRACTITIONER,
} from "@/constants/development"

/**
 * U9 — one Studio text table per audience.
 *
 * The manager's table must not move by a byte: it is the same object as
 * `DEV_TEXT`, and `DEV_TEXT` itself is pinned by a hash taken at the base this
 * package was cut from. Any edit to a manager string fails here and has to be
 * made on purpose.
 */

/** sha256 of JSON.stringify(DEV_TEXT) at frontend development 33d8269f (before U9). */
const MANAGER_TABLE_SHA256 = "a34487a57f6a212da3c0d62883f163b6562733c721706148126afbd8b639d740"

/** The keys a practitioner never sees: the join-request panel is manager-only. */
const MANAGER_ONLY_PREFIX = "dev.linkRequests."

const TEAM_OR_MEMBER = /\bteams?\b|\bmembers?(?:'s)?\b/i

describe("the manager's Studio copy is byte-identical (U9)", () => {
  it("the manager table IS DEV_TEXT, not a copy of it", () => {
    expect(DEV_TEXT_BY_AUDIENCE.manager).toBe(DEV_TEXT)
  })

  it("DEV_TEXT matches the hash taken before U9", () => {
    const sha = createHash("sha256").update(JSON.stringify(DEV_TEXT)).digest("hex")
    expect(sha).toBe(MANAGER_TABLE_SHA256)
  })
})

describe("the practitioner's Studio copy says client (U9)", () => {
  const practitioner = DEV_TEXT_BY_AUDIENCE.practitioner

  it("names the Studio as decided (D3)", () => {
    expect(practitioner["dev.studio.title"]).toBe("Client Development Studio")
  })

  it("has exactly the manager's keys — a table, not a partial one", () => {
    expect(Object.keys(practitioner).sort()).toEqual(Object.keys(DEV_TEXT).sort())
  })

  it("overrides only keys the manager table has", () => {
    for (const key of Object.keys(DEV_TEXT_PRACTITIONER)) {
      expect(DEV_TEXT).toHaveProperty([key])
    }
  })

  it("says neither team nor member in any line a practitioner can be shown", () => {
    const offenders = Object.entries(practitioner)
      .filter(([key]) => !key.startsWith(MANAGER_ONLY_PREFIX))
      .filter(([, value]) => TEAM_OR_MEMBER.test(value))
    expect(offenders).toEqual([])
  })

  it("a control: the same check finds the manager's team and member lines", () => {
    // Without this, a regex that matched nothing would pass the test above.
    const managerHits = Object.entries(DEV_TEXT)
      .filter(([key]) => !key.startsWith(MANAGER_ONLY_PREFIX))
      .filter(([, value]) => TEAM_OR_MEMBER.test(value))
      .map(([key]) => key)
    expect(managerHits).toEqual(expect.arrayContaining(Object.keys(DEV_TEXT_PRACTITIONER)))
  })

  it("every practitioner override differs from the manager line it replaces", () => {
    for (const [key, value] of Object.entries(DEV_TEXT_PRACTITIONER)) {
      expect(value).not.toBe(DEV_TEXT[key])
    }
  })

  it("keeps the roster scope line a practitioner reads, word for word", () => {
    // It says what the server sends a practitioner today (their organisation
    // plus anyone added). Until U11 that is the honest line, whatever the
    // Studio is called.
    expect(practitioner["dev.studio.scope.team"]).toBe(DEV_TEXT["dev.studio.scope.team"])
  })
})
