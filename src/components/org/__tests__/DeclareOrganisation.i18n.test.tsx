/**
 * @jest-environment jsdom
 *
 * A10: DeclareOrganisation's wording moved into the `orgUi` namespace. English must not move.
 *
 *  1. Static: every t("key", { defaultValue }) in the component has an `orgUi` key whose English
 *     equals the default, and no `orgUi` key is unused. (The jest react-i18next mock ignores
 *     defaults, so without this a wrong default would be invisible to every render test.)
 *  2. Rendered: the original English strings, hard-coded here, appear for each state.
 */
import fs from "node:fs"
import path from "node:path"
import { render, screen } from "@testing-library/react"

import { DeclareOrganisation } from "../DeclareOrganisation"
import en from "../../../../public/locales/en/orgUi.json"

const mockCreate = { mutate: jest.fn(), isPending: false }
let mockMine: { data: unknown; isLoading: boolean } = { data: null, isLoading: false }
jest.mock("@/hooks/org/useOrgMembership", () => ({
  useMyJoinRequest: () => mockMine,
  useCreateJoinRequest: () => mockCreate,
}))

beforeEach(() => {
  mockMine = { data: null, isLoading: false }
  mockCreate.isPending = false
})

function flatten(o: Record<string, unknown>, prefix = ""): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [k, v] of Object.entries(o)) {
    const key = prefix ? `${prefix}.${k}` : k
    if (v && typeof v === "object") Object.assign(out, flatten(v as Record<string, unknown>, key))
    else out[key] = String(v)
  }
  return out
}

describe("DeclareOrganisation i18n wiring", () => {
  const source = fs.readFileSync(path.join(__dirname, "..", "DeclareOrganisation.tsx"), "utf8")
  const calls = [...source.matchAll(/\bt\(\s*"([^"]+)"\s*,\s*\{\s*defaultValue:\s*("(?:[^"\\]|\\.)*")\s*\}\s*\)/g)].map(
    (m) => [m[1], JSON.parse(m[2]) as string] as const,
  )
  const flat = flatten(en)

  it("finds every t() call (a regex that matches nothing would pass vacuously)", () => {
    expect(calls.length).toBe(Object.keys(flat).length)
    expect(calls.length).toBeGreaterThanOrEqual(14)
  })

  it.each(calls)("default for %s equals the English file", (key, def) => {
    expect(flat[key]).toBe(def)
  })

  it("has no orphan keys in the English file", () => {
    expect(Object.keys(flat).sort()).toEqual(calls.map(([k]) => k).sort())
  })
})

describe("DeclareOrganisation English wording is unchanged", () => {
  it("loading", () => {
    mockMine = { data: null, isLoading: true }
    render(<DeclareOrganisation />)
    expect(screen.getByText("Checking your organisation…")).toBeInTheDocument()
  })

  it("pending", () => {
    mockMine = { data: { status: "pending" }, isLoading: false }
    render(<DeclareOrganisation />)
    expect(screen.getByText("Waiting for approval")).toBeInTheDocument()
    expect(
      screen.getByText(
        "You asked to join this organisation. A manager has to approve it before you can see your team's data — until then, those pages will be empty.",
      ),
    ).toBeInTheDocument()
  })

  it("approved", () => {
    mockMine = { data: { status: "approved" }, isLoading: false }
    render(<DeclareOrganisation />)
    expect(screen.getByText("You're in")).toBeInTheDocument()
    expect(
      screen.getByText(
        "Your membership was approved. Sign out and back in if your pages still look empty — your access is refreshed when you next sign in.",
      ),
    ).toBeInTheDocument()
  })

  it("rejected, with the form and Skip", () => {
    mockMine = { data: { status: "rejected", decision_reason: "Wrong org" }, isLoading: false }
    render(<DeclareOrganisation onDone={() => undefined} />)
    expect(screen.getByText("That request wasn't approved")).toBeInTheDocument()
    expect(screen.getByText("Wrong org")).toBeInTheDocument()
    expect(screen.getByText("You can ask again below.")).toBeInTheDocument()
    expect(screen.getByText("Which organisation are you with?")).toBeInTheDocument()
    expect(screen.getByText("Your manager will confirm this before it takes effect.")).toBeInTheDocument()
    expect(screen.getByPlaceholderText("Organisation ID from your invitation")).toBeInTheDocument()
    expect(
      screen.getByPlaceholderText("Anything that helps them recognise you — your team, your start date (optional)"),
    ).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Send request" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Skip for now" })).toBeInTheDocument()
  })

  it("sending", () => {
    mockCreate.isPending = true
    render(<DeclareOrganisation />)
    expect(screen.getByRole("button", { name: "Sending…" })).toBeInTheDocument()
  })
})
