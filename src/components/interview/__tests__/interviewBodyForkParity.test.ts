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

/**
 * S4b — the one build behind the interview switch keeps both rules out loud,
 * per source. The side-by-side suite proves the request bodies match the old
 * bodies; these lines make removing a rule visible in review.
 */
describe("S4b — the one build keeps the D3 rule per source", () => {
  const run = readFileSync(join(DIR, "house", "run", "InterviewRunBody.tsx"), "utf8")
  const between = (from: string, to: string) => run.slice(run.indexOf(from), run.indexOf(to))

  it("the hiring (star) create body never carries subject_sub", () => {
    const star = between("const createStar", "/** Byte-for-byte Studio")
    expect(star.length).toBeGreaterThan(100)
    expect(star).not.toMatch(/subject_sub/)
  })

  it("the custom create body sends subject_sub only on a development frame", () => {
    expect(between("const createCustom", "const handleFrameConfirm")).toContain(
      '...(f.kind === "general" && subject ? { subject_sub: subject } : {})',
    )
  })

  it("pipeline steps are written on the hiring source only", () => {
    expect(run).toContain('if (source !== "star") return')
  })
})
