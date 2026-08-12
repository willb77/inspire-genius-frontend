/**
 * `isVerticalForceDisabled` — the shared lever every Job Fit entry point
 * consults (2026-08-05).
 *
 * The sidebar was switched off first, and Job Fit stayed one click away from
 * Home and the Meridian header because those gate on entitlement alone. These
 * pin the helper those surfaces now share, so a future entry point has an
 * obvious thing to call instead of re-deriving the rule.
 *
 * 2026-08-11 — the set is EMPTY: Job Fit was switched back on and nothing else
 * ever joined it. The helper is kept (it is the only lever that can override
 * entitlement) and so are these tests, which now pin that it overrides nothing.
 * A future addition to the set makes the "nothing is force-disabled" test fail
 * loudly, which is the intended prompt to re-read the mechanism.
 */
import {
  isVerticalForceDisabled,
  FORCE_DISABLED_VERTICALS,
  WORKSPACE_VERTICALS,
  HIDDEN_VERTICALS,
} from "../useVerticalLauncher"

describe("isVerticalForceDisabled", () => {
  it("reports nothing as switched off — the set is empty", () => {
    expect(FORCE_DISABLED_VERTICALS.size).toBe(0)
  })

  it("no longer switches off job-fit", () => {
    // Was `true` from 2026-08-04 to 2026-08-11. Entitlement decides it now.
    expect(isVerticalForceDisabled("job-fit")).toBe(false)
  })

  it("does not touch other verticals", () => {
    for (const key of ["lumen", "grant", "direction-setting", "knowledge-continuity"]) {
      expect(isVerticalForceDisabled(key)).toBe(false)
    }
  })

  it("is safe for an unregistered key", () => {
    // Callers pass a plain string from their own link tables.
    expect(isVerticalForceDisabled("not-a-vertical")).toBe(false)
    expect(isVerticalForceDisabled("")).toBe(false)
  })

  it("agrees with the underlying set", () => {
    for (const key of FORCE_DISABLED_VERTICALS) {
      expect(isVerticalForceDisabled(key)).toBe(true)
    }
  })
})

describe("the three gating mechanisms stay distinct", () => {
  it("force-disabled is not the same thing as hidden", () => {
    // Hidden removes the entry; force-disabled greys one that is still listed.
    // Collapsing them would silently delete Job Fit from the menu instead of
    // showing it as off.
    for (const key of FORCE_DISABLED_VERTICALS) {
      expect(HIDDEN_VERTICALS.has(key)).toBe(false)
    }
  })

  it("job-fit stays a WORKSPACE vertical while switched off", () => {
    // If it dropped out of WORKSPACE_VERTICALS it would fall through to the
    // Tools rollup and reappear there — visible in a second place, and in the
    // wrong one.
    expect(WORKSPACE_VERTICALS.has("job-fit")).toBe(true)
  })
})
