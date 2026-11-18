/**
 * @jest-environment jsdom
 *
 * A10-b1: the link-request copy moved into the `sharingUi` namespace. English must not move.
 *
 *  1. LINK_COPY_DEFAULTS (the English default every call passes to t) equals public/locales/en/sharingUi.json,
 *     in both directions. The jest react-i18next mock ignores defaultValue, so without this a wrong default
 *     would be invisible to every render test.
 *  2. Through the real-en-json mock t, every string the functions build equals the original English,
 *     hard-coded here, for every state; and the no-`t` path returns the same English.
 *  3. Static: every key the module resolves through say() is registered, and every registered key is reachable.
 */
import fs from "node:fs"
import path from "node:path"
import { renderHook } from "@testing-library/react"
import { useTranslation } from "react-i18next"

import {
  ADMIN_COPY,
  LINK_COPY_DEFAULTS,
  LINK_REQUEST_CATEGORIES,
  SHARING_UI_NS,
  adminCancelErrorText,
  adminCopy,
  adminRequestLine,
  categoryLabels,
  fixedCopy,
  memberStatusLabel,
} from "../linkRequestCopy"
import en from "../../../../public/locales/en/sharingUi.json"

function flatten(o: Record<string, unknown>, prefix = ""): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [k, v] of Object.entries(o)) {
    const key = prefix ? `${prefix}.${k}` : k
    if (v && typeof v === "object") Object.assign(out, flatten(v as Record<string, unknown>, key))
    else out[key] = String(v)
  }
  return out
}

function useSharingT() {
  return useTranslation(SHARING_UI_NS).t as unknown as Parameters<typeof memberStatusLabel>[1]
}
const useT = () => renderHook(useSharingT).result.current

describe("sharingUi registry", () => {
  const flat = flatten(en)

  it("English file equals the defaults, both directions", () => {
    expect(flat).toEqual(LINK_COPY_DEFAULTS)
    expect(Object.keys(flat).length).toBe(29)
  })

  it("every key the source resolves is registered (a regex that finds nothing would pass vacuously)", () => {
    const src = fs.readFileSync(path.join(__dirname, "..", "linkRequestCopy.ts"), "utf8")
    const used = [...src.matchAll(/say\(t, ["`]([^"`$]+)["`]\)|say\(t, ["`]([^"`$]+)["`],/g)].map((m) => m[1] ?? m[2])
    expect(used.length).toBeGreaterThanOrEqual(10)
    for (const k of used) expect(Object.keys(LINK_COPY_DEFAULTS)).toContain(k)
  })
})

describe("English output is unchanged", () => {
  const t = useT
  it("status labels", () => {
    const tt = t()
    for (const withT of [tt, undefined]) {
      expect(memberStatusLabel("pending", withT)).toBe("Waiting for a reply")
      expect(memberStatusLabel("approved", withT)).toBe("Added")
      expect(memberStatusLabel("withdrawn", withT)).toBe("Withdrawn")
      expect(memberStatusLabel("left", withT)).toBe("Left the team")
      for (const s of ["declined", "cancelled", "expired", "removed", "closed", "mystery"]) {
        expect(memberStatusLabel(s, withT)).toBe("Closed")
      }
    }
  })

  it("category labels, in panel order, unknown keys left out", () => {
    const tt = t()
    const all = LINK_REQUEST_CATEGORIES.map((c) => c.key)
    for (const withT of [tt, undefined]) {
      expect(categoryLabels(all, withT)).toEqual([
        "Goals",
        "PRISM profile",
        "Assessments",
        "Profile",
        "Interviews",
        "Development",
      ])
      expect(categoryLabels(["prism", "nope", "goals"], withT)).toEqual(["Goals", "PRISM profile"])
    }
  })

  it("fixed messages and admin copy", () => {
    const tt = t()
    for (const withT of [tt, undefined]) {
      expect(fixedCopy("sentMessage", withT)).toBe("Sent. If that person can accept requests, they'll see it.")
      expect(fixedCopy("noShareFound", withT)).toBe("We couldn't find a share to stop — check the list above.")
      expect(fixedCopy("refreshFailed", withT)).toBe("We couldn't refresh your requests just now.")
      for (const k of Object.keys(ADMIN_COPY) as (keyof typeof ADMIN_COPY)[]) {
        expect(adminCopy(k, withT)).toBe(ADMIN_COPY[k])
      }
      expect(adminCopy("title", withT)).toBe("Requests to join a team")
      expect(adminCopy("failed", withT)).toBe("That didn't work. Nothing changed — try again.")
    }
  })

  it("admin request line, every name combination", () => {
    const tt = t()
    for (const withT of [tt, undefined]) {
      expect(adminRequestLine(null, null, withT)).toBe("A member asked to join a manager's team")
      expect(adminRequestLine("  ", "  ", withT)).toBe("A member asked to join a manager's team")
      expect(adminRequestLine("Ada", null, withT)).toBe("Ada asked to join a manager's team")
      expect(adminRequestLine(undefined, " Grace ", withT)).toBe("A member asked to join Grace's team")
      expect(adminRequestLine("Ada", "Grace", withT)).toBe("Ada asked to join Grace's team")
    }
  })

  it("admin cancel refusals", () => {
    const tt = t()
    const err = (status: number, code?: string) => ({ response: { status, data: { detail: code ? { code } : undefined } } })
    for (const withT of [tt, undefined]) {
      expect(adminCancelErrorText(err(403), withT)).toBe("Only a company admin can cancel requests.")
      expect(adminCancelErrorText(err(409, "not_pending"), withT)).toBe("This request has already closed.")
      expect(adminCancelErrorText(err(404), withT)).toBe("This request is no longer available.")
      expect(adminCancelErrorText(err(409, "other"), withT)).toBe("That didn't work. Nothing changed — try again.")
      expect(adminCancelErrorText(err(500), withT)).toBe("That didn't work. Nothing changed — try again.")
    }
  })
})
