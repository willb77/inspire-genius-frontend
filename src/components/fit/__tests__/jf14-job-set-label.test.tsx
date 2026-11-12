/**
 * @jest-environment jsdom
 *
 * JF-14 — Local job sets: a ranked row says "Local" or "National" when, and
 * only when, the server sent `jobSet` for it.
 *
 * The server (blueprint-service `/fit/matches`) sends `jobSet` only when the
 * caller's organisation has a local job set and `job_fit_v2` applies; it also
 * does the ordering. This component never reorders (FIT-3-F1, decision 7) and
 * never decides who is local — it renders the field it was given.
 *
 * Off-state: the goldens under `__golden_jf14__/jf14-*.html` were recorded on the
 * base sha, before any JF-14 source change, from rows WITHOUT `jobSet`
 * (first committed under `__golden__/`, moved byte-for-byte to `__golden_jf14__/`). Every
 * later commit must leave them byte-identical. (The FIT-5 goldens in
 * `fit5-golden.test.tsx` already pin every page's list without the key.)
 *
 * To re-record (only ever on the base, before a source change):
 *   JF14_GOLDEN_WRITE=1 npx jest src/components/fit/__tests__/jf14-job-set-label.test.tsx
 */
import fs from "fs"
import path from "path"
import { render, screen, within } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import type { FitMatch } from "@/types/job-fit"
import { FitMatchList } from "@/components/fit/FitMatchList"

// Its own directory: FIT-5's suite owns `__golden__/` and checks it has no orphans.
const GOLDEN_DIR = path.join(__dirname, "__golden_jf14__")
const WRITE = process.env.JF14_GOLDEN_WRITE === "1"

function match(jobId: string, roleTitle: string, fitScore: number, extra: Record<string, unknown> = {}): FitMatch {
  return {
    jobId,
    roleTitle,
    department: jobId === "a1" ? "Operations" : null,
    tier: "potential-fit",
    baseTier: "potential-fit",
    fitBand: "Good",
    totalVariation: 40,
    behaviorVariation: 10,
    aptitudeVariation: 15,
    coreTraitVariation: 15,
    confidence: null,
    fitScore,
    method: "gap",
    criticalGapCount: jobId === "n2" ? 2 : 0,
    ...extra,
  } as FitMatch
}

/** Today's rows: no `jobSet` anywhere. */
const TODAY: FitMatch[] = [
  match("n1", "Registered Nurse", 84),
  match("a1", "Forklift Operator — Wake County", 79),
  match("n2", "Electrician", 71),
]

/** The same rows as the server sends them when the org has a local job set. */
const WITH_SET: FitMatch[] = [
  match("a1", "Forklift Operator — Wake County", 79, { jobSet: "local" }),
  match("n1", "Registered Nurse", 84, { jobSet: "national" }),
  match("n2", "Electrician", 71, { jobSet: "national" }),
]

type Variant = "career" | "ds" | "recorded"

function draw(variant: Variant, matches: FitMatch[]) {
  const list =
    variant === "ds" ? (
      <FitMatchList variant="ds" matches={matches} selectedId={matches[0]?.jobId ?? null} onSelect={() => {}} />
    ) : variant === "career" ? (
      <FitMatchList variant="career" matches={matches} />
    ) : (
      <FitMatchList variant="recorded" matches={matches} />
    )
  return render(<MemoryRouter>{list}</MemoryRouter>)
}

describe("JF-14 off-state: rows without jobSet are today's rows", () => {
  it.each<Variant>(["career", "ds", "recorded"])("%s list is byte-identical to the base golden", (variant) => {
    const { container } = draw(variant, TODAY)
    const file = path.join(GOLDEN_DIR, `jf14-${variant}-no-job-set.html`)
    if (WRITE) {
      fs.writeFileSync(file, container.innerHTML + "\n")
      return
    }
    expect(container.innerHTML + "\n").toBe(fs.readFileSync(file, "utf8"))
    expect(screen.queryByText("Local")).toBeNull()
    expect(screen.queryByText("National")).toBeNull()
  })
})

describe("JF-14 on: each row says which job set it is from", () => {
  it.each<Variant>(["career", "ds", "recorded"])("%s rows carry Local / National, in the server's order", (variant) => {
    const { container } = draw(variant, WITH_SET)
    const labels = Array.from(container.querySelectorAll("[data-job-set]")).map((el) => [
      el.getAttribute("data-job-set"),
      el.textContent,
    ])
    expect(labels).toEqual([
      ["local", "Local"],
      ["national", "National"],
      ["national", "National"],
    ])
    // The list never reorders: the server's local-first order is the order drawn.
    const titles = WITH_SET.map((m) => m.roleTitle)
    const drawn = titles.map((t) => container.innerHTML.indexOf(t))
    expect([...drawn].sort((a, b) => a - b)).toEqual(drawn)
    // The label sits in its own row, beside that row's title.
    const localRow = screen.getByText("Forklift Operator — Wake County").closest(variant === "career" ? "a" : "li")
    expect(localRow).not.toBeNull()
    expect(within(localRow as HTMLElement).getByText("Local")).toBeTruthy()
    expect(within(localRow as HTMLElement).queryByText("National")).toBeNull()
  })

  it("removing jobSet from every row gives back today's row exactly", () => {
    const stripped = WITH_SET.map((m) => {
      const copy: FitMatch = { ...m }
      delete copy.jobSet
      return copy
    })
    const { container } = draw("career", [stripped[1], stripped[0], stripped[2]])
    expect(container.innerHTML + "\n").toBe(
      fs.readFileSync(path.join(GOLDEN_DIR, "jf14-career-no-job-set.html"), "utf8"),
    )
  })

  it("an unknown jobSet value draws nothing", () => {
    draw("career", [match("x", "Welder", 60, { jobSet: "regional" })])
    expect(screen.queryByText("Local")).toBeNull()
    expect(screen.queryByText("National")).toBeNull()
    expect(screen.queryByText("regional")).toBeNull()
  })
})
