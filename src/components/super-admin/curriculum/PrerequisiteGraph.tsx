import { useMemo, useState } from "react"
import { Label } from "@/components/ui/label"
import { buildProgramGraph } from "@/lib/curriculum/prerequisites"
import type { Course, Program } from "@/types/curriculum"

const NODE_W = 128
const NODE_H = 40
const COL_GAP = 64
const ROW_GAP = 16
const PAD = 12

/**
 * A program's prerequisite graph: the courses its requirement groups name and
 * everything they need, in columns by how many terms of prerequisites sit
 * before them. Solid arrows are prerequisites (done before); dashed are
 * corequisites (same term allowed). Drawn from the catalog already loaded —
 * no request of its own.
 */
export function PrerequisiteGraph({ programs, courses }: { programs: Program[]; courses: Course[] }) {
  const [code, setCode] = useState(programs[0]?.code ?? "")
  const program = programs.find((p) => p.code === code) ?? programs[0]
  const graph = useMemo(() => (program ? buildProgramGraph(program, courses) : null), [program, courses])

  if (!program || !graph) {
    return (
      <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
        Add a program to see its prerequisite graph.
      </p>
    )
  }

  const columns: string[][] = []
  for (const n of graph.nodes) (columns[n.depth] ??= []).push(n.code)
  const pos = new Map<string, { x: number; y: number }>()
  columns.forEach((col, d) =>
    (col ?? []).forEach((c, i) => pos.set(c, { x: PAD + d * (NODE_W + COL_GAP), y: PAD + i * (NODE_H + ROW_GAP) }))
  )
  const width = PAD * 2 + Math.max(1, columns.length) * NODE_W + Math.max(0, columns.length - 1) * COL_GAP
  const height = PAD * 2 + Math.max(1, ...columns.map((c) => (c ?? []).length)) * (NODE_H + ROW_GAP) - ROW_GAP
  const byCode = new Map(graph.nodes.map((n) => [n.code, n]))

  return (
    <div className="space-y-3">
      <div className="max-w-sm">
        <Label htmlFor="graph-program">Program</Label>
        <select
          id="graph-program"
          className="h-9 w-full rounded-md border border-input bg-transparent px-2 text-sm"
          value={program.code}
          onChange={(e) => setCode(e.target.value)}
        >
          {programs.map((p) => (
            <option key={p.code} value={p.code}>
              {p.code} — {p.title}
            </option>
          ))}
        </select>
      </div>

      {graph.nodes.length === 0 ? (
        <p className="text-sm text-muted-foreground">This program's requirement groups name no courses yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border bg-white p-2">
          <svg
            role="img"
            aria-label={`Prerequisite graph for ${program.code}`}
            width={width}
            height={height}
            viewBox={`0 0 ${width} ${height}`}
          >
            <defs>
              <marker id="cur-arrow" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="6" markerHeight="6" orient="auto">
                <path d="M0,0 L10,5 L0,10 z" fill="#64748b" />
              </marker>
            </defs>
            {graph.edges.map((e) => {
              const a = pos.get(e.from)
              const b = pos.get(e.to)
              if (!a || !b) return null
              return (
                <line
                  key={`${e.from}->${e.to}-${e.kind}`}
                  x1={a.x + NODE_W}
                  y1={a.y + NODE_H / 2}
                  x2={b.x}
                  y2={b.y + NODE_H / 2}
                  stroke="#64748b"
                  strokeDasharray={e.kind === "coreq" ? "4 3" : undefined}
                  markerEnd="url(#cur-arrow)"
                />
              )
            })}
            {graph.nodes.map((n) => {
              const p = pos.get(n.code) as { x: number; y: number }
              return (
                <g key={n.code}>
                  <title>{`${n.code} — ${n.title}`}</title>
                  <rect
                    x={p.x}
                    y={p.y}
                    width={NODE_W}
                    height={NODE_H}
                    rx={6}
                    fill={n.inProgram ? "#e0f2fe" : "#f1f5f9"}
                    stroke={n.inProgram ? "#0284c7" : "#94a3b8"}
                  />
                  <text x={p.x + NODE_W / 2} y={p.y + NODE_H / 2 + 4} textAnchor="middle" fontSize="12" fill="#0f172a">
                    {n.code}
                  </text>
                </g>
              )
            })}
          </svg>
        </div>
      )}

      {graph.edges.length > 0 && (
        <ul aria-label="Prerequisite links" className="list-disc pl-5 text-sm">
          {graph.edges.map((e) => (
            <li key={`${e.from}->${e.to}-${e.kind}`}>
              {e.to} {e.kind === "coreq" ? "is taken with" : "needs"} {e.from}
              {byCode.get(e.from)?.inProgram ? "" : " (not itself in a requirement group)"}
            </li>
          ))}
        </ul>
      )}
      {graph.missing.length > 0 && (
        <p role="alert" className="text-sm text-red-700">
          Not in this catalog: {graph.missing.join(", ")}
        </p>
      )}
      {graph.hasLoop && (
        <p role="alert" className="text-sm text-red-700">
          This program contains a requirement loop; the publish check names it.
        </p>
      )}
      <p className="text-xs text-muted-foreground">
        Blue: named by a requirement group. Grey: needed only as a prerequisite. Dashed: corequisite.
      </p>
    </div>
  )
}

export default PrerequisiteGraph
