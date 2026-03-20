import type { PRISMDimension } from "@/types/dashboard/data-types"

const DEFAULT_DIMENSIONS: PRISMDimension[] = [
  { label: "Gold", value: 72, bg: "#FEF2F2", color: "#E53E3E" },
  { label: "Green", value: 85, bg: "#ECFDF5", color: "#38A169" },
  { label: "Yellow", value: 58, bg: "#FEFCE8", color: "#b7791f" },
  { label: "Blue", value: 64, bg: "#EFF6FF", color: "#3182CE" },
]

type PRISMPillsProps = {
  dimensions?: PRISMDimension[]
}

export default function PRISMPills({ dimensions = DEFAULT_DIMENSIONS }: PRISMPillsProps) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {dimensions.map((d) => (
        <span
          key={d.label}
          className="text-[11px] font-semibold px-2.5 py-1 rounded-full"
          style={{ backgroundColor: d.bg, color: d.color }}
        >
          {d.label} {d.value}%
        </span>
      ))}
    </div>
  )
}
