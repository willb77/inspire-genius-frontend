import { Info } from "lucide-react"

export default function PlaceholderBanner() {
  return (
    <div className="flex items-center gap-2 bg-[#FEF3C7] border border-[#FDE68A] rounded-lg px-3.5 py-2 mb-4">
      <Info className="w-4 h-4 text-[#92400E] shrink-0" />
      <span className="text-[12px] text-[#92400E] font-medium">
        Sample data — This page displays placeholder content. Live data will appear once the API is connected.
      </span>
    </div>
  )
}
