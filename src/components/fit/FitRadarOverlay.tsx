// The fit behaviour map: the job's polygon overlaid with the person's, one axis
// per priority dimension (the 9 Priority dimensions), and the text the JF-5
// tiles carried — group and dimension definitions, This job / You / Difference,
// Match / Close / Growth area — as a legend beside it.
//
// It takes the same `FitCardGroup[]` the tiles took, so it renders only on a
// priority-scored read (`scoring: "priority-9"`, set server-side when
// `job_fit_v2` applies). Every other read keeps the 22-dimension radar.
//
// Drawn as a small SVG here, not through the shared recharts wrapper
// (BlueprintRadarChart, also used by Job Blueprint authoring, is untouched):
// that wrapper plots a missing score as 0 (BP-F5). Here the job polygon always
// has every axis, and the person's polygon is drawn only through the
// dimensions they were measured on — a gap is never a 0.
//
// Accessibility: the chart is decorative (aria-hidden) because the legend
// carries every number and definition in visible text; axes are numbered and
// the numbers repeat in the legend. The status marker is text AND icon.

import { CheckCircle2, CircleDot, Sprout, type LucideIcon } from "lucide-react"
import { useTranslation } from "react-i18next"
import { cn } from "@/lib/utils"
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

const JOB_COLOR = "#0D9488"
const YOU_COLOR = "#805AD5"

const SIZE = 360
const CENTER = SIZE / 2
const RADIUS = 118
const LABEL_RADIUS = 140
const RINGS = [25, 50, 75, 100]

const STATUS_ICON: Record<FitCardStatus, LucideIcon> = {
  match: CheckCircle2,
  close: CircleDot,
  growth: Sprout,
}

const clamp = (v: number) => Math.max(0, Math.min(100, v))

function point(index: number, count: number, value: number, radius = RADIUS) {
  const angle = -Math.PI / 2 + (index * 2 * Math.PI) / count
  const r = (clamp(value) / 100) * radius
  return { x: CENTER + r * Math.cos(angle), y: CENTER + r * Math.sin(angle) }
}

const toPoints = (pts: { x: number; y: number }[]) =>
  pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ")

// The English constants in fit-definitions.ts stay the source and the default:
// the downloadable report (fitReport.ts) reads them directly and is unchanged.
// Only this on-screen legend translates them, through `fit.fitRadar.*` keys.
function StatusMarker({ status }: { status: FitCardStatus }) {
  const { t } = useTranslation("studioUi")
  const Icon = STATUS_ICON[status]
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-[#d1d5db] bg-[#f9fafb] px-2 py-0.5 text-xs font-medium text-[#374151]">
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      <span data-testid="fit-radar-status">
        {t(`fit.fitRadar.status.${status}.label`, { defaultValue: FIT_CARD_STATUS_LABELS[status] })}
      </span>
    </span>
  )
}

/** The radar itself. `items` is every priority dimension in axis order. */
function Radar({ items, label }: { items: FitCardItem[]; label: string }) {
  const n = items.length
  const job = items.map((it, i) => point(i, n, it.jobRating))
  // The person's polygon runs only through measured dimensions, in axis order.
  const you = items
    .map((it, i) => (it.personRating === null ? null : point(i, n, it.personRating)))
    .filter((p): p is { x: number; y: number } => p !== null)

  return (
    <svg
      data-testid="fit-radar"
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      className="mx-auto h-auto w-full max-w-[360px]"
      aria-hidden="true"
      focusable="false"
    >
      <title>{label}</title>
      {RINGS.map((ring) => (
        <polygon
          key={ring}
          points={toPoints(items.map((_, i) => point(i, n, ring)))}
          fill="none"
          stroke="#e2e8f0"
        />
      ))}
      {items.map((it, i) => {
        const edge = point(i, n, 100)
        const text = point(i, n, 100, LABEL_RADIUS)
        return (
          <g key={it.key}>
            <line x1={CENTER} y1={CENTER} x2={edge.x} y2={edge.y} stroke="#e2e8f0" />
            <text
              x={text.x}
              y={text.y}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize="13"
              fontWeight="600"
              fill="#475569"
            >
              {i + 1}
            </text>
          </g>
        )
      })}
      <polygon
        data-testid="fit-radar-job"
        points={toPoints(job)}
        fill={JOB_COLOR}
        fillOpacity={0.15}
        stroke={JOB_COLOR}
        strokeWidth={2}
      />
      {you.length >= 3 ? (
        <polygon
          data-testid="fit-radar-you"
          points={toPoints(you)}
          fill={YOU_COLOR}
          fillOpacity={0.1}
          stroke={YOU_COLOR}
          strokeWidth={2}
          strokeDasharray="6 4"
        />
      ) : you.length === 2 ? (
        <polyline
          data-testid="fit-radar-you"
          points={toPoints(you)}
          fill="none"
          stroke={YOU_COLOR}
          strokeWidth={2}
          strokeDasharray="6 4"
        />
      ) : null}
      {items.map((it, i) =>
        it.personRating === null ? null : (
          <circle
            key={it.key}
            data-testid="fit-radar-you-dot"
            cx={point(i, n, it.personRating).x}
            cy={point(i, n, it.personRating).y}
            r={3.5}
            fill={YOU_COLOR}
          />
        ),
      )}
    </svg>
  )
}

function Rating({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col">
      <dt className="text-[11px] uppercase tracking-wide text-[#6b7280]">{label}</dt>
      <dd className="text-base font-semibold text-[#1f2937]">{value}</dd>
    </div>
  )
}

