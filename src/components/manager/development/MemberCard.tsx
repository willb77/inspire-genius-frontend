import { useNavigate } from "react-router-dom"
import { Briefcase, Share2, TrendingUp } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { ROUTES } from "@/constants/routes"
import { FIT_ENGINE_MATCHES_ENABLED } from "@/constants/development"
import { useMemberFitMatches } from "@/hooks/manager/development/useMemberFitMatches"
import type { RosterMember } from "@/types/development"
import type { PartialCoverage } from "@/lib/job-fit/coverage"
import { fitMatchCoverage } from "./tabs/fitEngineMatchCopy"
import { CoverageChips } from "./CoverageChips"
import { PlanStatusBadge } from "./PlanStatusBadge"
import { ProgressRing } from "./ProgressRing"
import { ConfidenceDot } from "./ConfidenceDot"
import { useDevSkin } from "./skin"
import { useTranslation } from "react-i18next"
import { withPrism } from "@/lib/withPrism"
import {
  chipContradictsCard,
  gatedFieldsShown,
  isKnownCategory,
  sharingDisplay,
  type SharingDisplay,
} from "./rosterSharing"

type TFn = ReturnType<typeof useTranslation>["t"]

/*
 * Literal `t()` calls on purpose: the managerPages i18n guard matches each key
 * to its English default in the source, so a key built at runtime would read
 * as an orphan.
 */
function sharingLabel(t: TFn, display: SharingDisplay, what: string): string {
  switch (display) {
    case "not_asked": return t("memberSharing.notAsked", { defaultValue: "Not asked" })
    case "awaiting": return t("memberSharing.awaiting", { defaultValue: "Awaiting reply" })
    case "shared": return t("memberSharing.shared", { defaultValue: "Shared: {{what}}", what })
    case "declined": return t("memberSharing.declined", { defaultValue: "Declined" })
    case "withdrawn": return t("memberSharing.withdrawn", { defaultValue: "Withdrawn" })
    case "term_ended": return t("memberSharing.termEnded", { defaultValue: "Term ended" })
    case "no_account": return t("memberSharing.noAccount", { defaultValue: "No account" })
    case "not_known": return t("memberSharing.notKnown", { defaultValue: "Not known" })
  }
}

function sharingHint(t: TFn, display: SharingDisplay): string {
  switch (display) {
    case "not_asked": return t("memberSharing.hintNotAsked", { defaultValue: "You have not asked this person to share anything yet." })
    case "awaiting": return t("memberSharing.hintAwaiting", { defaultValue: "You asked. They have not answered yet." })
    case "shared": return t("memberSharing.hintShared", { defaultValue: "What they share with you now." })
    case "declined": return t("memberSharing.hintDeclined", { defaultValue: "They declined. That costs them nothing." })
    case "withdrawn": return t("memberSharing.hintWithdrawn", { defaultValue: "They withdrew what they had shared with you." })
    case "term_ended": return t("memberSharing.hintTermEnded", { defaultValue: "What they shared ran to the end of its term." })
    case "no_account": return t("memberSharing.hintNoAccount", { defaultValue: "No InspiresGenius account is known for this person, so there is nobody to ask." })
    case "not_known": return t("memberSharing.hintNotKnown", { defaultValue: "What this person shares with you could not be read." })
  }
}

/** Every grantable category has words; anything else reads "Other", never its key. */
function categoryLabel(t: TFn, key: string): string {
  if (!isKnownCategory(key)) return t("memberSharing.category.other", { defaultValue: "Other" })
  switch (key) {
    case "prism": return t("memberSharing.category.prism", { defaultValue: "PRISM" })
    case "engagement": return t("memberSharing.category.engagement", { defaultValue: "Engagement" })
    case "topics": return t("memberSharing.category.topics", { defaultValue: "Topics" })
    case "artefacts": return t("memberSharing.category.artefacts", { defaultValue: "Documents" })
    case "goals": return t("memberSharing.category.goals", { defaultValue: "Goals" })
    case "assessments": return t("memberSharing.category.assessments", { defaultValue: "Assessments" })
    case "interviews": return t("memberSharing.category.interviews", { defaultValue: "Interviews" })
    case "development": return t("memberSharing.category.development", { defaultValue: "Development" })
  }
}

/**
 * U6c — what this person shares with the viewer, from the roster's `sharing`
 * field and nothing else. See rosterSharing.ts for the state table and the
 * rule that decides when the chip is left off.
 */
function SharingChip({
  display,
  categories,
  name,
}: {
  display: SharingDisplay
  categories: readonly string[]
  name: string
}) {
  const { t } = useTranslation("managerPages")
  const what = categories
    .map((c) => categoryLabel(t, c))
    .filter((v, i, all) => all.indexOf(v) === i)
    .join(", ")
  const label = sharingLabel(t, display, what)
  const tone =
    display === "shared"
      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
      : display === "awaiting"
        ? "border-amber-200 bg-amber-50 text-amber-800"
        : "border-slate-200 bg-slate-50 text-slate-700"
  return (
    <span
      className={cn("inline-flex max-w-full items-center gap-1 self-start rounded-full border px-2 py-0.5 text-[11px] font-medium", tone)}
      title={sharingHint(t, display)}
      aria-label={t("memberSharing.ariaLabel", { defaultValue: "What {{name}} shares with you: {{state}}", name, state: label })}
      data-testid="member-card-sharing"
      data-sharing={display}
    >
      <Share2 className="h-3 w-3 shrink-0" aria-hidden="true" />
      <span className="truncate">{label}</span>
    </span>
  )
}

