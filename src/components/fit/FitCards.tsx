// JF-5 — the fit card graphic: one card per priority dimension, grouped by
// category, showing what the job asks for, the person's rating and the
// difference. It replaces the radar on the Careers and Jobs breakdown only;
// Job Blueprint authoring keeps the radar (BenchmarkRadarChart is untouched).
//
// D5: one neutral colour per group, and a status marker — match / close /
// growth area — that is always text AND icon, never colour alone, so it reads
// in print and for colour-blind users.

import { useId, useState, type ReactNode } from "react"
import { CheckCircle2, CircleDot, Sprout, type LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import type { DimensionCategory } from "@/types/job-blueprint"
import {
  FIT_CARD_GROUP_DEFINITIONS,
  FIT_CARD_GROUP_LABELS,
  FIT_CARD_STATUS_DEFINITIONS,
  FIT_CARD_STATUS_LABELS,
  type FitCardStatus,
} from "@/constants/fit-definitions"
import { NOT_MEASURED } from "@/lib/job-fit/coverage"
import { formatGap } from "./fit"
import type { FitCardGroup, FitCardItem } from "./FitCardsModel"

/** One neutral accent per group (border + heading rule). Never a status colour. */
const GROUP_ACCENT: Record<DimensionCategory, string> = {
  behavior: "border-l-[#475569]",
  aptitude: "border-l-[#8a7560]",
  "core-trait": "border-l-[#5f7161]",
}

const STATUS_ICON: Record<FitCardStatus, LucideIcon> = {
  match: CheckCircle2,
  close: CircleDot,
  growth: Sprout,
}

/**
 * A term whose definition opens on hover, keyboard focus or tap, and closes on
 * Escape, blur or a second tap. The definition is always linked by
 * aria-describedby, so a screen reader hears it on focus whether or not it is
 * drawn.
 */
function DefinitionTerm({
  children,
  definition,
  className,
}: {
  children: ReactNode
  definition: string
  className?: string
}) {
  const id = useId()
  const [hovered, setHovered] = useState(false)
  const [focused, setFocused] = useState(false)
  const [pinned, setPinned] = useState(false)
  const open = hovered || focused || pinned

  const closeAll = () => {
    setHovered(false)
    setFocused(false)
    setPinned(false)
  }

  return (
    <span className="relative inline-block">
      <button
        type="button"
        className={cn(
          "cursor-help rounded text-left underline decoration-dotted underline-offset-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0D9488]",
          className,
        )}
        aria-describedby={id}
        aria-expanded={open}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onFocus={() => setFocused(true)}
        onBlur={closeAll}
        onClick={() => (open ? closeAll() : setPinned(true))}
        onKeyDown={(e) => {
          if (e.key === "Escape") closeAll()
        }}
      >
        {children}
      </button>
      <span
        id={id}
        role="tooltip"
        hidden={!open}
        className="absolute left-0 top-full z-20 mt-1 w-64 rounded-md border border-[#e5e7eb] bg-white p-2 text-xs font-normal text-[#374151] shadow-md"
      >
        {definition}
      </span>
    </span>
  )
}

function StatusMarker({ status }: { status: FitCardStatus }) {
  const Icon = STATUS_ICON[status]
  return (
    <DefinitionTerm
      definition={FIT_CARD_STATUS_DEFINITIONS[status]}
      className="inline-flex items-center gap-1 rounded-full border border-[#d1d5db] bg-[#f9fafb] px-2 py-0.5 text-xs font-medium text-[#374151] no-underline"
    >
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      <span data-testid="fit-card-status">{FIT_CARD_STATUS_LABELS[status]}</span>
    </DefinitionTerm>
  )
}

function Rating({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex flex-col">
      <dt className="text-[11px] uppercase tracking-wide text-[#6b7280]">{label}</dt>
      <dd className="text-lg font-semibold text-[#1f2937]">{value}</dd>
    </div>
  )
}

function FitCardTile({ item }: { item: FitCardItem }) {
  return (
    <li
      data-testid="fit-card"
      className={cn(
        "rounded-lg border border-[#e5e7eb] border-l-4 bg-white p-3",
        GROUP_ACCENT[item.category],
      )}
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        {item.definition ? (
          <DefinitionTerm definition={item.definition} className="text-sm font-medium text-[#1f2937]">
            {item.dimensionName}
          </DefinitionTerm>
        ) : (
          <span className="text-sm font-medium text-[#1f2937]">{item.dimensionName}</span>
        )}
        {item.status && <StatusMarker status={item.status} />}
      </div>
      {item.personRating === null || item.difference === null ? (
        <dl className="grid grid-cols-2 gap-2">
          <Rating label="This job" value={item.jobRating} />
          <Rating label="You" value={<span className="text-sm font-medium text-[#6b7280]">{NOT_MEASURED}</span>} />
        </dl>
      ) : (
        <dl className="grid grid-cols-3 gap-2">
          <Rating label="This job" value={item.jobRating} />
          <Rating label="You" value={item.personRating} />
          <Rating label="Difference" value={formatGap(item.difference)} />
        </dl>
      )}
    </li>
  )
}

/** The card graphic for one priority-scored breakdown. */
export function FitCards({ groups }: { groups: FitCardGroup[] }) {
  return (
    <div data-testid="fit-cards" className="space-y-5">
      {groups.map((g) => (
        <section key={g.category} aria-label={FIT_CARD_GROUP_LABELS[g.category]}>
          <h3 className={cn("mb-2 border-l-4 pl-2 text-sm font-semibold text-[#1f2937]", GROUP_ACCENT[g.category])}>
            <DefinitionTerm definition={FIT_CARD_GROUP_DEFINITIONS[g.category]}>
              {FIT_CARD_GROUP_LABELS[g.category]}
            </DefinitionTerm>
          </h3>
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {g.items.map((item) => (
              <FitCardTile key={item.key} item={item} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}
