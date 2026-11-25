/**
 * TDS-U8 guard: no page under src/pages/manager that a route mounts renders the
 * "Sample data" PlaceholderBanner.
 *
 * Eight manager routes (hiring, candidates, training, career-mgmt, team-building,
 * leadership, analytics, prism-team) used to render invented people behind that
 * banner, in no menu, one of them reached from the Studio's own "Assign in
 * Training" button. They now redirect to the Studio. This test reads the route
 * table as source, so a page that brings the banner back onto a routed path fails
 * here rather than being found by a manager.
 *
 * Static on purpose: the pages are lazy, and the integration suite stubs every
 * page module, so no rendering test would ever see the banner.
 */
import fs from "node:fs"
import path from "node:path"

const root = path.resolve(__dirname, "../../../..")
const srcRoot = path.join(root, "src")
const routesSource = fs.readFileSync(path.join(srcRoot, "routes.tsx"), "utf8")

/** `const Name = React.lazy(() => import("@/pages/manager/..."))` → Name → module. */
const lazyModules = new Map<string, string>(
  [...routesSource.matchAll(/const (\w+) = React\.lazy\(\s*\(\) =>\s*import\("(@\/pages\/manager\/[^"]+)"\)/g)].map(
    (m) => [m[1], m[2]],
  ),
)

/** Every `{ path: "...", element: ...<Name` whose Name is a pages/manager module. */
const routed: Array<{ routePath: string; component: string; module: string }> = [
  ...routesSource.matchAll(/\{\s*path:\s*"([^"]+)",\s*element:\s*(?:withSuspense\()?<(\w+)/g),
]
  .filter((m) => lazyModules.has(m[2]))
  .map((m) => ({ routePath: m[1], component: m[2], module: lazyModules.get(m[2]) as string }))

function moduleSource(mod: string): string {
  const base = path.join(srcRoot, mod.replace(/^@\//, ""))
  for (const candidate of [`${base}.tsx`, `${base}.ts`, path.join(base, "index.tsx")]) {
    if (fs.existsSync(candidate)) return fs.readFileSync(candidate, "utf8")
  }
  throw new Error(`cannot resolve ${mod}`)
}

describe("TDS-U8: no routed manager page shows the sample-data banner", () => {
  it("reads enough of the route table to mean something", () => {
    // A regex that stops matching would make the per-route cases vacuous.
    expect(lazyModules.size).toBeGreaterThanOrEqual(10)
    expect(routed.length).toBeGreaterThanOrEqual(10)
  })

  it.each(routed.map((r) => [r.routePath, r.component, r.module] as const))(
    "%s (%s) does not import PlaceholderBanner",
    (_routePath, _component, mod) => {
      expect(moduleSource(mod)).not.toMatch(/components\/dashboard\/PlaceholderBanner/)
    },
  )
})
