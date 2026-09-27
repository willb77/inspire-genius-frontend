/**
 * StudioInterviewBody and LiveInterviewBody are forks of one another, and this
 * lane has now shipped the same fix to one and not the other three times —
 * IS-F13, the finalize-error card, and the "Not decided" label. Each time both
 * suites stayed green because only one of them asserted the thing.
 *
 * A source-level check rather than a behavioural one, deliberately: a
 * behavioural test only catches drift on the paths it happens to exercise, and
 * the whole failure mode here is a path nobody exercises in the fork.
 */
import { readFileSync } from "fs"
import { join } from "path"

const DIR = join(__dirname, "..")
const BODIES = ["StudioInterviewBody.tsx", "LiveInterviewBody.tsx"] as const

const source = (name: string) => readFileSync(join(DIR, name), "utf8")

describe("both interview bodies stay in step", () => {
  it.each(BODIES)("%s tells the panel which kind of conversation this is", (body) => {
    expect(source(body)).toMatch(/developmentMode=\{/)
  })

  it("passes a value on each side rather than relying on the default", () => {
    // Studio has a kind selector; Live is always hiring. Both say so out loud,
    // so that removing one is visible here instead of silently defaulting.
    expect(source("StudioInterviewBody.tsx")).toContain("developmentMode={!isHiring}")
    expect(source("LiveInterviewBody.tsx")).toContain("developmentMode={false}")
  })
})


describe("S-3 / D3 — subject_sub is decided in BOTH bodies, out loud", () => {
  it("Studio sends subject_sub only on a development frame", () => {
    expect(source("StudioInterviewBody.tsx")).toContain(
      '...(f.kind === "general" && subject ? { subject_sub: subject } : {})',
    )
  })

  it("Live never sends it, and says so where the payload is built", () => {
    const live = source("LiveInterviewBody.tsx")
    expect(live).toContain("S-3 / D3: NO subject_sub, ever.")
    // No assignment and no picker anywhere in the Live body.
    expect(live).not.toMatch(/subject_sub\s*:/)
    expect(live).not.toContain("InterviewSubjectPicker")
  })
})
