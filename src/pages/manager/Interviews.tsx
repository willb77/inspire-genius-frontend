import ManagerLayout from "@/layouts/ManagerLayout"
import { Briefcase } from "lucide-react"

export default function ManagerInterviews() {
  return (
    <ManagerLayout>
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-14 h-14 rounded-full bg-[#EEF2FF] flex items-center justify-center mb-4">
          <Briefcase className="w-7 h-7 text-[#3B5BFF]" />
        </div>
        <h1 className="text-xl font-bold text-[#111827] mb-2">Interviews</h1>
        <p className="text-[13px] text-[#6b7280] max-w-md">
          Coming Soon — This page will provide a dedicated view for scheduling, managing, and reviewing interviews with candidates across all open positions.
        </p>
        <span className="mt-4 text-[11px] font-semibold text-[#3B5BFF] bg-[#EEF2FF] px-3 py-1 rounded-full">
          Under Development
        </span>
      </div>
    </ManagerLayout>
  )
}
