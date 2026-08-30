import { useMemo, useState } from "react"
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

const TYPE_LABELS: Record<DeadlineType, string> = {
  federal: "Federal",
  state: "State",
  institutional: "Institutional",
  scholarship: "Scholarship",
}

const STATUS_TONE: Record<DeadlineStatus, "amber" | "red" | "blue" | "green"> = {
  "due-soon": "amber",
  overdue: "red",
  upcoming: "blue",
  submitted: "green",
}

const STATUS_LABEL: Record<DeadlineStatus, string> = {
  "due-soon": "Due soon",
  overdue: "Overdue",
  upcoming: "Upcoming",
  submitted: "Submitted",
}

type Filter = "all" | DeadlineType

// ── FAFSA readiness ──────────────────────────────────────────────────────────

type FafsaView = { label: string; tone: Tone; pct: number; next: string }

const FAFSA_VIEW: Record<FafsaStatusValue, FafsaView> = {
  submitted: {
    label: "Submitted",
    tone: "green",
    pct: 100,
    next: "Your FAFSA is on file — watch state and institutional deadlines next.",
  },
  in_progress: {
    label: "In progress",
    tone: "amber",
    pct: 60,
    next: "Finish and submit your FAFSA before the federal deadline to lock in aid.",
  },
  not_started: {
    label: "Not started",
    tone: "red",
    pct: 10,
    next: "Start your FAFSA at studentaid.gov — it unlocks federal, state, and school aid.",
  },
}

/** Fall back to the FAFSA deadline's status when the intake profile is silent. */
function deadlineToFafsa(status?: DeadlineStatus): FafsaStatusValue {
  if (status === "submitted") return "submitted"
  if (status === "due-soon" || status === "overdue") return "in_progress"
  return "not_started"
}

// ── Federal aid programs (illustrative 2025–26 figures) ──────────────────────

type FederalTile = { icon: LucideIcon; label: string; value: string; hint: string; tone: Tone }

const FEDERAL_TILES: readonly FederalTile[] = [
  {
    icon: GraduationCap,
    label: "Pell Grant",
    value: "$7,395",
    hint: "Need-based, doesn't repay — your SAI sets the award.",
    tone: "blue",
  },
  {
    icon: Banknote,
    label: "Direct Subsidized",
    value: "$3,500",
    hint: "Stafford, need-based — no interest while enrolled.",
    tone: "teal",
  },
  {
    icon: Banknote,
    label: "Direct Unsubsidized",
    value: "$2,000",
    hint: "Stafford, not need-based — interest accrues at once.",
    tone: "amber",
  },
  {
    icon: Briefcase,
    label: "Work-Study",
    value: "$2,500",
    hint: "Earn aid through a part-time campus job.",
    tone: "green",
  },
]

// ── State programs (keyed by residence, generic fallback) ────────────────────

type StateProgram = { name: string; hint: string }

const STATE_PROGRAMS: Record<string, StateProgram[]> = {
  CA: [
    { name: "Cal Grant A", hint: "Tuition & fees at four-year schools" },
    { name: "Cal Grant B", hint: "Living-cost stipend for low-income students" },
    { name: "Middle Class Scholarship", hint: "Up to 40% of remaining UC/CSU cost" },
    { name: "Chafee Grant", hint: "For current & former foster youth" },
  ],
}

