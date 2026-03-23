import { http, HttpResponse } from "msw"

const PRACTITIONERS = [
  { id: "p-1", name: "Dr. Sarah Chen", region: "Northeast", email: "sarah.chen@prism.com", allocated: 500, used: 420, utilization: 84, status: "active", clients: 18, joinDate: "2025-01-15" },
  { id: "p-2", name: "Michael Torres", region: "Southeast", email: "m.torres@prism.com", allocated: 450, used: 385, utilization: 86, status: "active", clients: 15, joinDate: "2025-03-01" },
  { id: "p-3", name: "Jennifer Okafor", region: "Midwest", email: "j.okafor@prism.com", allocated: 400, used: 310, utilization: 78, status: "active", clients: 12, joinDate: "2025-02-10" },
  { id: "p-4", name: "David Kim", region: "West Coast", email: "d.kim@prism.com", allocated: 350, used: 275, utilization: 79, status: "active", clients: 10, joinDate: "2025-04-20" },
  { id: "p-5", name: "Rebecca Foster", region: "Southwest", email: "r.foster@prism.com", allocated: 300, used: 240, utilization: 80, status: "active", clients: 9, joinDate: "2025-05-05" },
  { id: "p-6", name: "Alex Nguyen", region: "Pacific NW", email: "a.nguyen@prism.com", allocated: 400, used: 320, utilization: 80, status: "active", clients: 14, joinDate: "2025-06-15" },
  { id: "p-7", name: "Maria Santos", region: "Central", email: "m.santos@prism.com", allocated: 350, used: 280, utilization: 80, status: "leave", clients: 11, joinDate: "2025-07-01" },
  { id: "p-8", name: "John Parker", region: "Northeast", email: "j.parker@prism.com", allocated: 450, used: 370, utilization: 82, status: "active", clients: 16, joinDate: "2025-08-20" },
]

const CREDIT_SUMMARY = {
  totalPurchased: 10000,
  totalAllocated: 3200,
  availablePool: 1800,
  usedByPractitioners: 5000,
}

const TRANSACTIONS = [
  { id: "t-1", date: "2026-03-15", type: "Purchase", description: "Purchase", amount: 500, balance: 1800 },
  { id: "t-2", date: "2026-03-14", type: "Allocation", description: "Allocation to Dr. Chen", amount: -200, balance: 1300 },
  { id: "t-3", date: "2026-03-12", type: "Allocation", description: "Allocation to M. Torres", amount: -150, balance: 1450 },
  { id: "t-4", date: "2026-03-10", type: "Purchase", description: "Purchase", amount: 1000, balance: 1600 },
  { id: "t-5", date: "2026-03-08", type: "Allocation", description: "Allocation to J. Okafor", amount: -100, balance: 600 },
  { id: "t-6", date: "2026-03-05", type: "Return", description: "Return from D. Kim", amount: 50, balance: 700 },
  { id: "t-7", date: "2026-03-03", type: "Allocation", description: "Allocation to R. Foster", amount: -100, balance: 650 },
  { id: "t-8", date: "2026-03-01", type: "Purchase", description: "Purchase", amount: 500, balance: 750 },
]

const TERRITORY = {
  regions: ["Northeast", "Southeast", "Midwest", "West Coast", "Southwest", "Pacific NW", "Central"],
  coverage: 72,
  totalPractitioners: 8,
  activePractitioners: 7,
}

export const distributorHandlers = [
  http.get("/api/distributor/practitioners", () =>
    HttpResponse.json({ success: true, data: { practitioners: PRACTITIONERS, total: PRACTITIONERS.length } })
  ),
  http.get("/api/distributor/practitioners/:id", ({ params }) => {
    const p = PRACTITIONERS.find((pr) => pr.id === params.id)
    if (!p) return HttpResponse.json({ success: false, message: "Not found" }, { status: 404 })
    return HttpResponse.json({ success: true, data: p })
  }),
  http.post("/api/distributor/credits/allocate", async ({ request }) => {
    const body = (await request.json()) as { practitionerId: string; amount: number }
    return HttpResponse.json({ success: true, message: `${body.amount} credits allocated to ${body.practitionerId}` })
  }),
  http.post("/api/distributor/credits/purchase", async ({ request }) => {
    const body = (await request.json()) as { amount: number }
    return HttpResponse.json({ success: true, message: `${body.amount} credits purchased` })
  }),
  http.get("/api/distributor/credits", () =>
    HttpResponse.json({ success: true, data: CREDIT_SUMMARY })
  ),
  http.get("/api/distributor/transactions", () =>
    HttpResponse.json({ success: true, data: { transactions: TRANSACTIONS } })
  ),
  http.get("/api/distributor/territory", () =>
    HttpResponse.json({ success: true, data: TERRITORY })
  ),
]
