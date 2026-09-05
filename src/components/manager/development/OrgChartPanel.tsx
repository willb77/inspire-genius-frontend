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

  function toggle(id: string) {
    setCollapsed((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
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

  if (!rows.length) {
    return (
      <p className="text-sm text-slate-500">
        No reporting lines are on file for your organisation yet. The chart is built from
        each person&apos;s manager on their employment record.
      </p>
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

      <ul className="space-y-1" aria-label="Organisation chart">
        {rows.map((node) => (
          <OrgRow
            key={node.id}
            node={node}
            collapsed={collapsed}
            onToggle={toggle}
            // The page serves managers AND practitioners from different route
            // trees, so the destination is passed in rather than assumed —
            // hardcoding the manager path would send a practitioner to a route
            // their own ProtectedRoute rejects.
            onOpen={() => navigate(memberRoute.replace(":memberId", node.id))}
          />
        ))}
      </ul>
    </div>
  )
}

function OrgRow({
  node,
  collapsed,
  onToggle,
  onOpen,
}: {
  node: OrgTreeNode
  collapsed: ReadonlySet<string>
  onToggle: (id: string) => void
  onOpen: () => void
}) {
  const hasChildren = node.children.length > 0
  const isCollapsed = collapsed.has(node.id)
  return (
    <li
      // Indent by depth. Capped so a deep organisation does not push the last
      // level off the side of the page — the chevrons still convey the nesting.
      style={{ paddingLeft: `${Math.min(node.depth, 8) * 20}px` }}
    >
      <div
        className={cn(
          "flex items-center gap-2 rounded-md border px-3 py-2",
          node.isViewer && "border-slate-400 bg-slate-50",
        )}
      >
        {hasChildren ? (
          <button
            type="button"
            onClick={() => onToggle(node.id)}
            aria-expanded={!isCollapsed}
            aria-label={
              isCollapsed ? `Show ${node.name}'s reports` : `Hide ${node.name}'s reports`
            }
            className="rounded p-0.5 text-slate-500 hover:bg-slate-100"
          >
            {isCollapsed ? (
              <ChevronRight className="h-4 w-4" aria-hidden />
            ) : (
              <ChevronDown className="h-4 w-4" aria-hidden />
            )}
          </button>
        ) : (
          <span className="w-5" aria-hidden />
        )}

        <button
          type="button"
          onClick={onOpen}
          className="min-w-0 flex-1 text-left"
          aria-label={`Open ${node.name}'s workspace`}
        >
          <span className="text-sm font-medium text-slate-800">{node.name}</span>
          {node.isViewer && <span className="ml-1.5 text-xs text-slate-500">(you)</span>}
          <span className="ml-2 truncate text-xs text-slate-500">
            {[node.title, node.department].filter(Boolean).join(" · ")}
          </span>
        </button>

        {hasChildren && (
          <span className="flex shrink-0 items-center gap-1 text-xs text-slate-500">
            <Users className="h-3 w-3" aria-hidden />
            {node.size - 1}
          </span>
        )}
      </div>
    </li>
  )
}

export default OrgChartPanel
