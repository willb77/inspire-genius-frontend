import type { OrgChartNode } from "@/types/development"

/** A node with its children resolved, ready to render. */
export type OrgTreeNode = OrgChartNode & {
  children: OrgTreeNode[]
  /** 0 for a root. Used for indentation and for the "roll up" breadcrumb. */
  depth: number
  isViewer: boolean
  /** Total people at or below this node, the viewer excluded from nothing. */
  size: number
}

/**
 * Assemble flat nodes into a reporting tree.
 *
 * Pure, and separate from the component, because the hazard here is not visual.
 * `employee_profiles.manager_id` carries no constraint preventing A -> B -> A,
 * and the obvious implementation — follow `managerId` upward, or recurse into
 * children — does not terminate on one. A hung render is the failure mode; the
 * user sees a frozen tab and no error anywhere.
 *
 * Three properties this guarantees, in order of how quietly they would break:
 *
 * 1. **Every node is returned exactly once.** Whoever is dropped is invisible —
 *    a chart missing four people looks like a smaller company, not a bug. The
 *    count is asserted in the tests against the input length.
 * 2. **Cycles terminate.** A cycle is broken at its lexicographically smallest
 *    id, which is deterministic (so two viewers see the same chart) and keeps
 *    the rest of the chain intact, rather than scattering everyone in the cycle
 *    to the root.
 * 3. **An unknown parent makes a root, not an orphan.** The server already
 *    nulls managers outside the returned set, so this is belt-and-braces for a
 *    stale cache — but silently dropping the subtree is exactly the failure
 *    that guard exists to prevent, and it is one `?.` away.
 */
export function buildOrgTree(
  nodes: OrgChartNode[],
  viewerId?: string | null,
): OrgTreeNode[] {
  const byId = new Map(nodes.map((n) => [n.id, n]))

  /** The parent to actually use: null for a root, for an unknown id, or to break a cycle. */
  function effectiveParent(node: OrgChartNode): string | null {
    const parent = node.managerId
    if (!parent || parent === node.id || !byId.has(parent)) return null

    // Walk up until we reach a root, leave the set, or come back here. The step
    // cap is a second belt: a malformed map cannot spin even if the visited set
    // is somehow defeated.
    const seen = new Set<string>([node.id])
    let cursor: string | null = parent
    for (let step = 0; cursor && step <= nodes.length; step++) {
      if (seen.has(cursor)) {
        // `node` sits in a cycle. Break it at one deterministic point so every
        // viewer sees the same shape, and so only ONE member of the cycle is
        // lifted to the root rather than all of them.
        const ring = [...seen]
        return node.id === ring.sort()[0] ? null : parent
      }
      seen.add(cursor)
      cursor = byId.get(cursor)?.managerId ?? null
    }
    return parent
  }

  const built = new Map<string, OrgTreeNode>(
    nodes.map((n) => [
      n.id,
      { ...n, children: [], depth: 0, isViewer: n.id === viewerId, size: 1 },
    ]),
  )

  const roots: OrgTreeNode[] = []
  for (const node of nodes) {
    const self = built.get(node.id) as OrgTreeNode
    const parentId = effectiveParent(node)
    if (parentId === null) roots.push(self)
    else (built.get(parentId) as OrgTreeNode).children.push(self)
  }

  // Depth and subtree size, iteratively. A recursive pass here would reintroduce
  // the stack overflow the cycle-breaking above exists to prevent, on a chart
  // that is merely very deep rather than cyclic.
  const order: OrgTreeNode[] = []
  const stack = [...roots]
  while (stack.length) {
    const n = stack.pop() as OrgTreeNode
    order.push(n)
    n.children.sort((a, b) => a.name.localeCompare(b.name))
    for (const c of n.children) {
      c.depth = n.depth + 1
      stack.push(c)
    }
  }
  for (let i = order.length - 1; i >= 0; i--) {
    const n = order[i]
    n.size = 1 + n.children.reduce((t, c) => t + c.size, 0)
  }

  roots.sort((a, b) => b.size - a.size || a.name.localeCompare(b.name))
  return roots
}

/**
 * The chain from a node up to its root, nearest ancestor last — "roll up".
 *
 * Iterative, like everything else here. A recursive walk is the natural way to
 * write this and it overflows on a deep chain, which is a class of failure the
 * cycle-breaking above does nothing to prevent: the tree is perfectly valid,
 * just tall.
 */
export function ancestorsOf(
  roots: OrgTreeNode[],
  id: string | null | undefined,
): OrgTreeNode[] {
  if (!id) return []
  const parentOf = new Map<string, OrgTreeNode>()
  const stack = [...roots]
  while (stack.length) {
    const node = stack.pop() as OrgTreeNode
    for (const child of node.children) {
      parentOf.set(child.id, node)
      stack.push(child)
    }
  }
  const path: OrgTreeNode[] = []
  const seen = new Set<string>([id])
  let cursor = parentOf.get(id)
  while (cursor && !seen.has(cursor.id)) {
    path.unshift(cursor)
    seen.add(cursor.id)
    cursor = parentOf.get(cursor.id)
  }
  return path
}

/**
 * Flatten to a render list, honouring which subtrees are collapsed — "roll down".
 *
 * Iterative for the same reason. This function was written recursively first
 * and the 5,000-deep test caught it immediately: `buildOrgTree` had been made
 * iterative and this had not, so the hazard simply moved one function along.
 */
export function visibleRows(
  roots: OrgTreeNode[],
  collapsed: ReadonlySet<string>,
): OrgTreeNode[] {
  const out: OrgTreeNode[] = []
  const stack = [...roots].reverse()
  while (stack.length) {
    const node = stack.pop() as OrgTreeNode
    out.push(node)
    if (!collapsed.has(node.id)) {
      for (let i = node.children.length - 1; i >= 0; i--) stack.push(node.children[i])
    }
  }
  return out
}
