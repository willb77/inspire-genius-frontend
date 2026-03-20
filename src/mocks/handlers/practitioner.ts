import { http, HttpResponse } from "msw"

const CLIENTS = [
  { id: "cl-1", name: "Marcus Chen", org: "TechCorp Inc", email: "marcus@techcorp.com", prismScore: 82, totalSessions: 12, status: "active", lastSession: "2026-03-15", nextSession: "2026-03-22", notes: "Working on delegation skills" },
  { id: "cl-2", name: "Aisha Patel", org: "GlobalHealth", email: "aisha@globalhealth.com", prismScore: 78, totalSessions: 8, status: "active", lastSession: "2026-03-14", nextSession: "2026-03-21", notes: "Career transition coaching" },
  { id: "cl-3", name: "James Morrison", org: "Finova Group", email: "james@finova.com", prismScore: 85, totalSessions: 15, status: "active", lastSession: "2026-03-13", nextSession: "2026-03-20", notes: "Leadership development" },
  { id: "cl-4", name: "Sophie Laurent", org: "CreativeEdge", email: "sophie@creativeedge.com", prismScore: 91, totalSessions: 20, status: "active", lastSession: "2026-03-12", nextSession: "2026-03-19", notes: "Executive coaching" },
  { id: "cl-5", name: "David Kimura", org: "DataPrime", email: "david@dataprime.com", prismScore: 76, totalSessions: 6, status: "new", lastSession: "2026-03-11", nextSession: "2026-03-25", notes: "Onboarding phase" },
  { id: "cl-6", name: "Emma Watson", org: "MediaFlow", email: "emma@mediaflow.com", prismScore: 88, totalSessions: 18, status: "active", lastSession: "2026-03-10", nextSession: "2026-03-24", notes: "Team dynamics focus" },
  { id: "cl-7", name: "Ryan Park", org: "BuildRight", email: "ryan@buildright.com", prismScore: 73, totalSessions: 4, status: "new", lastSession: "2026-03-09", nextSession: "2026-03-23", notes: "Initial assessment phase" },
  { id: "cl-8", name: "Lisa Fernandez", org: "EduNext", email: "lisa@edunext.com", prismScore: 87, totalSessions: 14, status: "active", lastSession: "2026-03-08", nextSession: "2026-03-22", notes: "Goal-setting review" },
]

const SESSIONS = [
  { id: "s-1", clientId: "cl-1", clientName: "Marcus Chen", type: "PRISM Debrief", date: "2026-03-20", time: "9:00 AM", duration: 60, status: "confirmed", notes: "" },
  { id: "s-2", clientId: "cl-2", clientName: "Aisha Patel", type: "Career Coaching", date: "2026-03-20", time: "10:30 AM", duration: 45, status: "confirmed", notes: "" },
  { id: "s-3", clientId: "cl-3", clientName: "James Morrison", type: "Team Dynamics", date: "2026-03-20", time: "1:00 PM", duration: 60, status: "pending", notes: "" },
  { id: "s-4", clientId: "cl-4", clientName: "Sophie Laurent", type: "Leadership Dev", date: "2026-03-20", time: "2:30 PM", duration: 45, status: "confirmed", notes: "" },
  { id: "s-5", clientId: "cl-5", clientName: "David Kimura", type: "Goal Setting", date: "2026-03-20", time: "4:00 PM", duration: 30, status: "pending", notes: "" },
]

const FOLLOWUPS = [
  { id: "f-1", clientId: "cl-1", clientName: "Marcus Chen", reason: "Post-assessment review", dueDate: "2026-03-20", priority: "high" },
  { id: "f-2", clientId: "cl-3", clientName: "James Morrison", reason: "Goal check-in", dueDate: "2026-03-20", priority: "high" },
  { id: "f-3", clientId: "cl-4", clientName: "Sophie Laurent", reason: "Session follow-up", dueDate: "2026-03-21", priority: "medium" },
  { id: "f-4", clientId: "cl-6", clientName: "Emma Watson", reason: "Document review", dueDate: "2026-03-22", priority: "medium" },
  { id: "f-5", clientId: "cl-8", clientName: "Lisa Fernandez", reason: "Monthly check-in", dueDate: "2026-03-24", priority: "low" },
]

const CREDITS = {
  remaining: 38,
  totalPurchased: 100,
  used: 62,
  monthly: [
    { month: "Oct", used: 6 },
    { month: "Nov", used: 8 },
    { month: "Dec", used: 5 },
    { month: "Jan", used: 10 },
    { month: "Feb", used: 9 },
    { month: "Mar", used: 7 },
  ],
  history: [
    { id: "ch-1", date: "2026-03-15", type: "Used", client: "Marcus Chen", amount: -1, balance: 38 },
    { id: "ch-2", date: "2026-03-13", type: "Used", client: "James Morrison", amount: -1, balance: 39 },
    { id: "ch-3", date: "2026-03-10", type: "Purchased", client: null, amount: 20, balance: 40 },
    { id: "ch-4", date: "2026-03-08", type: "Used", client: "Lisa Fernandez", amount: -1, balance: 20 },
    { id: "ch-5", date: "2026-03-05", type: "Used", client: "Sophie Laurent", amount: -1, balance: 21 },
  ],
}

export const practitionerHandlers = [
  http.get("/api/practitioner/clients", () =>
    HttpResponse.json({ success: true, data: { clients: CLIENTS, total: CLIENTS.length } })
  ),
  http.get("/api/practitioner/clients/:id", ({ params }) => {
    const client = CLIENTS.find((c) => c.id === params.id)
    if (!client) return HttpResponse.json({ success: false, message: "Not found" }, { status: 404 })
    return HttpResponse.json({ success: true, data: client })
  }),
  http.post("/api/practitioner/clients/:id/prism", ({ params }) =>
    HttpResponse.json({ success: true, message: `PRISM assessment provisioned for client ${params.id}` })
  ),
  http.get("/api/practitioner/sessions", () =>
    HttpResponse.json({ success: true, data: { sessions: SESSIONS, total: SESSIONS.length } })
  ),
  http.get("/api/practitioner/followups", () =>
    HttpResponse.json({ success: true, data: { followups: FOLLOWUPS, total: FOLLOWUPS.length } })
  ),
  http.get("/api/practitioner/credits", () =>
    HttpResponse.json({ success: true, data: CREDITS })
  ),
]
