import { readFileSync } from "fs"
import { join } from "path"

/**
 * Source-level guard. Every other test in this file mocks the storage module,
 * so a test CANNOT catch the page importing the wrong one — the mock would
 * simply satisfy whichever module was named. This asserts the import itself.
 *
 * The two modules encrypt differently: storage.ts writes the token and
 * secureStorage.ts cannot read it, returning null instead. That produced a
 * disabled confidential checkbox with no error logged anywhere.
 */
describe("Asset Library pages — token accessor", () => {
  const pages = ["AssetLibrary.tsx", "AssetOpen.tsx"]

  it.each(pages)("%s reads the token from @/lib/storage, not @/lib/secureStorage", (page) => {
    const src = readFileSync(join(__dirname, "..", page), "utf8")
    expect(src).toContain('from "@/lib/storage"')
    expect(src).not.toContain("@/lib/secureStorage")
    expect(src).toContain("getToken()")
  })
})
