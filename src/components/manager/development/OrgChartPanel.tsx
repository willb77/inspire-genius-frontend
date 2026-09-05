import { useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { ChevronDown, ChevronRight, Users } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { useOrgChart } from "@/hooks/manager/development/useOrgChart"
import { ancestorsOf, buildOrgTree, visibleRows, type OrgTreeNode } from "@/lib/orgTree"

/**
 * The organisation's reporting tree — roll up to the top, down any branch.
 *
 * Drawn as an actual chart: cards laid out top-down with connector lines,
 * rather than the indented list this started as. An indented list with
 * disclosure triangles reads as a file tree, and the one thing an org chart has
 * to communicate at a glance — who sits under whom, and how wide each span is —
 * is exactly what indentation communicates worst.
 *
 * Carries name, title and department only. That is the whole reason this can be
 * shown to every signed-in member of the org: it publishes no scores, no
 * assessment coverage and no contact details. A card links to that person's
 * workspace, where the existing per-member gate decides what is actually shown —
 * so the chart is a navigation surface, not a disclosure one.
 *
 * The tree itself is assembled by `@/lib/orgTree`, which is pure and separately
 * tested because its hazards are not visual: `manager_id` permits A -> B -> A,
 * and a naive walk hangs the tab with no error.
 */

/**
 * Levels drawn before the chart stops descending.
 *
 * `buildOrgTree` is deliberately ITERATIVE so a pathological chain cannot blow
 * the stack — there is a 5000-deep test holding that. Rendering nested JSX is
 * recursive by nature and would hand that hazard straight back, so the depth is
 * capped and the remainder is reported rather than drawn. Real reporting lines
 * do not approach this; a chain that does is a data fault, and saying so beats
 * a blank tab.
 */
const MAX_DRAWN_DEPTH = 40

export function OrgChartPanel({ memberRoute }: { memberRoute: string }) {
  const { data, isLoading, isError } = useOrgChart()
  const navigate = useNavigate()
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(new Set())

  const roots = useMemo(
    () => buildOrgTree(data?.nodes ?? [], data?.viewerId),
    [data?.nodes, data?.viewerId],
  )
  const chain = useMemo(() => ancestorsOf(roots, data?.viewerId), [roots, data?.viewerId])
  const rows = useMemo(() => visibleRows(roots, collapsed), [roots, collapsed])
  const total = data?.nodes?.length ?? 0
  const hasHierarchy = useMemo(
    () => (data?.nodes ?? []).some((n) => n.managerId),
    [data?.nodes],
  )

  function toggle(id: string) {
    setCollapsed((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function open(id: string) {
    // The page serves managers AND practitioners from different route trees, so
    // the destination is passed in rather than assumed — hardcoding the manager
    // path would send a practitioner to a route their own ProtectedRoute rejects.
    navigate(memberRoute.replace(":memberId", id))
  }

  if (isLoading) return <Skeleton className="h-64 w-full" />

  if (isError) {
    // A load failure is not an empty organisation. Saying "no one to show"
    // here would be the dishonest empty state this surface keeps having to
    // defend against.
    return (
      <p className="text-sm text-slate-500">
        The organisation chart could not be loaded. This is a load failure, not an empty
        organisation — try again shortly.
      </p>
    )
  }

  // Three different facts used to share one sentence. `nodes: []` is produced
  // both by "your organisation has nobody on it" and by "we could not work out
  // which organisation you are in", and the old copy asserted the first —
  // stating something about an organisation that had never been identified.
  if (data?.orgResolved === false) {
    return (
      <p className="text-sm text-slate-500">
        We could not work out which organisation you belong to, so there is no chart to
        show. This is not an empty organisation — your profile does not have one on it.
      </p>
    )
  }

  if (!roots.length) {
    return (
      <p className="text-sm text-slate-500">Nobody is on file for your organisation yet.</p>
    )
  }

  return (
    <div className="space-y-3">
      {data?.truncated && (
        <p className="text-xs text-amber-700">
          This organisation is larger than the chart can show, so it is cut short. Nobody has
          been hidden deliberately — the list below is incomplete.
        </p>
      )}

      {!hasHierarchy && total > 1 && (
        <p className="text-xs text-slate-500">
          No reporting lines are on file yet, so everyone appears at the top level. The
          chart is built from each person&apos;s manager on their employment record.
        </p>
      )}

      {chain.length > 0 && (
        <p className="text-xs text-slate-500">
          You report up through{" "}
          {chain.map((a, i) => (
            <span key={a.id}>
              {i > 0 && " › "}
              <span className="font-medium text-slate-700">{a.name}</span>
            </span>
          ))}
          .
        </p>
      )}

      {/*
        Horizontal scroll, not wrap. A chart that wraps stops being a chart —
        the connector above a wrapped card points at whoever happens to sit
        above it on the new line. Wide organisations scroll instead; the
        measured worst case here is 50 roots side by side.
      */}
      <div className="overflow-x-auto pb-2">
        <ul
          className="flex w-max min-w-full justify-center gap-2"
          aria-label="Organisation chart"
        >
          {roots.map((node) => (
            <OrgNode
              key={node.id}
              node={node}
              depth={0}
              isRoot
              collapsed={collapsed}
              onToggle={toggle}
              onOpen={open}
            />
          ))}
        </ul>
      </div>

      <p className="text-xs text-slate-400">
        {rows.length === total
          ? `${total} ${total === 1 ? "person" : "people"}`
          : `Showing ${rows.length} of ${total} people — some branches are collapsed.`}
      </p>
    </div>
  )
}

function OrgNode({
  node,
  depth,
  isRoot = false,
  collapsed,
  onToggle,
  onOpen,
}: {
  node: OrgTreeNode
  depth: number
  isRoot?: boolean
  collapsed: ReadonlySet<string>
  onToggle: (id: string) => void
  onOpen: (id: string) => void
}) {
  const hasChildren = node.children.length > 0
  const isCollapsed = collapsed.has(node.id)
  const tooDeep = depth >= MAX_DRAWN_DEPTH
  const showChildren = hasChildren && !isCollapsed && !tooDeep

  return (
    <li
      className={cn(
        "relative flex flex-col items-center",
        // Root cards hang from nothing, so they draw no connector above them.
        isRoot
          ? "px-2"
          : [
              "px-2 pt-6",
              // Left half of the horizontal bar joining this card to its siblings.
              "before:absolute before:right-1/2 before:top-0 before:h-6 before:w-1/2",
              "before:border-t before:border-slate-300 before:content-['']",
              // Right half, plus the vertical drop into this card.
              "after:absolute after:left-1/2 after:top-0 after:h-6 after:w-1/2",
              "after:border-l after:border-t after:border-slate-300 after:content-['']",
              // An only child needs no horizontal bar at all — the stub drawn by
              // the parent's <ul> already reaches it.
              "only:pt-6 only:before:hidden only:after:border-t-0",
              // The bar must not overhang the outermost siblings.
              "first:before:border-t-0",
              // ...and the last sibling's drop moves onto ::before, because its
              // ::after loses every border along with the overhang.
              "last:after:border-0 last:before:border-r last:before:border-slate-300",
            ],
      )}
    >
      <div
        className={cn(
          "flex w-44 flex-col rounded-lg border bg-white px-3 py-2 text-center shadow-sm",
          node.isViewer && "border-slate-500 bg-slate-50 ring-1 ring-slate-400",
        )}
      >
        <button
          type="button"
          onClick={() => onOpen(node.id)}
          className="truncate text-sm font-medium text-slate-800 hover:underline"
          aria-label={`Open ${node.name}'s workspace`}
          title={node.name}
        >
          {node.name}
          {node.isViewer && <span className="ml-1 text-xs text-slate-500">(you)</span>}
        </button>

        {node.title && (
          <span className="truncate text-xs text-slate-500" title={node.title}>
            {node.title}
          </span>
        )}
        {node.department && (
          <span className="truncate text-xs text-slate-400" title={node.department}>
            {node.department}
          </span>
        )}

        {hasChildren && (
          <button
            type="button"
            onClick={() => onToggle(node.id)}
            aria-expanded={!isCollapsed}
            aria-label={
              isCollapsed ? `Show ${node.name}'s reports` : `Hide ${node.name}'s reports`
            }
            className="mt-1 flex items-center justify-center gap-1 rounded text-xs text-slate-500 hover:bg-slate-100"
          >
            {isCollapsed ? (
              <ChevronRight className="h-3 w-3" aria-hidden />
            ) : (
              <ChevronDown className="h-3 w-3" aria-hidden />
            )}
            <Users className="h-3 w-3" aria-hidden />
            {node.children.length}
          </button>
        )}
      </div>

      {showChildren && (
        <ul
          className={cn(
            "relative flex justify-center pt-6",
            // The stub dropping out of this card towards its children's bar.
            "before:absolute before:left-1/2 before:top-0 before:h-6 before:w-px",
            "before:bg-slate-300 before:content-['']",
          )}
        >
          {node.children.map((child) => (
            <OrgNode
              key={child.id}
              node={child}
              depth={depth + 1}
              collapsed={collapsed}
              onToggle={onToggle}
              onOpen={onOpen}
            />
          ))}
        </ul>
      )}

      {hasChildren && !isCollapsed && tooDeep && (
        <p className="mt-2 max-w-44 text-xs text-amber-700">
          This branch goes deeper than the chart draws. {node.children.length} more{" "}
          {node.children.length === 1 ? "person reports" : "people report"} to {node.name}.
        </p>
      )}
    </li>
  )
}
