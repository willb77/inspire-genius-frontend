import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Check, Info, X } from "lucide-react"
import { toast } from "sonner"

type ReviewItem = {
  id: string
  date: string
  agent: string
  originalResponse: string
  correctedResponse: string
  submittedBy: string
  status: "pending" | "approved" | "rejected"
}

const MOCK_QUEUE: ReviewItem[] = [
  { id: "r1", date: "2026-03-21", agent: "Meridian", originalResponse: "Based on your PRISM profile, you should focus on improving your leadership delegation skills by setting clearer expectations.", correctedResponse: "Based on your PRISM profile, consider developing delegation skills through structured task assignment with defined outcomes and check-in points.", submittedBy: "Jordan Mitchell", status: "pending" },
  { id: "r2", date: "2026-03-21", agent: "Aura", originalResponse: "Your team's communication issues are likely due to personality conflicts.", correctedResponse: "Your team's communication patterns suggest differing PRISM profiles may benefit from structured communication frameworks like DISC alignment.", submittedBy: "Sarah Lee", status: "pending" },
  { id: "r3", date: "2026-03-20", agent: "Nova", originalResponse: "You should consider changing careers if you're not satisfied.", correctedResponse: "Let's explore what aspects of your current role align with your values and identify areas where adjustments could improve satisfaction.", submittedBy: "Alex Thompson", status: "pending" },
  { id: "r4", date: "2026-03-20", agent: "Atlas", originalResponse: "Your goals are too ambitious for your current skill level.", correctedResponse: "Your goals are challenging — let's break them into milestones with skill-building steps to create a realistic timeline.", submittedBy: "Maria Garcia", status: "pending" },
  { id: "r5", date: "2026-03-19", agent: "Meridian", originalResponse: "The conflict in your team is normal and will resolve itself.", correctedResponse: "Team conflicts require active management. Let's discuss specific mediation strategies tailored to the PRISM profiles involved.", submittedBy: "Chris Martin", status: "pending" },
]

export default function RlhfReviewQueue() {
  const [items, setItems] = useState(MOCK_QUEUE)

  function handleAction(id: string, action: "approved" | "rejected") {
    setItems((prev) => prev.map((item) => item.id === id ? { ...item, status: action } : item))
    toast.success(`Correction ${action}`)
  }

  const pending = items.filter((i) => i.status === "pending")
  const reviewed = items.filter((i) => i.status !== "pending")

  return (
    <div className="space-y-4">
      <div className="rounded-md bg-blue-50 border border-blue-200 p-3 mb-4 flex items-start gap-2">
        <Info className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
        <p className="text-xs text-blue-800">
          Showing sample data. This section will be populated with live data once the RLHF service endpoints are deployed.
        </p>
      </div>

      <div className="flex items-center justify-between">
        <h3 className="text-[15px] font-semibold text-[#111827]">
          Review Queue <span className="text-[#3B5BFF] text-[13px]">({pending.length} pending)</span>
        </h3>
      </div>

      {pending.length === 0 && (
        <p className="text-[13px] text-[#9ca3af] py-4 text-center">All corrections have been reviewed.</p>
      )}

      {pending.map((item) => (
        <div key={item.id} className="border border-[#e5e7eb] rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-[13px] font-semibold text-[#1f2937]">{item.agent}</span>
              <span className="text-[11px] text-[#9ca3af]">{item.date}</span>
              <span className="text-[11px] text-[#6b7280]">by {item.submittedBy}</span>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" className="gap-1 text-[#10B981] border-[#10B981] hover:bg-[#ECFDF5]" onClick={() => handleAction(item.id, "approved")}>
                <Check className="w-3.5 h-3.5" /> Approve
              </Button>
              <Button size="sm" variant="outline" className="gap-1 text-[#EF4444] border-[#EF4444] hover:bg-[#FEF2F2]" onClick={() => handleAction(item.id, "rejected")}>
                <X className="w-3.5 h-3.5" /> Reject
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-[10px] font-semibold text-[#991B1B] uppercase mb-1">Original</div>
              <div className="text-[12px] text-[#374151] bg-[#FEF2F2] border border-[#FECACA] rounded p-2">{item.originalResponse}</div>
            </div>
            <div>
              <div className="text-[10px] font-semibold text-[#065F46] uppercase mb-1">Corrected</div>
              <div className="text-[12px] text-[#374151] bg-[#ECFDF5] border border-[#A7F3D0] rounded p-2">{item.correctedResponse}</div>
            </div>
          </div>
        </div>
      ))}

      {reviewed.length > 0 && (
        <div className="mt-4">
          <h4 className="text-[13px] font-semibold text-[#6b7280] mb-2">Recently Reviewed ({reviewed.length})</h4>
          {reviewed.map((item) => (
            <div key={item.id} className="flex items-center justify-between py-2 border-b border-[#f3f4f6] last:border-b-0">
              <div className="flex items-center gap-2">
                <span className="text-[13px] text-[#374151]">{item.agent}: {item.originalResponse.slice(0, 60)}...</span>
              </div>
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${item.status === "approved" ? "bg-[#D1FAE5] text-[#065F46]" : "bg-[#FEE2E2] text-[#991B1B]"}`}>
                {item.status}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
