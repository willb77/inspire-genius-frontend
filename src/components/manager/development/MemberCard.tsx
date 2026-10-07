import { useNavigate } from "react-router-dom"
import { Briefcase, TrendingUp } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { ROUTES } from "@/constants/routes"
import { FIT_ENGINE_MATCHES_ENABLED } from "@/constants/development"
import { useMemberFitMatches } from "@/hooks/manager/development/useMemberFitMatches"
import type { RosterMember } from "@/types/development"
import { CoverageChips } from "./CoverageChips"
import { PlanStatusBadge } from "./PlanStatusBadge"
import { ProgressRing } from "./ProgressRing"
import { ConfidenceDot } from "./ConfidenceDot"
import { useDevSkin } from "./skin"

function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()
}

function TopMatchLine({ title, fitScore }: { title: string; fitScore: number }) {
  const sk = useDevSkin()
  return (
    <div
      className={cn("mt-auto flex items-center gap-1.5 border-t pt-2 text-xs", sk.border100, sk.text600)}
      data-testid="member-card-top-match"
    >
      <Briefcase className={cn("h-3.5 w-3.5", sk.text400)} aria-hidden="true" />
      <span className="truncate">{title}</span>
      <span className={cn("ml-auto inline-flex items-center gap-0.5 font-medium", sk.text700)}>
        <TrendingUp className="h-3 w-3 text-emerald-500" aria-hidden="true" />
        {Math.round(fitScore)}%
      </span>
    </div>
  )
}

/**
 * 3.3a — the roster line from the fit engine: the member's rank-1 role, the
 * same number the Careers tab shows. Only rendered when
 * FIT_ENGINE_MATCHES_ENABLED. Any state but `ok` shows no line; the reason is
 * on the Careers tab, where there is room to say it.
 */
function FitTopMatchLine({ memberId }: { memberId: string }) {
  const { data } = useMemberFitMatches(memberId, true)
  const top = data?.state === "ok" ? data.matches[0] : undefined
  return top ? <TopMatchLine title={top.roleTitle} fitScore={top.fitScore} /> : null
}

export type MemberCardProps = {
  member: RosterMember
  /** Invite this member to complete a missing framework. */
  onInvite?: (memberId: string, framework: "prism" | "clifton" | "disc") => void
}

/**
 * Roster tile — keyboard-focusable, click/Enter navigates to the member's
 * development workspace. Coverage/severity conveyed with icon + label.
 */
export function MemberCard({ member, onInvite }: MemberCardProps) {
  const navigate = useNavigate()
  const sk = useDevSkin()
  const target = ROUTES.MANAGER.DEVELOPMENT_MEMBER.replace(":memberId", member.memberId)
  const go = () => navigate(target)

  const headline = member.reconciledHeadline
  const needsPrism = !member.coverage.prism

  return (
    <Card
      role="button"
      tabIndex={0}
      aria-label={`Open development workspace for ${member.name}`}
      onClick={go}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          go()
        }
      }}
      className={cn(
        "flex cursor-pointer flex-col gap-3 p-4 transition-shadow hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2",
        sk.radius,
        sk.border200,
        sk.focusRing,
      )}
    >
      <div className="flex items-start gap-3">
        <Avatar className="h-10 w-10">
          {member.avatarUrl ? <AvatarImage src={member.avatarUrl} alt="" /> : null}
          <AvatarFallback className={cn("bg-gradient-to-br text-sm font-bold text-white", sk.avatarGradient)}>
            {initials(member.name)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className={cn("truncate text-sm font-semibold", sk.text900)}>{member.name}</div>
          <div className={cn("truncate text-xs", sk.text500)}>
            {member.title ?? "—"}
            {member.department ? ` · ${member.department}` : ""}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <PlanStatusBadge status={member.planStatus} />
          {typeof member.milestoneProgress === "number" ? (
            <ProgressRing value={member.milestoneProgress} label={`${Math.round(member.milestoneProgress)}% of milestones complete`} />
          ) : null}
        </div>
      </div>

      <CoverageChips
        coverage={member.coverage}
        size="sm"
        onInvite={onInvite ? (fw) => onInvite(member.memberId, fw) : undefined}
      />

      {headline ? (
        <div className="flex items-start gap-1.5">
          {member.headlineConfidence ? <ConfidenceDot level={member.headlineConfidence} className="mt-1" /> : null}
          <p className={cn("line-clamp-2 text-xs", sk.text600)}>{headline}</p>
        </div>
      ) : needsPrism ? (
        <p className={cn("text-xs italic", sk.text400)}>Invite to complete PRISM to build a profile.</p>
      ) : null}

      {FIT_ENGINE_MATCHES_ENABLED ? (
        <FitTopMatchLine memberId={member.memberId} />
      ) : member.topMatch ? (
        <TopMatchLine title={member.topMatch.title} fitScore={member.topMatch.fitScore} />
      ) : null}
    </Card>
  )
}
