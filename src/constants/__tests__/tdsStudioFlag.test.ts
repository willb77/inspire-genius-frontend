/**
 * `VITE_FEATURE_TDS_STUDIO` must default OFF.
 *
 * The flag is read once at module load, so each case re-imports the module
 * with `jest.resetModules()`. Reading it at load is deliberate — a build-time
 * constant cannot be flipped by a user — but it means a test that set the env
 * var after the first import would silently assert nothing.
 */
const KEY = "VITE_FEATURE_TDS_STUDIO"

async function load(value: string | undefined) {
  jest.resetModules()
  if (value === undefined) delete process.env[KEY]
  else process.env[KEY] = value
  const mod = await import("../development")
  return mod.TDS_STUDIO_ENABLED
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
    // An allowlist, not a denylist: a typo in a deploy's env must fail closed.
    await expect(load(value)).resolves.toBe(false)
  },
)

it("is on only for the literal 'true'", async () => {
  await expect(load("true")).resolves.toBe(true)
})

it("names the three Studio tabs so they cannot render an empty label", async () => {
  jest.resetModules()
  const { DEV_TEXT } = await import("../development")
  expect(DEV_TEXT["dev.tab.profileStudio"]).toBeTruthy()
  expect(DEV_TEXT["dev.tab.compare"]).toBeTruthy()
  expect(DEV_TEXT["dev.tab.scenarios"]).toBeTruthy()
})

/**
 * Replaces "has no notes tab — its store is not merged" (TDS-2, 2026-09-29).
 *
 * That assertion was a tripwire over a deferred package: the notes store did not
 * exist, and a tab whose backend does not exist saves nothing while looking as
 * though it had. The store is now built and merged — `growth-service`
 * `GET/POST/PATCH/DELETE /v1/growth/members/{id}/notes` — so the premise the
 * tripwire guarded is withdrawn, and leaving it would have made a green test
 * defend the absence of a shipped feature.
 *
 * What stays is the part that was never about the store: a tab that renders must
 * have a label. The Notes tab is a BASE tab, so — unlike the three above — it is
 * not behind `TDS_STUDIO_ENABLED`, and an unnamed one would render a blank
 * button for every manager.
 */
it("names the Notes tab, which is a base tab and not behind the Studio flag", async () => {
  jest.resetModules()
  const { DEV_TEXT } = await import("../development")
  expect(DEV_TEXT["dev.tab.notes"]).toBeTruthy()
})
