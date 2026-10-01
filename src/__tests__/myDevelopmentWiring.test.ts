/**
 * @jest-environment node
 *
 * `/my/development` wiring, enforced over the source and the shipped locales.
 *
 * Static rather than behavioural, for the reason every guard in this repo is:
 * each of these failures renders as something plausible. A route constant that
 * disagrees with `routes.tsx` gives a nav row that 404s; a locale key missing
 * from one of the 21 files shows that language the raw key; a second reader of
 * `/me/goal-reviews` gives two caches that can disagree about what a coach
 * said, and the person sees whichever one their route happened to warm.
 */
import fs from "fs"
import path from "path"

const SRC = path.resolve(__dirname, "..")
const REPO = path.resolve(SRC, "..")

const read = (rel: string) => fs.readFileSync(path.join(SRC, rel), "utf-8")

describe("the route", () => {
  it("is declared once and spelled the same in routes.tsx", () => {
    // `routes.tsx` spells its paths literally (nothing in it imports ROUTES),
    // so the constant and the router are two copies of one string.
    expect(read("constants/routes.ts")).toContain('MY_DEVELOPMENT: "/my/development"')
    expect(read("routes.tsx")).toContain('{ path: "/my/development"')
  })

  it("carries no role prefix, so ProtectedRoute lets a plain user through", () => {
    // ProtectedRoute gates role-prefixed paths only. A `/manager/*` spelling
    // would be a live-looking nav row that bounces the account the page is for.
    const line = read("constants/routes.ts")
      .split("\n")
      .find((l) => l.includes("MY_DEVELOPMENT:"))
    expect(line).toBeDefined()
    for (const prefix of ["/manager", "/company-admin", "/practitioner", "/distributor", "/super-admin"]) {
      expect(line).not.toContain(prefix)
    }
  })
})

describe("the goal-reviews read", () => {
  it("has exactly one reader, the hook that already owned it", () => {
    // `getMyGoalReviews` may be named by the service that defines it and by
    // `useMyGoalReviews`. Anything else is a second reader of one route.
    const allowed = new Set([
      path.join("services", "manager", "development", "growthService.ts"),
      path.join("hooks", "summit", "useMyGoals.ts"),
    ])
    const offenders: string[] = []
    for (const file of sourceFiles(SRC)) {
      const rel = path.relative(SRC, file)
      if (allowed.has(rel)) continue
      if (fs.readFileSync(file, "utf-8").includes("getMyGoalReviews")) offenders.push(rel)
    }
    expect(offenders).toEqual([])
  })

  it("is consumed by the reviews section through that hook", () => {
    // The positive control for the assertion above: without it, deleting the
    // section entirely would also make that test pass.
    expect(read(path.join("components", "user", "development", "MyReviewsSection.tsx"))).toContain(
      'useMyGoalReviews } from "@/hooks/summit/useMyGoals"',
    )
  })
})

describe("the Home quick action's locale key", () => {
  const LOCALES = path.join(REPO, "public", "locales")

  it("exists in all 21 shipped dashboard.json files", () => {
    const dirs = fs
      .readdirSync(LOCALES, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name)
    expect(dirs).toHaveLength(21)
    for (const lang of dirs) {
      const file = path.join(LOCALES, lang, "dashboard.json")
      const json = JSON.parse(fs.readFileSync(file, "utf-8")) as {
        homeV2?: Record<string, string>
      }
      // Same pattern as `quickGoals`, which carries the untranslated English
      // string in all 21 files today. Inventing translations here would be
      // worse than the English fallback.
      expect(json.homeV2?.quickMyDevelopment).toBe("My development")
    }
  })

  it("is the key HomeV2 actually asks for", () => {
    const home = read(path.join("pages", "user", "HomeV2.tsx"))
    expect(home).toContain('labelKey: "homeV2.quickMyDevelopment"')
    // `vertical: null` is what makes the pill base product: `entitled` is then
    // true for everybody, so it never renders greyed with a lock reason that
    // would be a lie.
    const block = home.slice(home.indexOf('key: "my-development"'))
    expect(block.slice(0, 400)).toContain("vertical: null")
  })
})

describe("no stubbed section", () => {
  it("names no Targets, Roadmaps or Practice component anywhere in the page tree", () => {
    const page = read(path.join("pages", "user", "MyDevelopment.tsx"))
    // A populated control, so this is not an assertion over an empty set.
    expect(page).toContain("<MyGapsSection />")
    for (const absent of ["<MyTargetsSection", "<MyRoadmapsSection", "<MyPracticeSection"]) {
      expect(page).not.toContain(absent)
    }
    expect(fs.existsSync(path.join(SRC, "components", "user", "development", "MyTargetsSection.tsx"))).toBe(false)
    expect(fs.existsSync(path.join(SRC, "components", "user", "development", "MyPracticeSection.tsx"))).toBe(false)
  })
})

function sourceFiles(dir: string, acc: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === "__tests__") continue
      sourceFiles(full, acc)
    } else if (/\.tsx?$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name)) {
      acc.push(full)
    }
  }
  return acc
}
