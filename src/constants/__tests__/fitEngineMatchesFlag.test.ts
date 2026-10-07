/**
 * 3.3a — `VITE_FEATURE_FIT_ENGINE_MATCHES` must default OFF.
 *
 * One frontend deploy reaches both tiers, and staging-b's growth-service has no
 * `/fit-matches` route until step 1.2's promote. If this flag defaulted on, the
 * Careers tab on staging-b would ask a route that does not exist and show
 * "couldn't be loaded" to every manager. Read at module load, so each case
 * re-imports (same reason as tdsStudioFlag.test.ts).
 */
const KEY = "VITE_FEATURE_FIT_ENGINE_MATCHES"

async function load(value: string | undefined) {
  jest.resetModules()
  if (value === undefined) delete process.env[KEY]
  else process.env[KEY] = value
  const mod = await import("../development")
  return mod.FIT_ENGINE_MATCHES_ENABLED
}

const original = process.env[KEY]
afterAll(() => {
  if (original === undefined) delete process.env[KEY]
  else process.env[KEY] = original
})

it("is off when the variable is absent", async () => {
  await expect(load(undefined)).resolves.toBe(false)
})

it.each(["false", "", "1", "yes", "TRUE", "true "])(
  "is off for %p — only the literal 'true' enables it",
  async (value) => {
    // The dev build writes `${{ vars.DEV_FIT_ENGINE_MATCHES }}`, which is ""
    // while the variable is unset. That must read as off.
    await expect(load(value)).resolves.toBe(false)
  },
)

it("is on only for the literal 'true'", async () => {
  await expect(load("true")).resolves.toBe(true)
})
