import { cn } from "@/lib/utils"

const STYLES: Record<string, string> = {
  active: "bg-[#ECFDF5] text-[#059669]",
  meeting: "bg-[#FEFCE8] text-[#b7791f]",
  away: "bg-[#f3f4f6] text-[#6b7280]",
  pending: "bg-[#FEF3C7] text-[#92400E]",
  confirmed: "bg-[#D1FAE5] text-[#065F46]",
  new: "bg-[#DBEAFE] text-[#1E40AF]",
  leave: "bg-[rgba(236,201,75,0.15)] text-[#b7941a]",
}

type StatusBadgeProps = {
  status: string
  label?: string
}

export default function StatusBadge({ status, label }: StatusBadgeProps) {
  const style = STYLES[status.toLowerCase()] ?? STYLES.active
  return (
    <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full", style)}>
      {label ?? status}
    </span>
  )
}
