import { readFileSync, readdirSync } from "node:fs"
import { join } from "node:path"

/**
 * Every Knowledge Continuity hook that calls the trainer-service continuity
 * routes and shows an error toast must route that error through the 403 check,
 * so a refusal reads "you don't have access" instead of "please try again".
 *
 * Static, not behavioural: a behavioural test covers only the hooks it
 * exercises, and a hook added later with a bare `toast.error("…")` would pass
 * every other test while telling a refused user to keep retrying.
 */
const DIR = join(__dirname, "..")

// Hooks on the agent-engine routes (capture.service) are outside this check:
// their 403 is a role gate, not an organisation refusal.
const TRAINER_SERVICE = /@\/services\/knowledge-continuity\/continuity\.service/

const hooks = readdirSync(DIR)
  .filter((f) => f.endsWith(".ts") && !f.endsWith(".d.ts"))
  .map((f) => ({ file: f, src: readFileSync(join(DIR, f), "utf8") }))
  .filter(({ src }) => TRAINER_SERVICE.test(src) && /onError\s*:/.test(src))

describe("KCE hooks render a 403 honestly", () => {
  test("the walker found the hooks it is meant to check", () => {
    // 11 bare-toast hooks were converted, plus useStartCaptureSession. A walker
    // that matched nothing would pass vacuously.
    expect(hooks.length).toBeGreaterThanOrEqual(12)
  })

  test.each(hooks.map((h) => [h.file, h.src] as const))(
    "%s checks for an access refusal before its generic toast",
    (_file, src) => {
      expect(src).toMatch(/kceErrorMessage\(|isKceAccessDenied\(/)
      // A bare literal toast in the handler is allowed only after an explicit
      // 403 branch (useStartCaptureSession's generic fallback).
      const handler = src.slice(src.search(/onError\s*:/))
      const bare = handler.search(/toast\.error\(\s*"[^"]*"\s*\)/)
      if (bare >= 0) {
        const guard = handler.search(/isKceAccessDenied\(/)
        expect(guard).toBeGreaterThanOrEqual(0)
        expect(guard).toBeLessThan(bare)
      }
    }
  )
})
