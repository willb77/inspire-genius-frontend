import { http, HttpResponse } from "msw"

const USERS = [
  { id: "u-1", name: "Alex Thompson", email: "alex.t@acme.com", role: "user", department: "Engineering", team: "Frontend Team", status: "active", joinDate: "2025-06-15" },
  { id: "u-2", name: "Maria Garcia", email: "maria.g@acme.com", role: "user", department: "Design", team: "Product Design", status: "active", joinDate: "2025-08-01" },
  { id: "u-3", name: "James Wilson", email: "james.w@acme.com", role: "manager", department: "Product", team: "Core Product", status: "active", joinDate: "2024-11-20" },
  { id: "u-4", name: "Sarah Lee", email: "sarah.l@acme.com", role: "user", department: "Sales", team: "Enterprise Sales", status: "active", joinDate: "2025-02-10" },
  { id: "u-5", name: "Chris Martin", email: "chris.m@acme.com", role: "user", department: "Engineering", team: "Backend Team", status: "inactive", joinDate: "2024-09-05" },
  { id: "u-6", name: "Priya Patel", email: "priya.p@acme.com", role: "user", department: "Engineering", team: "Frontend Team", status: "active", joinDate: "2025-01-15" },
  { id: "u-7", name: "Tom Harris", email: "tom.h@acme.com", role: "manager", department: "Product", team: "Growth", status: "active", joinDate: "2024-07-20" },
  { id: "u-8", name: "David Chen", email: "david.c@acme.com", role: "user", department: "Sales", team: "SMB Sales", status: "active", joinDate: "2025-04-01" },
]

const DEPARTMENTS = [
  { id: "d-1", name: "Engineering", headCount: 68, budget: 850000, manager: "VP Engineering" },
  { id: "d-2", name: "Marketing", headCount: 34, budget: 420000, manager: "VP Marketing" },
  { id: "d-3", name: "Sales", headCount: 45, budget: 560000, manager: "VP Sales" },
  { id: "d-4", name: "HR", headCount: 18, budget: 220000, manager: "HR Director" },
  { id: "d-5", name: "Product", headCount: 28, budget: 350000, manager: "VP Product" },
  { id: "d-6", name: "Design", headCount: 22, budget: 280000, manager: "Design Director" },
  { id: "d-7", name: "Finance", headCount: 16, budget: 200000, manager: "CFO" },
  { id: "d-8", name: "Operations", headCount: 16, budget: 195000, manager: "COO" },
]

const COST_DATA = {
  monthly: [
    { month: "Oct", licenses: 12400, training: 3200, total: 15600 },
    { month: "Nov", licenses: 12400, training: 4100, total: 16500 },
    { month: "Dec", licenses: 13200, training: 2800, total: 16000 },
    { month: "Jan", licenses: 14800, training: 5200, total: 20000 },
    { month: "Feb", licenses: 14800, training: 4600, total: 19400 },
    { month: "Mar", licenses: 15600, training: 3900, total: 19500 },
  ],
  summary: { totalSpend: 107000, licenseCost: 83200, trainingCost: 23800, avgPerUser: 433, activeLicenses: 192 },
}

export const companyAdminHandlers = [
  http.get("/api/company/users", () =>
    HttpResponse.json({ success: true, data: { users: USERS, total: USERS.length } })
  ),
  http.post("/api/company/users", async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>
    return HttpResponse.json({ success: true, data: { id: `u-${Date.now()}`, ...body }, message: "User created" })
  }),
  http.put("/api/company/users/:id", async ({ params, request }) => {
    const body = (await request.json()) as Record<string, unknown>
    return HttpResponse.json({ success: true, data: { id: params.id, ...body }, message: "User updated" })
  }),
  http.delete("/api/company/users/:id", ({ params }) =>
    HttpResponse.json({ success: true, message: `User ${params.id} deleted` })
  ),
  http.get("/api/company/departments", () =>
    HttpResponse.json({ success: true, data: { departments: DEPARTMENTS } })
  ),
  http.get("/api/company/settings", () =>
    HttpResponse.json({ success: true, data: { orgName: "Acme Corp", industry: "Technology", size: "200-500", timezone: "America/New_York" } })
  ),
  http.put("/api/company/settings", async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>
    return HttpResponse.json({ success: true, data: body, message: "Settings updated" })
  }),
  http.get("/api/company/analytics", () =>
    HttpResponse.json({
      success: true,
      data: { totalUsers: 247, activeUsers: 231, avgPrismScore: 83, trainingCompletion: 78 },
    })
  ),
  http.get("/api/company/costs", () =>
    HttpResponse.json({ success: true, data: COST_DATA })
  ),
]
