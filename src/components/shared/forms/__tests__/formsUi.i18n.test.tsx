/**
 * @jest-environment jsdom
 *
 * A10-b3: the organisation / issue / team / user / coach form rules and their messages moved into the `formsUi`
 * namespace. English must not move, and the stored values must not move.
 *
 *  1. FORMS_UI_DEFAULTS (the English default every call passes to t) equals public/locales/en/formsUi.json, both
 *     directions. The jest react-i18next mock ignores defaultValue, so without this a wrong default is invisible.
 *  2. Every rule and every error state, evaluated through the no-`t` path and through the real-en-json `t`, yields
 *     the original English, hard-coded here; and the exported *_FORM_RULES constants are the same.
 *  3. Routing proof: with a `t` that tags every key, EVERY message changes, so no message bypasses t.
 *  4. Static: every key formRules.ts / formsUiCopy.ts resolves is registered, every registered key is reachable;
 *     ISSUE_STATUSES / TEAM_ROLES values are the English stored values.
 */
import fs from "node:fs"
import path from "node:path"
import { renderHook } from "@testing-library/react"
import { useTranslation } from "react-i18next"

import { FORMS_UI_DEFAULTS, FORMS_UI_NS, issueStatusLabel, teamRoleLabel, type FormsTranslate } from "../formsUiCopy"
import {
  getCoachFormRules,
  getIssueDetailRules,
  getOrganizationFormRules,
  getTeamFormRules,
  getUserFormRules,
} from "../formRules"
import { COACH_FORM_RULES } from "../coachForm.constants"
import { ISSUE_DETAIL_RULES, ISSUE_STATUSES } from "../IssueDetailPage.constants"
import { ORGANIZATION_FORM_RULES } from "../organizationForm.constants"
import { TEAM_FORM_RULES, TEAM_ROLES } from "../teamForm.constants"
import { User_FORM_RULES } from "../userForm.constants"
import en from "../../../../../public/locales/en/formsUi.json"

function flatten(o: Record<string, unknown>, prefix = ""): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [k, v] of Object.entries(o)) {
    const key = prefix ? `${prefix}.${k}` : k
    if (v && typeof v === "object") Object.assign(out, flatten(v as Record<string, unknown>, key))
    else out[key] = String(v)
  }
  return out
}

const useFormsT = () => useTranslation(FORMS_UI_NS).t as unknown as FormsTranslate
const realT = () => renderHook(useFormsT).result.current
const tagT: FormsTranslate = (key) => `T[${key}]`