function LegendRow({ item, number }: { item: FitCardItem; number: number }) {
  const { t } = useTranslation("studioUi")
  const measured = item.personRating !== null && item.difference !== null
  return (
    <li data-testid="fit-radar-legend-item" className="rounded-lg border border-[#e5e7eb] bg-white p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2">
          <span
            aria-hidden="true"
            className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#475569] text-[11px] font-semibold text-white"
          >
            {number}
          </span>
          <span className="text-sm font-medium text-[#1f2937]">
            <span className="sr-only">{number}. </span>
            {item.dimensionName}
          </span>
        </div>
        {item.status && <StatusMarker status={item.status} />}
      </div>
      {item.definition && <p className="mt-1 text-xs text-[#6b7280]">{item.definition}</p>}
      <dl className={cn("mt-2 grid gap-2", measured ? "grid-cols-3" : "grid-cols-2")}>
        <Rating label={t("fit.fitCards.thisJob", { defaultValue: "This job" })} value={item.jobRating} />
        {measured ? (
          <>
            <Rating label={t("fit.fitCards.you", { defaultValue: "You" })} value={item.personRating} />
            <Rating
              label={t("fit.fitCards.difference", { defaultValue: "Difference" })}
              value={formatGap(item.difference as number)}
            />
          </>
        ) : (
          <Rating
            label={t("fit.fitCards.you", { defaultValue: "You" })}
            value={
              <span className="text-sm font-medium text-[#6b7280]">
                {t("fit.fitRadar.notMeasured", { defaultValue: NOT_MEASURED })}
              </span>
            }
          />
        )}
      </dl>
    </li>
  )
}

/** The behaviour map plus its legend, for one priority-scored breakdown. */
export function FitRadarOverlay({ groups }: { groups: FitCardGroup[] }) {
  const { t } = useTranslation("studioUi")
  const items = groups.flatMap((g) => g.items)
  const hasChart = items.length >= 3
  const numberOf = new Map(items.map((it, i) => [it.key, i + 1]))
  const statuses: FitCardStatus[] = ["match", "close", "growth"]
  const jobLabel = t("fit.fitCards.thisJob", { defaultValue: "This job" })
  const youLabel = t("fit.fitCards.you", { defaultValue: "You" })
  const chartLabel = t("fit.fitRadar.chartLabel", {
    defaultValue: "Behavior map: this job and you across the dimensions it puts first",
  })

  return (
    <div data-testid="fit-radar-overlay" className="space-y-4">
      <p className="text-sm text-[#6b7280]">
        {t("fit.fitRadar.intro", {
          defaultValue:
            "The dimensions this role puts first. The shaded shape is what the job asks for; the dashed shape is you. The numbers match the legend.",
        })}
      </p>
      {/* Fewer than three axes is no chart: drop the whole chart column (series key and note too) and its grid track. */}
      <div className={cn("grid grid-cols-1 gap-6", hasChart && "lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)]")}>
        {hasChart && (
        <div data-testid="fit-radar-chart-column">
          <Radar items={items} label={chartLabel} />
          <ul
            data-testid="fit-radar-series-key"
            className="mt-2 flex flex-wrap justify-center gap-x-5 gap-y-1 text-xs text-[#374151]"
          >
            <li className="flex items-center gap-1.5">
              <svg width="26" height="8" aria-hidden="true">
                <line x1="0" y1="4" x2="26" y2="4" stroke={JOB_COLOR} strokeWidth="2" />
              </svg>
              {jobLabel}
            </li>
            <li className="flex items-center gap-1.5">
              <svg width="26" height="8" aria-hidden="true">
                <line x1="0" y1="4" x2="26" y2="4" stroke={YOU_COLOR} strokeWidth="2" strokeDasharray="6 4" />
              </svg>
              {youLabel}
            </li>
          </ul>
          {items.some((it) => it.personRating === null) && (
            <p className="mt-2 text-center text-xs text-[#6b7280]">
              {t("fit.fitRadar.notMeasuredNote", {
                defaultValue: "A dimension you have not been measured on is left off your shape rather than drawn as zero.",
              })}
            </p>
          )}
        </div>
        )}

        <div data-testid="fit-radar-legend" className="space-y-5">
          {groups.map((g) => {
            const groupLabel = t(`fit.fitRadar.group.${g.category}.label`, {
              defaultValue: FIT_CARD_GROUP_LABELS[g.category],
            })
            const groupDefinition = t(`fit.fitRadar.group.${g.category}.definition`, {
              defaultValue: FIT_CARD_GROUP_DEFINITIONS[g.category],
            })
            return (
            <section key={g.category} aria-label={groupLabel}>
              <h3 className="text-sm font-semibold text-[#1f2937]">{groupLabel}</h3>
              <p className="mb-2 text-xs text-[#6b7280]">{groupDefinition}</p>
              <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {g.items.map((item) => (
                  <LegendRow key={item.key} item={item} number={numberOf.get(item.key) ?? 0} />
                ))}
              </ul>
            </section>
            )
          })}
          <dl data-testid="fit-radar-status-key" className="grid grid-cols-1 gap-2 border-t border-[#e5e7eb] pt-3 sm:grid-cols-3">
            {statuses.map((s) => (
              <div key={s} className="text-xs text-[#374151]">
                <dt className="mb-1">
                  <StatusMarker status={s} />
                </dt>
                <dd className="text-[#6b7280]">
                  {t(`fit.fitRadar.status.${s}.definition`, { defaultValue: FIT_CARD_STATUS_DEFINITIONS[s] })}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </div>
  )
}
