type ProgressBarProps = {
  value: number
  color?: string
  label?: string
  showPct?: boolean
}

export default function ProgressBar({ value, color = "#3B5BFF", label, showPct = true }: ProgressBarProps) {
  return (
    <div className="flex items-center gap-2.5">
      {label && <span className="text-xs font-medium text-[#374151] w-[100px] shrink-0">{label}</span>}
      <div className="flex-1 h-2 bg-[#f3f4f6] rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${value}%`, backgroundColor: color }} />
      </div>
      {showPct && <span className="text-xs font-semibold w-9 text-right shrink-0" style={{ color }}>{value}%</span>}
    </div>
  )
}
