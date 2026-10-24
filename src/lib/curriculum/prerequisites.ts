import type { Course, Program, Requisite } from "@/types/curriculum"

/**
 * Prerequisite helpers for Administration → Curriculum. Display only — the
 * server decides what is valid (cycles, unknown codes); nothing here refuses.
 */

/** `MAT 121 (min C) or MAT 171; coreq ENG 111` — groups sharing altGroup are alternatives. */
export function formatRequisites(reqs: Requisite[]): string {
  if (reqs.length === 0) return "—"
  const groups = new Map<string, Requisite[]>()
  for (const r of reqs) {
    const key = `${r.kind}:${r.altGroup}`
    groups.set(key, [...(groups.get(key) ?? []), r])
  }
  return [...groups.values()]
    .map((alts) => {
      const text = alts.map((r) => (r.minGrade ? `${r.code} (min ${r.minGrade})` : r.code)).join(" or ")
      return alts[0].kind === "coreq" ? `coreq ${text}` : text
    })
    .join("; ")
}

export type GraphNode = {
  code: string
  title: string
  /** 0 = needs nothing in this graph; n = one step after its deepest prerequisite. */
  depth: number
  /** Named directly by one of the program's requirement groups. */
  inProgram: boolean
}

export type GraphEdge = { from: string; to: string; kind: Requisite["kind"] }

export type ProgramGraph = {
  nodes: GraphNode[]
  edges: GraphEdge[]
  /** Codes a group or prerequisite names that the catalog does not have. */
  missing: string[]
  /** True when a loop was met (the server refuses those; a stored one is still drawn, flat). */
  hasLoop: boolean
}

/**
 * The courses a program's requirement groups name, plus everything they need
 * (prerequisites and corequisites, transitively), laid out by depth.
 *
 * `edges` run prerequisite → course ("from" must come first).
 */
export function buildProgramGraph(program: Program, courses: Course[]): ProgramGraph {
  const byCode = new Map(courses.map((c) => [c.code, c]))
  const direct = new Set(program.requirements.flatMap((g) => g.courses))
  const included = new Set<string>()
  const missing = new Set<string>()
  const queue = [...direct]
  while (queue.length) {
    const code = queue.shift() as string
    if (included.has(code)) continue
    const course = byCode.get(code)
    if (!course) {
      missing.add(code)
      continue
    }
    included.add(code)
    for (const r of course.prerequisites) queue.push(r.code)
  }

  const edges: GraphEdge[] = []
  for (const code of included) {
    for (const r of (byCode.get(code) as Course).prerequisites) {
      if (included.has(r.code)) edges.push({ from: r.code, to: code, kind: r.kind })
    }
  }

  const depth = new Map<string, number>()
  const visiting = new Set<string>()
  let hasLoop = false
  const depthOf = (code: string): number => {
    const known = depth.get(code)
    if (known !== undefined) return known
    if (visiting.has(code)) {
      hasLoop = true
      return 0
    }
    visiting.add(code)
    let d = 0
    for (const r of (byCode.get(code) as Course).prerequisites) {
      if (!included.has(r.code)) continue
      // A corequisite may be taken in the same term, so it does not push a course later.
      d = Math.max(d, depthOf(r.code) + (r.kind === "prereq" ? 1 : 0))
    }
    visiting.delete(code)
    depth.set(code, d)
    return d
  }

  const nodes = [...included]
    .sort()
    .map((code) => ({
      code,
      title: (byCode.get(code) as Course).title,
      depth: depthOf(code),
      inProgram: direct.has(code),
    }))
  return { nodes, edges, missing: [...missing].sort(), hasLoop }
}
