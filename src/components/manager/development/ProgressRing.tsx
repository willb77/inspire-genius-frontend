import { cn } from "@/lib/utils"

export type ProgressRingProps = {
  /** 0–100. */
  value: number
  size?: number
  strokeWidth?: number
  className?: string
  label?: string
}

/** Small SVG progress ring for milestone completion. */
export function ProgressRing({ value, size = 36, strokeWidth = 4, className, label }: ProgressRingProps) {
  const clamped = Math.max(0, Math.min(100, Math.round(value)))
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (clamped / 100) * circumference
  return (
    <div
      className={cn("relative inline-flex items-center justify-center", className)}
      role="img"
      aria-label={label ?? `${clamped}% complete`}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#e5e7eb" strokeWidth={strokeWidth} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#3B5BFF"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      <span className="absolute text-[9px] font-semibold text-slate-600">{clamped}%</span>
    </div>
  )
}
