import { readFileSync } from "fs"
import { join } from "path"

/**
 * Import-order guard: ES imports are hoisted and run in source order, so
 * zodConfig must be main.tsx's FIRST import or an earlier module can construct
 * a zod schema before jitless is set (and zod then probes `new Function`).
 */
describe("main.tsx import order", () => {
  it("imports ./lib/zodConfig before every other import", () => {
    const src = readFileSync(join(__dirname, "..", "main.tsx"), "utf8")
    const imports = src
      .split("\n")
      .map((l) => l.match(/^\s*import\s+(?:[^'"]*from\s+)?['"]([^'"]+)['"]/))
      .filter((m): m is RegExpMatchArray => m !== null)
      .map((m) => m[1])
    expect(imports.length).toBeGreaterThan(1)
    expect(imports[0]).toBe("./lib/zodConfig")
  })
})