describe("formsUi registry", () => {
  const flat = flatten(en)

  it("English file equals the defaults, both directions", () => {
    expect(flat).toEqual(FORMS_UI_DEFAULTS)
    expect(Object.keys(flat).length).toBe(37)
  })

  it("every key the source resolves is registered, and every registered key is reachable", () => {
    const dir = path.join(__dirname, "..")
    const src = ["formRules.ts", "formsUiCopy.ts"].map((f) => fs.readFileSync(path.join(dir, f), "utf8")).join("\n")
    const used = new Set([...src.matchAll(/say\(t, "([^"]+)"\)/g)].map((m) => m[1]))
    expect(used.size).toBeGreaterThanOrEqual(37)
    for (const k of used) expect(Object.keys(FORMS_UI_DEFAULTS)).toContain(k)
    for (const k of Object.keys(FORMS_UI_DEFAULTS)) expect(used).toContain(k)
  })
})

describe("English output is unchanged", () => {
  const withEach = (fn: (t: FormsTranslate | undefined) => void) => {
    for (const t of [undefined, realT()]) fn(t)
  }

  it("organisation rules, every state", () => {
    withEach((t) => {
      const r = getOrganizationFormRules(t)
      expect(r.organization_name).toEqual({ required: "Organization name is required" })
      expect(r.type).toEqual({ required: "Organization type is required" })
      expect(r.email.required).toBe("Organization email is required")
      expect(r.email.validate("nope")).toBe("Please enter a valid email address")
      expect(r.email.validate("a@b.co")).toBe(true)
      expect(r.email.validate("")).toBe(true)
      expect(r.contact.required).toBe("Contact number is required")
      expect(r.contact.pattern.message).toBe("Please enter a valid contact number")
      expect(r.contact.pattern.value.test("1234567890")).toBe(true)
      expect(r.contact.pattern.value.test("12345")).toBe(false)
      expect(r.website_url.validate("not a url")).toBe("Please enter a valid URL")
      expect(r.website_url.validate("https://x.org")).toBe(true)
      expect(r.website_url.validate("")).toBe(true)
      expect(r.address).toEqual({ required: "Address is required" })
      expect(r.logo).toEqual({})
      expect(r.coaches).toEqual({})
      expect(r.license_type).toEqual({ required: "License type is required" })
      expect(r.license_key).toEqual({ required: "License key is required" })
      expect(r.license_start_date).toEqual({ required: "Start date is required" })
      expect(r.license_end_date).toEqual({ required: "End date is required" })
    })
  })

  it("issue rules, every state", () => {
    withEach((t) => {
      const r = getIssueDetailRules(t)
      expect(r.comment.required).toBe("Comment is required")
      expect(r.comment.minLength).toEqual({ value: 5, message: "Comment must be at least 5 characters long" })
      expect(r.comment.maxLength).toEqual({ value: 300, message: "Comment cannot exceed 300 characters" })
      expect(r.comment.pattern.message).toBe("Comment contains invalid characters")
      expect(r.comment.pattern.value.test("Hello, world!")).toBe(true)
      expect(r.comment.pattern.value.test("bad <b>")).toBe(false)
      expect(r.status.validate("bogus")).toBe("Invalid status selected")
      expect(r.status.validate("open")).toBe(true)
      expect(r.status.validate("")).toBe(true)
    })
  })

  it("team rules, every state", () => {
    withEach((t) => {
      const r = getTeamFormRules(t)
      expect(r.name).toEqual({ required: "Name is required" })
      expect(r.email.required).toBe("Email is required")
      expect(r.email.validate("nope")).toBe("Enter a valid email")
      expect(r.email.validate("a@b.co")).toBe(true)
      expect(r.role).toEqual({ required: "Role is required" })
      expect(r.status).toEqual({})
    })
  })

  it("user rules, every state", () => {
    withEach((t) => {
      const r = getUserFormRules(t)
      expect(r.first_name).toEqual({ required: "First name is required" })
      expect(r.last_name).toEqual({ required: "Last name is required" })
      expect(r.email.required).toBe("Email is required")
      for (const bad of ["a b@c.com", "nodomain", "@c.com", "a@@c.com", "a@b", "a@.com", "a@b."]) {
        expect(r.email.validate(bad)).toBe("Enter a valid email")
      }
      expect(r.email.validate("")).toBe(true)
      expect(r.email.validate("a@b.co")).toBe(true)
      expect(r.role).toEqual({ required: "Role is required" })
      expect(r.status).toEqual({})
      expect(r.skip_onboarding).toEqual({})
      expect(r.organization_id).toEqual({})
    })
  })

  it("coach rules, every state", () => {
    withEach((t) => {
      const r = getCoachFormRules(t)
      expect(r.name).toEqual({ required: "Coach name is required" })
      expect(r.category).toEqual({ required: "Category is required" })
      expect(r.voice_style).toEqual({})
      expect(r.voice_description).toEqual({})
      expect(r.persona).toEqual({})
      expect(r.status).toEqual({})
    })
  })

  it("the exported constants are the English-identity factories", () => {
    expect(JSON.stringify(ORGANIZATION_FORM_RULES)).toBe(JSON.stringify(getOrganizationFormRules(realT())))
    expect(JSON.stringify(ISSUE_DETAIL_RULES)).toBe(JSON.stringify(getIssueDetailRules(realT())))
    expect(JSON.stringify(TEAM_FORM_RULES)).toBe(JSON.stringify(getTeamFormRules(realT())))
    expect(JSON.stringify(User_FORM_RULES)).toBe(JSON.stringify(getUserFormRules(realT())))
    expect(JSON.stringify(COACH_FORM_RULES)).toBe(JSON.stringify(getCoachFormRules(realT())))
  })

  it("stored values stay English; display labels are the same English", () => {
    expect([...ISSUE_STATUSES]).toEqual(["open", "in-progress", "resolved", "closed"])
    expect([...TEAM_ROLES]).toEqual(["Admin", "Manager", "Employee", "Human Resource", "Lead"])
    withEach((t) => {
      expect(ISSUE_STATUSES.map((s) => issueStatusLabel(s, t))).toEqual(["Open", "In progress", "Resolved", "Closed"])
      expect(TEAM_ROLES.map((r) => teamRoleLabel(r, t))).toEqual(["Admin", "Manager", "Employee", "Human Resource", "Lead"])
      expect(issueStatusLabel("weird", t)).toBe("weird")
      expect(teamRoleLabel("Weird", t)).toBe("Weird")
    })
  })
})

describe("every message is routed through t", () => {
  it("a tagging t changes every message and label", () => {
    const strings: unknown[] = []
    const collect = (o: unknown) => {
      if (typeof o === "string") strings.push(o)
      else if (o && typeof o === "object" && !(o instanceof RegExp)) Object.values(o).forEach(collect)
    }
    collect(getOrganizationFormRules(tagT))
    collect(getIssueDetailRules(tagT))
    collect(getTeamFormRules(tagT))
    collect(getUserFormRules(tagT))
    collect(getCoachFormRules(tagT))
    const r = {
      org: getOrganizationFormRules(tagT),
      issue: getIssueDetailRules(tagT),
      team: getTeamFormRules(tagT),
      user: getUserFormRules(tagT),
    }
    strings.push(
      r.org.email.validate("x"),
      r.org.website_url.validate("x y"),
      r.issue.status.validate("zz"),
      r.team.email.validate("x"),
      r.user.email.validate("x"),
      ...ISSUE_STATUSES.map((s) => issueStatusLabel(s, tagT)),
      ...TEAM_ROLES.map((x) => teamRoleLabel(x, tagT)),
    )
    expect(strings.length).toBe(37)
    for (const s of strings) expect(s).toMatch(/^T\[[a-zA-Z.]+\]$/)
    expect(new Set(strings).size).toBe(37)
  })
})
