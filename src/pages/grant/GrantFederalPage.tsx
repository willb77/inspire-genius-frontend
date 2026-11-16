import { useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import type { TFunction } from "i18next"
import type { LucideIcon } from "lucide-react"
import {
  Landmark,
  CalendarClock,
  FileText,
  Coins,
  GraduationCap,
  Banknote,
  Briefcase,
  ArrowRight,
  MapPin,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton"
import { useDeadlines } from "@/hooks/grant/useDeadlines"
import { useStudentProfile } from "@/hooks/grant/useProfile"
import { useAidIntake } from "@/hooks/grant/useAidIntake"
import type { Deadline, DeadlineStatus, DeadlineType, StudentProfile } from "@/types/grant"
import type { FafsaStatusValue } from "@/types/grant/intake"
import {
  GrantPageHeader,
  GrantCard,
  GrantEmptyState,
  GrantPill,
  GrantMeter,
  GrantStat,
  GrantSectionTitle,
} from "./_shared"
import { formatDate, relativeDeadline, daysUntil } from "./_format"

type Tone = "blue" | "teal" | "amber" | "red" | "gray" | "green"

const TYPE_LABELS: Record<DeadlineType, (t: TFunction) => string> = {
  federal: (t) => t("federal.typeFederal", "Federal"),
  state: (t) => t("federal.typeState", "State"),
  institutional: (t) => t("federal.typeInstitutional", "Institutional"),
  scholarship: (t) => t("federal.typeScholarship", "Scholarship"),
}

const STATUS_TONE: Record<DeadlineStatus, "amber" | "red" | "blue" | "green"> = {
  "due-soon": "amber",
  overdue: "red",
  upcoming: "blue",
  submitted: "green",
}

const STATUS_LABEL: Record<DeadlineStatus, (t: TFunction) => string> = {
  "due-soon": (t) => t("federal.statusDueSoon", "Due soon"),
  overdue: (t) => t("federal.statusOverdue", "Overdue"),
  upcoming: (t) => t("federal.statusUpcoming", "Upcoming"),
  submitted: (t) => t("federal.statusSubmitted", "Submitted"),
}

type Filter = "all" | DeadlineType

// ── FAFSA readiness ──────────────────────────────────────────────────────────

type FafsaView = { label: (t: TFunction) => string; tone: Tone; pct: number; next: (t: TFunction) => string }

const FAFSA_VIEW: Record<FafsaStatusValue, FafsaView> = {
  submitted: {
    label: (t) => t("federal.fafsaSubmitted", "Submitted"),
    tone: "green",
    pct: 100,
    next: (t) =>
      t("federal.fafsaSubmittedNext", "Your FAFSA is on file — watch state and institutional deadlines next."),
  },
  in_progress: {
    label: (t) => t("federal.fafsaInProgress", "In progress"),
    tone: "amber",
    pct: 60,
    next: (t) =>
      t("federal.fafsaInProgressNext", "Finish and submit your FAFSA before the federal deadline to lock in aid."),
  },
  not_started: {
    label: (t) => t("federal.fafsaNotStarted", "Not started"),
    tone: "red",
    pct: 10,
    next: (t) =>
      t(
        "federal.fafsaNotStartedNext",
        "Start your FAFSA at studentaid.gov — it unlocks federal, state, and school aid."
      ),
  },
}

/** Fall back to the FAFSA deadline's status when the intake profile is silent. */
function deadlineToFafsa(status?: DeadlineStatus): FafsaStatusValue {
  if (status === "submitted") return "submitted"
  if (status === "due-soon" || status === "overdue") return "in_progress"
  return "not_started"
}

// ── Federal aid programs (illustrative 2025–26 figures) ──────────────────────

type FederalTile = {
  id: string
  icon: LucideIcon
  label: (t: TFunction) => string
  value: string
  hint: (t: TFunction) => string
  tone: Tone
}

const FEDERAL_TILES: readonly FederalTile[] = [
  {
    id: "pell",
    icon: GraduationCap,
    label: (t) => t("federal.tilePell", "Pell Grant"),
    value: "$7,395",
    hint: (t) => t("federal.tilePellHint", "Need-based, doesn't repay — your SAI sets the award."),
    tone: "blue",
  },
  {
    id: "subsidized",
    icon: Banknote,
    label: (t) => t("federal.tileSubsidized", "Direct Subsidized"),
    value: "$3,500",
    hint: (t) => t("federal.tileSubsidizedHint", "Stafford, need-based — no interest while enrolled."),
    tone: "teal",
  },
  {
    id: "unsubsidized",
    icon: Banknote,
    label: (t) => t("federal.tileUnsubsidized", "Direct Unsubsidized"),
    value: "$2,000",
    hint: (t) => t("federal.tileUnsubsidizedHint", "Stafford, not need-based — interest accrues at once."),
    tone: "amber",
  },
  {
    id: "workstudy",
    icon: Briefcase,
    label: (t) => t("federal.tileWorkStudy", "Work-Study"),
    value: "$2,500",
    hint: (t) => t("federal.tileWorkStudyHint", "Earn aid through a part-time campus job."),
    tone: "green",
  },
]

// ── State programs (keyed by residence, generic fallback) ────────────────────

type StateProgram = { id: string; name: string; hint: string }

function stateProgramsFor(t: TFunction, state?: string): StateProgram[] {
  if (state === "CA") {
    return [
      {
        id: "ca-cal-grant-a",
        name: t("federal.stateCalGrantA", "Cal Grant A"),
        hint: t("federal.stateCalGrantAHint", "Tuition & fees at four-year schools"),
      },
      {
        id: "ca-cal-grant-b",
        name: t("federal.stateCalGrantB", "Cal Grant B"),
        hint: t("federal.stateCalGrantBHint", "Living-cost stipend for low-income students"),
      },
      {
        id: "ca-middle-class",
        name: t("federal.stateMiddleClass", "Middle Class Scholarship"),
        hint: t("federal.stateMiddleClassHint", "Up to 40% of remaining UC/CSU cost"),
      },
      {
        id: "ca-chafee",
        name: t("federal.stateChafee", "Chafee Grant"),
        hint: t("federal.stateChafeeHint", "For current & former foster youth"),
      },
    ]
  }
  return [
    {
      id: "generic-need",
      name: t("federal.stateNeedGrant", "State need grant"),
      hint: t("federal.stateNeedGrantHint", "Income-based aid from your state agency"),
    },
    {
      id: "generic-merit",
      name: t("federal.stateMerit", "Merit scholarship"),
      hint: t("federal.stateMeritHint", "GPA/test-based award from your state"),
    },
  ]
}

/**
 * UI-3 — Federal & State Aid.
 *
 * Leads with a FAFSA / SAI readiness hero (from the aid-intake profile, falling
 * back to the FAFSA deadline), then federal-program tiles, a state-programs
 * grouping, and the chronological deadline tracker. Filter chips narrow the
 * tracker by aid type; each row shows days-until and a status pill. Backed by
 * `useDeadlines` / `useStudentProfile` / `useAidIntake` (mock for UI-0).
 */
export default function GrantFederalPage() {
  const { t } = useTranslation("grantPages")
  const { data, isLoading } = useDeadlines()
  const { data: profile } = useStudentProfile()
  const { data: intake } = useAidIntake()
  const [filter, setFilter] = useState<Filter>("all")

  const sorted = useMemo(
    () =>
      [...(data ?? [])].sort(
        (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
      ),
    [data]
  )

  const filtered = useMemo(
    () => (filter === "all" ? sorted : sorted.filter((d) => d.type === filter)),
    [sorted, filter]
  )

  const types = useMemo(() => {
    const present = new Set(sorted.map((d) => d.type))
    return (["all", "federal", "state", "institutional", "scholarship"] as Filter[]).filter(
      (f) => f === "all" || present.has(f as DeadlineType)
    )
  }, [sorted])

  // FAFSA status: intake profile wins; otherwise infer from the FAFSA deadline.
  const fafsa = useMemo<FafsaView>(() => {
    const fromIntake = intake?.fafsa_status
    if (fromIntake) return FAFSA_VIEW[fromIntake]
    const fafsaDeadline = sorted.find(
      (d) => d.type === "federal" && /fafsa/i.test(d.name)
    )
    return FAFSA_VIEW[deadlineToFafsa(fafsaDeadline?.status)]
  }, [intake, sorted])

  const statePrograms = stateProgramsFor(t, profile?.stateOfResidence)
  const sai: StudentProfile["studentAidIndex"] | undefined = profile?.studentAidIndex

  return (
    <div className="max-w-3xl">
      <GrantPageHeader
        icon={Landmark}
        title={t("federal.title", "Federal & State Aid")}
        description={t("federal.description", "FAFSA, Pell Grants, and state aid deadlines ordered by what's due next.")}
      />

      {/* FAFSA / SAI readiness hero */}
      <GrantCard className="mb-6 flex flex-col gap-5 sm:flex-row sm:items-stretch">
        <div className="flex-1">
          <div className="mb-2 flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[rgba(59,91,255,0.1)]">
              <FileText className="h-3.5 w-3.5 text-[#3B5BFF]" />
            </span>
            <h2 className="text-sm font-semibold text-[#374151]">{t("federal.fafsaReadiness", "FAFSA readiness")}</h2>
            <GrantPill tone={fafsa.tone}>{fafsa.label(t)}</GrantPill>
          </div>
          <GrantMeter value={fafsa.pct} tone={fafsa.tone} />
          <p className="mt-3 flex items-start gap-1.5 text-sm text-[#374151]">
            <ArrowRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#3B5BFF]" />
            <span>{fafsa.next(t)}</span>
          </p>
        </div>
        <div className="w-full shrink-0 rounded-lg border border-[#e5e7eb] bg-[#f9fafb] p-4 sm:w-56">
          <div className="mb-1 flex items-center gap-2 text-[#374151]">
            <Coins className="h-4 w-4 text-[#0f766e]" />
            <span className="text-sm font-semibold">{t("federal.studentAidIndex", "Student Aid Index")}</span>
          </div>
          <p className="text-3xl font-bold text-[#1f2937]">
            {sai !== undefined ? sai.toLocaleString("en-US") : "—"}
          </p>
          <p className="mt-1 text-xs text-[#9ca3af]">{t("federal.lowerSai", "Lower SAI unlocks more need-based aid.")}</p>
        </div>
      </GrantCard>

      {/* Federal aid programs */}
      <GrantSectionTitle>{t("federal.programs", "Federal programs")}</GrantSectionTitle>
      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {FEDERAL_TILES.map((tile) => (
          <GrantStat
            key={tile.id}
            icon={tile.icon}
            label={tile.label(t)}
            value={tile.value}
            hint={tile.hint(t)}
            tone={tile.tone}
          />
        ))}
      </div>

      {/* State programs grouping */}
      <GrantSectionTitle>
        <span className="inline-flex items-center gap-1.5">
          <MapPin className="h-3.5 w-3.5" />
          {t("federal.statePrograms", "State programs")}
          {profile?.stateOfResidence ? ` · ${profile.stateOfResidence}` : ""}
        </span>
      </GrantSectionTitle>
      <GrantCard className="mb-6">
        <ul className="divide-y divide-[#e5e7eb]">
          {statePrograms.map((p) => (
            <li key={p.id} className="flex items-center justify-between gap-3 py-2 first:pt-0 last:pb-0">
              <span className="text-sm font-medium text-[#1f2937]">{p.name}</span>
              <span className="text-right text-xs text-[#9ca3af]">{p.hint}</span>
            </li>
          ))}
        </ul>
      </GrantCard>

      {/* Deadline tracker */}
      <GrantSectionTitle>{t("federal.deadlines", "Deadlines")}</GrantSectionTitle>
      <div className="mb-5 flex flex-wrap gap-2">
        {types.map((ft) => (
          <button
            key={ft}
            type="button"
            onClick={() => setFilter(ft)}
            className={cn(
              "rounded-full border px-3 py-1 text-sm font-medium transition",
              filter === ft
                ? "border-[#3B5BFF] bg-[rgba(59,91,255,0.08)] text-[#3B5BFF]"
                : "border-[#e5e7eb] bg-white text-[#6b7280] hover:border-[#cbd5e1]"
            )}
          >
            {ft === "all" ? t("federal.filterAll", "All") : TYPE_LABELS[ft as DeadlineType](t)}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <GrantEmptyState>{t("federal.noDeadlines", "No deadlines in this category.")}</GrantEmptyState>
      ) : (
        <ol className="space-y-3">
          {filtered.map((d: Deadline) => {
            const overdue = daysUntil(d.dueDate) < 0 && d.status !== "submitted"
            return (
              <li key={d.id}>
                <GrantCard className="flex items-center justify-between gap-4">
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[rgba(59,91,255,0.08)]">
                      <CalendarClock className="h-4 w-4 text-[#3B5BFF]" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="truncate text-sm font-semibold text-[#1f2937]">{d.name}</h2>
                        <GrantPill tone="gray">{TYPE_LABELS[d.type](t)}</GrantPill>
                      </div>
                      <p className="mt-0.5 text-xs text-[#9ca3af]">
                        {formatDate(d.dueDate)}
                        {d.institution ? ` · ${d.institution}` : ""}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <GrantPill tone={STATUS_TONE[d.status]}>{STATUS_LABEL[d.status](t)}</GrantPill>
                    <span
                      className={cn(
                        "text-xs",
                        overdue ? "font-medium text-[#b91c1c]" : "text-[#6b7280]"
                      )}
                    >
                      {relativeDeadline(d.dueDate, undefined, t)}
                    </span>
                  </div>
                </GrantCard>
              </li>
            )
          })}
        </ol>
      )}
    </div>
  )
}