function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()
}

function TopMatchLine({
  title,
  fitScore,
  coverage,
}: {
  title: string
  fitScore: number
  /** BP-F5: set when the score rests on fewer than all of the role's dimensions. */
  coverage?: PartialCoverage | null
}) {
  const { t } = useTranslation("managerPages")
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
        {coverage && (
          <span
            className="ml-1 font-normal text-amber-700"
            title={t("memberCard.partialProfileOfDimensionsMeasured", { defaultValue: "Partial profile: {{evaluated}} of {{total}} dimensions measured", evaluated: coverage.evaluated, total: coverage.total })}
            data-testid="member-card-top-match-coverage"
          >
            · {coverage.evaluated}/{coverage.total}
          </span>
        )}
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
  return top ? (
    <TopMatchLine title={top.roleTitle} fitScore={top.fitScore} coverage={fitMatchCoverage(top)} />
  ) : null
}

export type MemberCardProps = {
  member: RosterMember
  /** Invite this member to complete a missing framework. */
  onInvite?: (memberId: string, framework: "prism" | "clifton" | "disc") => void
  /**
   * The workspace route this card opens, with a `:memberId` segment.
   *
   * Defaults to the manager route. A practitioner mount MUST pass its own:
   * ProtectedRoute gates by path prefix and `practitioner` has no `/manager`
   * prefix, so the default sends a practitioner back to their home page — a
   * card that looks live and opens nothing. The page already computed the
   * right route for the invite chip and the org chart; the card body, which is
   * the main way in, was the one link that did not take it.
   */
  memberRoute?: string
  /**
   * U6c — true when the server's grant read worked for this roster (at least
   * one card carries a `sharing` block). Only then may a `null` block on a
   * minted id read "No account"; otherwise it reads "Not known".
   */
  sharingReadWorked?: boolean
}

/**
 * Roster tile — keyboard-focusable, click/Enter navigates to the member's
 * development workspace. Coverage/severity conveyed with icon + label.
 */
export function MemberCard({
  member,
  onInvite,
  memberRoute = ROUTES.MANAGER.DEVELOPMENT_MEMBER,
  sharingReadWorked = false,
}: MemberCardProps) {
  const { t } = useTranslation("managerPages")
  const navigate = useNavigate()
  const sk = useDevSkin()
  const target = memberRoute.replace(":memberId", member.memberId)
  const go = () => navigate(target)

  const headline = member.reconciledHeadline
  const needsPrism = !member.coverage.prism

  // U6c, task 4. Until U6d (server-side, switch off by default) stops the
  // server sending a PRISM tick, headline or top match for a person who does
  // not share them, a chip saying they share nothing would sit beside exactly
  // those fields. When it would, the card is shown as today with no chip. The
  // fit-engine line (flag on) is not counted: the server renders it only for
  // `state: "ok"`, which it refuses unless PRISM and development are shared.
  const sharing = sharingDisplay(member, sharingReadWorked)
  const granted = member.sharing?.grantedCategories ?? []
  const shownGated = gatedFieldsShown(
    member.coverage,
    headline,
    !FIT_ENGINE_MATCHES_ENABLED && Boolean(member.topMatch),
  )
  const showSharingChip = !chipContradictsCard(sharing, granted, shownGated)

  return (
    <Card
      role="button"
      tabIndex={0}
      aria-label={t("memberCard.openDevelopmentWorkspaceFor", { defaultValue: "Open development workspace for {{name}}", name: member.name })}
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
            {member.department ? t("memberCard.text", { defaultValue: " · {{department}}", department: member.department }) : ""}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <PlanStatusBadge status={member.planStatus} />
          {typeof member.milestoneProgress === "number" ? (
            <ProgressRing value={member.milestoneProgress} label={t("memberCard.ofMilestonesComplete", { defaultValue: "{{value}}% of milestones complete", value: Math.round(member.milestoneProgress) })} />
          ) : null}
        </div>
      </div>

      {showSharingChip ? (
        <SharingChip display={sharing} categories={sharing === "shared" ? granted : []} name={member.name} />
      ) : null}

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
        <p className={cn("text-xs italic", sk.text400)}>{withPrism(t("memberCard.inviteToCompletePrismTo", { defaultValue: "Invite to complete PRISM to build a profile." }))}</p>
      ) : null}

      {FIT_ENGINE_MATCHES_ENABLED ? (
        <FitTopMatchLine memberId={member.memberId} />
      ) : member.topMatch ? (
        <TopMatchLine title={member.topMatch.title} fitScore={member.topMatch.fitScore} />
      ) : null}
    </Card>
  )
}
