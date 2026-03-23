import { useState } from "react"
import UserLayout from "@/layouts/UserLayout"
import DataCard from "@/components/dashboard/DataCard"
import FeedbackIndicator from "@/components/feedback/FeedbackIndicator"

type FeedbackType = "positive" | "negative" | "correction"

type FeedbackEntry = {
  id: string
  date: string
  coach: string
  responsePreview: string
  type: FeedbackType
  status: "submitted" | "reviewed" | "applied"
}

const MOCK_FEEDBACK: FeedbackEntry[] = [
  { id: "f1", date: "2026-03-21 14:30", coach: "Meridian", responsePreview: "Based on your PRISM profile, I'd recommend focusing on...", type: "positive", status: "submitted" },
  { id: "f2", date: "2026-03-21 10:15", coach: "Aura", responsePreview: "Your leadership style assessment indicates...", type: "correction", status: "reviewed" },
  { id: "f3", date: "2026-03-20 16:45", coach: "Nova", responsePreview: "For your career development plan, consider these steps...", type: "negative", status: "submitted" },
  { id: "f4", date: "2026-03-20 09:00", coach: "Meridian", responsePreview: "The team dynamics analysis shows that your group has...", type: "positive", status: "applied" },
  { id: "f5", date: "2026-03-19 15:20", coach: "Atlas", responsePreview: "Your goal progress for Q1 is ahead of schedule...", type: "positive", status: "submitted" },
  { id: "f6", date: "2026-03-19 11:30", coach: "Echo", responsePreview: "The conflict resolution framework suggests...", type: "correction", status: "reviewed" },
  { id: "f7", date: "2026-03-18 14:00", coach: "Meridian", responsePreview: "Based on recent session data, your engagement has...", type: "positive", status: "applied" },
  { id: "f8", date: "2026-03-18 10:45", coach: "Sage", responsePreview: "Your communication style analysis reveals...", type: "negative", status: "submitted" },
  { id: "f9", date: "2026-03-17 16:10", coach: "Aura", responsePreview: "The PRISM reassessment shows improvement in...", type: "positive", status: "reviewed" },
  { id: "f10", date: "2026-03-17 09:30", coach: "Nova", responsePreview: "For the upcoming presentation, I suggest...", type: "correction", status: "applied" },
]

const COACHES = ["All", "Meridian", "Aura", "Nova", "Atlas", "Echo", "Sage"]
const TYPES: Array<"all" | FeedbackType> = ["all", "positive", "negative", "correction"]

const statusBg: Record<string, string> = {
  submitted: "bg-[#EFF6FF] text-[#3B5BFF]",
  reviewed: "bg-[#FEF3C7] text-[#92400E]",
  applied: "bg-[#D1FAE5] text-[#065F46]",
}

export default function FeedbackHistory() {
  const [typeFilter, setTypeFilter] = useState<"all" | FeedbackType>("all")
  const [coachFilter, setCoachFilter] = useState("All")

  const filtered = MOCK_FEEDBACK.filter((f) => {
    if (typeFilter !== "all" && f.type !== typeFilter) return false
    if (coachFilter !== "All" && f.coach !== coachFilter) return false
    return true
  })

  return (
    <UserLayout>
      <h1 className="text-xl font-bold text-[#111827] mb-1">Feedback History</h1>
      <p className="text-[13px] text-[#6b7280] mb-5">Review all feedback you've submitted on AI coach responses.</p>

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        {[
          { label: "Total Feedback", value: MOCK_FEEDBACK.length },
          { label: "Positive", value: MOCK_FEEDBACK.filter((f) => f.type === "positive").length },
          { label: "Negative", value: MOCK_FEEDBACK.filter((f) => f.type === "negative").length },
          { label: "Corrections", value: MOCK_FEEDBACK.filter((f) => f.type === "correction").length },
        ].map((s) => (
          <div key={s.label} className="bg-white border border-[#e5e7eb] rounded-lg p-3.5">
            <div className="text-xs text-[#6b7280]">{s.label}</div>
            <div className="text-2xl font-bold text-[#111827]">{s.value}</div>
          </div>
        ))}
      </div>

      <DataCard title="Feedback">
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as "all" | FeedbackType)}
            className="border border-[#e5e7eb] rounded-lg px-3 py-1.5 text-[13px] outline-none focus:border-[#3B5BFF]"
          >
            {TYPES.map((t) => (
              <option key={t} value={t}>{t === "all" ? "All Types" : t.charAt(0).toUpperCase() + t.slice(1)}</option>
            ))}
          </select>
          <select
            value={coachFilter}
            onChange={(e) => setCoachFilter(e.target.value)}
            className="border border-[#e5e7eb] rounded-lg px-3 py-1.5 text-[13px] outline-none focus:border-[#3B5BFF]"
          >
            {COACHES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <span className="text-xs text-[#9ca3af]">{filtered.length} result{filtered.length !== 1 ? "s" : ""}</span>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-[#f9fafb] border-b border-[#e5e7eb]">
                {["Date", "Coach", "Response", "Type", "Status"].map((h) => (
                  <th key={h} className="text-left text-[10px] font-bold uppercase tracking-wider text-[#6b7280] px-3 py-2.5">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((f) => (
                <tr key={f.id} className="border-b border-[#f3f4f6] hover:bg-[#f9fafb]">
                  <td className="px-3 py-2.5 text-xs text-[#6b7280] whitespace-nowrap">{f.date}</td>
                  <td className="px-3 py-2.5 text-[13px] font-medium text-[#374151]">{f.coach}</td>
                  <td className="px-3 py-2.5 text-[13px] text-[#374151] max-w-[300px] truncate">{f.responsePreview}</td>
                  <td className="px-3 py-2.5"><FeedbackIndicator type={f.type} /></td>
                  <td className="px-3 py-2.5">
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize ${statusBg[f.status]}`}>{f.status}</span>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={5} className="px-3 py-8 text-center text-[13px] text-[#9ca3af]">No feedback matching filters</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </DataCard>
    </UserLayout>
  )
}
