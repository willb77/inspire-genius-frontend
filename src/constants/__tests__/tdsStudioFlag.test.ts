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

it("has no notes tab — its store is not merged", async () => {
  // Phase 4. A tab whose backend does not exist saves nothing while looking as
  // though it had, which is the exact failure this codebase keeps hitting.
  jest.resetModules()
  const { DEV_TEXT } = await import("../development")
  expect(DEV_TEXT["dev.tab.notes"]).toBeUndefined()
})
