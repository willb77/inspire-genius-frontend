import { http, HttpResponse } from "msw"

const weeks = (n: number) => Array.from({ length: n }, (_, i) => `W${i + 1}`)
const months = ["Oct", "Nov", "Dec", "Jan", "Feb", "Mar"]

export const analyticsHandlers = [
  http.get("/api/analytics/user", () =>
    HttpResponse.json({ success: true, data: {
      sessionsPerWeek: weeks(12).map((w) => ({ week: w, sessions: Math.floor(Math.random() * 8) + 2 })),
      goalsProgress: weeks(12).map((w) => ({ week: w, completed: Math.floor(Math.random() * 3), total: 8 })),
      agentUsage: [{ name: "Meridian", value: 35 }, { name: "Aura", value: 22 }, { name: "Nova", value: 18 }, { name: "Atlas", value: 14 }, { name: "Echo", value: 11 }],
      satisfactionTrend: months.map((m) => ({ month: m, score: +(3.5 + Math.random() * 1.5).toFixed(1) })),
      prismGrowth: [
        { assessment: "Initial", R: 65, Y: 58, G: 72, B: 60 },
        { assessment: "Q1", R: 68, Y: 62, G: 75, B: 64 },
        { assessment: "Q2", R: 72, Y: 65, G: 78, B: 68 },
        { assessment: "Current", R: 75, Y: 70, G: 82, B: 72 },
      ],
    } })
  ),
  http.get("/api/analytics/manager", () =>
    HttpResponse.json({ success: true, data: {
      teamEngagement: [
        { name: "Alex T.", sessions: 12 }, { name: "Maria G.", sessions: 9 }, { name: "James W.", sessions: 14 },
        { name: "Sarah L.", sessions: 7 }, { name: "Chris M.", sessions: 11 }, { name: "Priya P.", sessions: 10 },
      ],
      goalCompletion: [
        { name: "Alex T.", completed: 5, inProgress: 2, notStarted: 0 }, { name: "Maria G.", completed: 3, inProgress: 1, notStarted: 1 },
        { name: "James W.", completed: 6, inProgress: 2, notStarted: 0 }, { name: "Sarah L.", completed: 4, inProgress: 1, notStarted: 1 },
      ],
      hiringByStage: [{ name: "Applied", value: 47 }, { name: "Screening", value: 18 }, { name: "Interview", value: 8 }, { name: "Offer", value: 3 }, { name: "Hired", value: 2 }],
      timeToHire: [{ position: "Frontend", days: 21 }, { position: "Backend", days: 28 }, { position: "PM", days: 18 }, { position: "Designer", days: 24 }],
    } })
  ),
  http.get("/api/analytics/company", () =>
    HttpResponse.json({ success: true, data: {
      deptComparison: [
        { dept: "Engineering", engagement: 88, training: 82, prism: 84 }, { dept: "Marketing", engagement: 76, training: 76, prism: 79 },
        { dept: "Sales", engagement: 92, training: 91, prism: 86 }, { dept: "HR", engagement: 85, training: 88, prism: 81 },
        { dept: "Product", engagement: 80, training: 73, prism: 83 }, { dept: "Design", engagement: 78, training: 85, prism: 88 },
      ],
      engagementTrend: Array.from({ length: 12 }, (_, i) => ({ month: `M${i + 1}`, pct: 70 + Math.floor(Math.random() * 20) })),
      licenseUtil: [{ name: "Active", value: 192 }, { name: "Unused", value: 55 }, { name: "Pending", value: 12 }],
      costPerUser: months.map((m) => ({ month: m, cost: +(380 + Math.random() * 80).toFixed(0) })),
    } })
  ),
  http.get("/api/analytics/practitioner", () =>
    HttpResponse.json({ success: true, data: {
      clientEngagement: [
        { client: "Marcus C.", sessions: 12 }, { client: "Aisha P.", sessions: 8 }, { client: "James M.", sessions: 15 },
        { client: "Sophie L.", sessions: 20 }, { client: "David K.", sessions: 6 }, { client: "Emma W.", sessions: 18 },
      ],
      weeklyFrequency: weeks(12).map((w) => ({ week: w, sessions: Math.floor(Math.random() * 6) + 4 })),
      prismRates: [{ name: "Completed", value: 18 }, { name: "In Progress", value: 4 }, { name: "Not Started", value: 2 }],
    } })
  ),
  http.get("/api/analytics/distributor", () =>
    HttpResponse.json({ success: true, data: {
      creditsByRegion: [
        { region: "Northeast", credits: 890 }, { region: "Southeast", credits: 770 }, { region: "Midwest", credits: 620 },
        { region: "West Coast", credits: 550 }, { region: "Southwest", credits: 480 }, { region: "Pacific NW", credits: 640 },
      ],
      practitionerUtil: [
        { name: "Dr. Chen", util: 84 }, { name: "M. Torres", util: 86 }, { name: "J. Okafor", util: 78 },
        { name: "D. Kim", util: 79 }, { name: "R. Foster", util: 80 },
      ],
      creditFlow: months.map((m) => ({ month: m, purchased: Math.floor(Math.random() * 400) + 300, allocated: Math.floor(Math.random() * 300) + 200, used: Math.floor(Math.random() * 250) + 150 })),
    } })
  ),
  http.get("/api/analytics/platform", () =>
    HttpResponse.json({ success: true, data: {
      totalUsers: 12847, mau: 8234, dau: 3421,
      agentUsage: [{ name: "Meridian", value: 12500 }, { name: "Aura", value: 8200 }, { name: "Nova", value: 7800 }, { name: "Atlas", value: 5600 }, { name: "Echo", value: 4200 }, { name: "Other", value: 7378 }],
      orgComparison: [
        { org: "Acme Corp", users: 2450, engagement: 82 }, { org: "TechStart", users: 1890, engagement: 78 },
        { org: "Global Inc", users: 1650, engagement: 85 }, { org: "DataPrime", users: 1200, engagement: 74 },
      ],
      systemHealth: Array.from({ length: 30 }, (_, i) => ({ day: `D${i + 1}`, responseTime: 120 + Math.floor(Math.random() * 60), errorRate: +(0.1 + Math.random() * 0.5).toFixed(2) })),
    } })
  ),
]
