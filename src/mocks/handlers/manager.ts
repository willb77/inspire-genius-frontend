import { http, HttpResponse } from "msw"

const TEAM_MEMBERS = [
  { id: "tm-1", name: "Alex Thompson", role: "Senior Developer", email: "alex.t@company.com", prismScore: 88, status: "active", avatar: "AT", avatarBg: "#3B82F6", goalsCompleted: 5, totalGoals: 7, trainingPct: 92, lastActive: "2 hours ago" },
  { id: "tm-2", name: "Maria Garcia", role: "UX Designer", email: "maria.g@company.com", prismScore: 82, status: "active", avatar: "MG", avatarBg: "#8B5CF6", goalsCompleted: 3, totalGoals: 5, trainingPct: 88, lastActive: "1 hour ago" },
  { id: "tm-3", name: "James Wilson", role: "Product Manager", email: "james.w@company.com", prismScore: 91, status: "meeting", avatar: "JW", avatarBg: "#E53E3E", goalsCompleted: 6, totalGoals: 8, trainingPct: 95, lastActive: "30 min ago" },
  { id: "tm-4", name: "Sarah Lee", role: "Data Analyst", email: "sarah.l@company.com", prismScore: 79, status: "active", avatar: "SL", avatarBg: "#2DD4BF", goalsCompleted: 4, totalGoals: 6, trainingPct: 85, lastActive: "3 hours ago" },
  { id: "tm-5", name: "Chris Martin", role: "DevOps Engineer", email: "chris.m@company.com", prismScore: 85, status: "away", avatar: "CM", avatarBg: "#6B7280", goalsCompleted: 7, totalGoals: 8, trainingPct: 90, lastActive: "Yesterday" },
  { id: "tm-6", name: "Priya Patel", role: "QA Lead", email: "priya.p@company.com", prismScore: 87, status: "active", avatar: "PP", avatarBg: "#10B981", goalsCompleted: 4, totalGoals: 5, trainingPct: 96, lastActive: "45 min ago" },
]

const CANDIDATES = [
  { id: "c-1", name: "Sarah Chen", position: "Frontend Developer", stage: "Interview", appliedDate: "2026-03-10", prismMatch: 85, status: "scheduled" },
  { id: "c-2", name: "Marcus Johnson", position: "Product Manager", stage: "Interview", appliedDate: "2026-03-08", prismMatch: 78, status: "scheduled" },
  { id: "c-3", name: "Elena Rodriguez", position: "UX Designer", stage: "Assessment", appliedDate: "2026-03-12", prismMatch: 92, status: "pending" },
  { id: "c-4", name: "David Kim", position: "Backend Engineer", stage: "Interview", appliedDate: "2026-03-06", prismMatch: 81, status: "scheduled" },
  { id: "c-5", name: "Lisa Wang", position: "Data Analyst", stage: "Screening", appliedDate: "2026-03-14", prismMatch: 74, status: "new" },
  { id: "c-6", name: "Tom Harris", position: "Frontend Developer", stage: "Offer", appliedDate: "2026-02-28", prismMatch: 88, status: "accepted" },
]

const INTERVIEWS = [
  { id: "i-1", candidateId: "c-1", candidateName: "Sarah Chen", position: "Frontend Developer", time: "9:00 AM", date: "2026-03-20", type: "Technical", status: "confirmed" },
  { id: "i-2", candidateId: "c-2", candidateName: "Marcus Johnson", position: "Product Manager", time: "10:30 AM", date: "2026-03-20", type: "Behavioral", status: "confirmed" },
  { id: "i-3", candidateId: "c-4", candidateName: "David Kim", position: "Backend Engineer", time: "1:00 PM", date: "2026-03-20", type: "Technical", status: "confirmed" },
  { id: "i-4", candidateId: "c-5", candidateName: "Lisa Wang", position: "Data Analyst", time: "2:30 PM", date: "2026-03-20", type: "Screening", status: "pending" },
]

export const managerHandlers = [
  http.get("/api/manager/team", () =>
    HttpResponse.json({ success: true, data: { members: TEAM_MEMBERS, total: TEAM_MEMBERS.length } })
  ),
  http.get("/api/manager/team/:id", ({ params }) => {
    const member = TEAM_MEMBERS.find((m) => m.id === params.id)
    if (!member) return HttpResponse.json({ success: false, message: "Not found" }, { status: 404 })
    return HttpResponse.json({ success: true, data: member })
  }),
  http.put("/api/manager/team/:id/training", async ({ params, request }) => {
    const body = (await request.json()) as { training: string }
    return HttpResponse.json({ success: true, message: `Training "${body.training}" assigned to ${params.id}` })
  }),
  http.get("/api/manager/hiring/candidates", () =>
    HttpResponse.json({ success: true, data: { candidates: CANDIDATES, total: CANDIDATES.length } })
  ),
  http.get("/api/manager/hiring/interviews", () =>
    HttpResponse.json({ success: true, data: { interviews: INTERVIEWS, total: INTERVIEWS.length } })
  ),
  http.get("/api/manager/hiring/stats", () =>
    HttpResponse.json({
      success: true,
      data: { openPositions: 3, totalCandidates: 47, interviewsThisWeek: 8, avgTimeToHire: 23 },
    })
  ),
]
