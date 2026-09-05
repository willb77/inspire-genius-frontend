import { ancestorsOf, buildOrgTree, visibleRows } from "../orgTree"
import type { OrgChartNode } from "@/types/development"

const n = (id: string, managerId: string | null, name = id): OrgChartNode => ({
  id,
  name,
  title: null,
  department: null,
  managerId,
})

/** Everyone in, everyone out — the property that hides all the others. */
function count(roots: ReturnType<typeof buildOrgTree>): number {
  return visibleRows(roots, new Set()).length
}

describe("buildOrgTree", () => {
  it("nests reports under their manager, to any depth", () => {
    const roots = buildOrgTree([n("ceo", null), n("vp", "ceo"), n("ic", "vp")])
    expect(roots).toHaveLength(1)
    expect(roots[0].id).toBe("ceo")
    expect(roots[0].children[0].id).toBe("vp")
    expect(roots[0].children[0].children[0].id).toBe("ic")
    expect(roots[0].children[0].children[0].depth).toBe(2)
  })

  it("returns every person exactly once", () => {
    // The property that hides every other bug here: someone dropped from a
    // chart is invisible, because a chart missing four people looks exactly
    // like a chart of a smaller company.
    const nodes = [n("a", null), n("b", "a"), n("c", "a"), n("d", "b"), n("e", null)]
    const roots = buildOrgTree(nodes)
    expect(count(roots)).toBe(nodes.length)
    const ids = visibleRows(roots, new Set()).map((r) => r.id).sort()
    expect(ids).toEqual(["a", "b", "c", "d", "e"])
  })

  it("terminates on a two-node cycle instead of hanging", () => {
    // `employee_profiles.manager_id` has no constraint forbidding A -> B -> A.
    // The obvious implementation does not return, and a hung render shows the
    // user a frozen tab with no error anywhere.
    const roots = buildOrgTree([n("a", "b"), n("b", "a")])
    expect(count(roots)).toBe(2)
  })

  it("breaks a cycle at ONE deterministic point, not by scattering it", () => {
    // Both members becoming roots would be safe but wrong-looking, and worse,
    // could differ between viewers. The smallest id is lifted; the rest of the
    // chain stays intact.
    const roots = buildOrgTree([n("b", "a"), n("a", "b")])
    expect(roots.map((r) => r.id)).toEqual(["a"])
    expect(roots[0].children.map((c) => c.id)).toEqual(["b"])
    // Same input, other order in — same chart out.
    const other = buildOrgTree([n("a", "b"), n("b", "a")])
    expect(other.map((r) => r.id)).toEqual(["a"])
  })

  it("terminates on a longer cycle", () => {
    const roots = buildOrgTree([n("c", "a"), n("a", "b"), n("b", "c")])
    expect(count(roots)).toBe(3)
    expect(roots).toHaveLength(1)
  })

  it("makes a root of someone whose manager is not in the set", () => {
    // The server already nulls these, so this is belt-and-braces for a stale
    // cache — but silently dropping the subtree is the exact failure that
    // server-side guard exists to prevent, and it is one `?.` away.
    const roots = buildOrgTree([n("a", "GONE"), n("b", "a")])
    expect(count(roots)).toBe(2)
    expect(roots.map((r) => r.id)).toEqual(["a"])
  })

  it("does not blow the stack on a very deep chain", () => {
    // Depth, not cycles. A recursive depth pass overflows here.
    const deep = Array.from({ length: 5000 }, (_, i) =>
      n(`n${i}`, i === 0 ? null : `n${i - 1}`),
    )
    const roots = buildOrgTree(deep)
    expect(count(roots)).toBe(5000)
  })

  it("counts subtree size and marks the viewer", () => {
    const roots = buildOrgTree([n("a", null), n("b", "a"), n("c", "b")], "c")
    expect(roots[0].size).toBe(3)
    const rows = visibleRows(roots, new Set())
    expect(rows.find((r) => r.id === "c")?.isViewer).toBe(true)
    expect(rows.filter((r) => r.isViewer)).toHaveLength(1)
  })

  it("sorts siblings by name so the chart is stable between loads", () => {
    const roots = buildOrgTree([
      n("r", null, "Root"),
      n("z", "r", "Zoe"),
      n("a", "r", "Ada"),
    ])
    expect(roots[0].children.map((c) => c.name)).toEqual(["Ada", "Zoe"])
  })
})

describe("ancestorsOf — rolling up", () => {
  it("returns the chain from the root down to the node's parent", () => {
    const roots = buildOrgTree([n("ceo", null), n("vp", "ceo"), n("ic", "vp")])
    expect(ancestorsOf(roots, "ic").map((a) => a.id)).toEqual(["ceo", "vp"])
  })

  it("is empty for a root and for an unknown id", () => {
    const roots = buildOrgTree([n("ceo", null)])
    expect(ancestorsOf(roots, "ceo")).toEqual([])
    expect(ancestorsOf(roots, "nope")).toEqual([])
    expect(ancestorsOf(roots, null)).toEqual([])
  })
})

describe("visibleRows — rolling down", () => {
  it("hides a collapsed subtree but keeps the node itself", () => {
    const roots = buildOrgTree([n("a", null), n("b", "a"), n("c", "b")])
    const rows = visibleRows(roots, new Set(["b"]))
    expect(rows.map((r) => r.id)).toEqual(["a", "b"])
  })
})
