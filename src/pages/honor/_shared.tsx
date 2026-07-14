// The Honor Foundation — Coach Workbench: shared UI primitives (reskin layer).
//
// Honor-branded counterparts to the GRANT `_shared` primitives: same structure
// and props, restyled with the THF navy/orange identity (via the `.vertical-honor`
// tokens set in index.css). The FUNCTIONAL components (chat, PRISM, documents)
// are reused unchanged elsewhere — only this presentational chrome is reskinned.

import type { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import type { PrismQuad } from "@/types/honor"

const NAVY = "#1B2A4A"
const ORANGE = "#E8792B"

type Tone = "navy" | "orange" | "gold" | "green" | "blue" | "gray" | "ok" | "warn"

const TONE_CLASSES: Record<Tone, string> = {
  navy: "bg-[rgba(27,42,74,0.10)] text-[#1B2A4A]",
  orange: "bg-[rgba(232,121,43,0.12)] text-[#c9631a]",
  gold: "bg-[rgba(216,161,58,0.16)] text-[#9a6f14]",
  green: "bg-[rgba(63,157,107,0.14)] text-[#2f7a52]",
  blue: "bg-[rgba(58,110,165,0.14)] text-[#2f5a86]",
  gray: "bg-[#f1f3f7] text-[#5b6678]",
  ok: "bg-[rgba(47,143,91,0.14)] text-[#2f8f5b]",
  warn: "bg-[rgba(192,71,43,0.12)] text-[#c0472b]",
}

const BAR_CLASSES: Record<Tone, string> = {
  navy: "bg-[#1B2A4A]",
  orange: "bg-[#E8792B]",
  gold: "bg-[#d8a13a]",
  green: "bg-[#3f9d6b]",
  blue: "bg-[#3a6ea5]",
  gray: "bg-[#c6cdd9]",
  ok: "bg-[#2f8f5b]",
  warn: "bg-[#c0472b]",
}

const QUAD_COLOR: Record<PrismQuad, string> = {
  G: "#d8a13a", // Gold
  N: "#3f9d6b", // Green
  B: "#3a6ea5", // Blue
  O: "#E8792B", // Orange
}

/** Standard page header: icon chip + title + subtitle. */
export function HonorPageHeader({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon
  title: string
  description?: string
  action?: React.ReactNode
}) {
  return (
    <div className="mb-6 flex items-start justify-between gap-4">
      <div>
        <div className="mb-1 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg" style={{ background: "rgba(27,42,74,0.10)" }}>
            <Icon className="h-5 w-5" style={{ color: NAVY }} />
          </div>
          <h1 className="text-2xl font-semibold text-[#18202f]">{title}</h1>
        </div>
        {description && <p className="text-[#5b6678]">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}

/** White surface card with the shared border + radius. */
export function HonorCard({
  className,
  children,
}: {
  className?: string
  children: React.ReactNode
}) {
  return (
    <div className={cn("rounded-[10px] border border-[#dfe4ec] bg-white p-5", className)}>{children}</div>
  )
}

/** Dashed empty-state panel. */
export function HonorEmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-[10px] border border-dashed border-[#c6cdd9] bg-white p-10 text-center text-[#5b6678]">
      {children}
    </div>
  )
}

/** Small pill label; tone drives the color pair. */
export function HonorPill({ tone, children }: { tone: Tone; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        TONE_CLASSES[tone]
      )}
    >
      {children}
    </span>
  )
}

/** A labeled progress meter. */
export function HonorMeter({
  value,
  tone = "navy",
  label,
  right,
  className,
}: {
  value: number
  tone?: Tone
  label?: React.ReactNode
  right?: React.ReactNode
  className?: string
}) {
  const pct = Math.max(0, Math.min(100, value))
  return (
    <div className={className}>
      {(label || right) && (
        <div className="mb-1.5 flex items-center justify-between text-sm">
          <span className="font-medium text-[#374151]">{label}</span>
          <span className="font-semibold text-[#18202f]">{right}</span>
        </div>
      )}
      <div className="h-2 w-full overflow-hidden rounded-full bg-[#eef1f4]">
        <div className={cn("h-full rounded-full transition-all", BAR_CLASSES[tone])} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

/** A compact metric tile: icon chip + label + big value + optional hint. */
export function HonorStat({
  icon: Icon,
  label,
  value,
  hint,
  tone = "navy",
}: {
  icon: LucideIcon
  label: string
  value: React.ReactNode
  hint?: React.ReactNode
  tone?: Tone
}) {
  return (
    <section className="rounded-[10px] border border-[#dfe4ec] bg-white p-5">
      <div className="mb-2 flex items-center gap-2 text-[#374151]">
        <span className={cn("flex h-6 w-6 items-center justify-center rounded-md", TONE_CLASSES[tone])}>
          <Icon className="h-3.5 w-3.5" />
        </span>
        <h2 className="text-sm font-semibold">{label}</h2>
      </div>
      <p className="text-3xl font-bold text-[#18202f]">{value}</p>
      {hint && <p className="mt-1 text-xs text-[#9299a6]">{hint}</p>}
    </section>
  )
}

/** Section heading with an optional right-aligned action/slot. */
export function HonorSectionTitle({
  children,
  action,
  className,
}: {
  children: React.ReactNode
  action?: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn("mb-3 flex items-center justify-between", className)}>
      <h2 className="text-sm font-semibold uppercase tracking-wide text-[#5b6678]">{children}</h2>
      {action}
    </div>
  )
}

/** PRISM quadrant dots + label, e.g. ●● Gold-Green. */
export function PrismDots({ quads, label }: { quads: PrismQuad[]; label?: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="inline-flex items-center gap-0.5">
        {quads.map((q, i) => (
          <span
            key={`${q}-${i}`}
            className="inline-block h-2.5 w-2.5 rounded-full"
            style={{ background: QUAD_COLOR[q] }}
            aria-hidden
          />
        ))}
      </span>
      {label && <span className="text-sm text-[#18202f]">{label}</span>}
    </span>
  )
}

/** Agent trace chip row, e.g. Aura → James → Nova → Meridian. */
export function AgentTraceRow({ trace }: { trace: string[] }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-medium text-[#5b6678]">
      <span className="uppercase tracking-wide text-[#9299a6]">Trace</span>
      {trace.map((a, i) => (
        <span key={a} className="inline-flex items-center gap-1.5">
          <span
            className="rounded-full px-2 py-0.5"
            style={{
              background: a === "Meridian" ? "rgba(232,121,43,0.12)" : "rgba(27,42,74,0.08)",
              color: a === "Meridian" ? ORANGE : NAVY,
            }}
          >
            {a}
          </span>
          {i < trace.length - 1 && <span className="text-[#c6cdd9]">→</span>}
        </span>
      ))}
    </div>
  )
}