function stateProgramsFor(state?: string): StateProgram[] {
  if (state && STATE_PROGRAMS[state]) return STATE_PROGRAMS[state]
  return [
    { name: "State need grant", hint: "Income-based aid from your state agency" },
    { name: "Merit scholarship", hint: "GPA/test-based award from your state" },
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
      (t) => t === "all" || present.has(t as DeadlineType)
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

  const statePrograms = stateProgramsFor(profile?.stateOfResidence)
  const sai: StudentProfile["studentAidIndex"] | undefined = profile?.studentAidIndex

  return (
    <div className="max-w-3xl">
      <GrantPageHeader
        icon={Landmark}
        title="Federal & State Aid"
        description="FAFSA, Pell Grants, and state aid deadlines ordered by what's due next."
      />

      {/* FAFSA / SAI readiness hero */}
      <GrantCard className="mb-6 flex flex-col gap-5 sm:flex-row sm:items-stretch">
        <div className="flex-1">
          <div className="mb-2 flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[rgba(59,91,255,0.1)]">
              <FileText className="h-3.5 w-3.5 text-[#3B5BFF]" />
            </span>
            <h2 className="text-sm font-semibold text-[#374151]">FAFSA readiness</h2>
            <GrantPill tone={fafsa.tone}>{fafsa.label}</GrantPill>
          </div>
          <GrantMeter value={fafsa.pct} tone={fafsa.tone} />
          <p className="mt-3 flex items-start gap-1.5 text-sm text-[#374151]">
            <ArrowRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#3B5BFF]" />
            <span>{fafsa.next}</span>
          </p>
        </div>
        <div className="w-full shrink-0 rounded-lg border border-[#e5e7eb] bg-[#f9fafb] p-4 sm:w-56">
          <div className="mb-1 flex items-center gap-2 text-[#374151]">
            <Coins className="h-4 w-4 text-[#0f766e]" />
            <span className="text-sm font-semibold">Student Aid Index</span>
          </div>
          <p className="text-3xl font-bold text-[#1f2937]">
            {sai !== undefined ? sai.toLocaleString("en-US") : "—"}
          </p>
          <p className="mt-1 text-xs text-[#9ca3af]">Lower SAI unlocks more need-based aid.</p>
        </div>
      </GrantCard>

      {/* Federal aid programs */}
      <GrantSectionTitle>Federal programs</GrantSectionTitle>
      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {FEDERAL_TILES.map((tile) => (
          <GrantStat
            key={tile.label}
            icon={tile.icon}
            label={tile.label}
            value={tile.value}
            hint={tile.hint}
            tone={tile.tone}
          />
        ))}
      </div>

      {/* State programs grouping */}
      <GrantSectionTitle>
        <span className="inline-flex items-center gap-1.5">
          <MapPin className="h-3.5 w-3.5" />
          State programs{profile?.stateOfResidence ? ` · ${profile.stateOfResidence}` : ""}
        </span>
      </GrantSectionTitle>
      <GrantCard className="mb-6">
        <ul className="divide-y divide-[#e5e7eb]">
          {statePrograms.map((p) => (
            <li key={p.name} className="flex items-center justify-between gap-3 py-2 first:pt-0 last:pb-0">
              <span className="text-sm font-medium text-[#1f2937]">{p.name}</span>
              <span className="text-right text-xs text-[#9ca3af]">{p.hint}</span>
            </li>
          ))}
        </ul>
      </GrantCard>

      {/* Deadline tracker */}
      <GrantSectionTitle>Deadlines</GrantSectionTitle>
      <div className="mb-5 flex flex-wrap gap-2">
        {types.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setFilter(t)}
            className={cn(
              "rounded-full border px-3 py-1 text-sm font-medium transition",
              filter === t
                ? "border-[#3B5BFF] bg-[rgba(59,91,255,0.08)] text-[#3B5BFF]"
                : "border-[#e5e7eb] bg-white text-[#6b7280] hover:border-[#cbd5e1]"
            )}
          >
            {t === "all" ? "All" : TYPE_LABELS[t as DeadlineType]}
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
        <GrantEmptyState>No deadlines in this category.</GrantEmptyState>
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
                        <GrantPill tone="gray">{TYPE_LABELS[d.type]}</GrantPill>
                      </div>
                      <p className="mt-0.5 text-xs text-[#9ca3af]">
                        {formatDate(d.dueDate)}
                        {d.institution ? ` · ${d.institution}` : ""}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <GrantPill tone={STATUS_TONE[d.status]}>{STATUS_LABEL[d.status]}</GrantPill>
                    <span
                      className={cn(
                        "text-xs",
                        overdue ? "font-medium text-[#b91c1c]" : "text-[#6b7280]"
                      )}
                    >
                      {relativeDeadline(d.dueDate)}
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
