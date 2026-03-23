import DistributorLayout from "@/layouts/DistributorLayout"
import DataCard from "@/components/dashboard/DataCard"
import { BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts"
import ProgressBar from "@/components/dashboard/ProgressBar"

const CREDITS_BY_REGION = [
  { region: "Northeast", credits: 890 }, { region: "Southeast", credits: 770 }, { region: "Midwest", credits: 620 },
  { region: "West Coast", credits: 550 }, { region: "Southwest", credits: 480 }, { region: "Pacific NW", credits: 640 },
]
const PRAC_UTIL = [
  { name: "Dr. Chen", util: 84 }, { name: "M. Torres", util: 86 }, { name: "J. Okafor", util: 78 },
  { name: "D. Kim", util: 79 }, { name: "R. Foster", util: 80 }, { name: "A. Nguyen", util: 80 },
]
const CREDIT_FLOW = [
  { month: "Oct", purchased: 450, allocated: 380, used: 320 }, { month: "Nov", purchased: 520, allocated: 440, used: 360 },
  { month: "Dec", purchased: 380, allocated: 350, used: 290 }, { month: "Jan", purchased: 600, allocated: 520, used: 420 },
  { month: "Feb", purchased: 550, allocated: 480, used: 385 }, { month: "Mar", purchased: 500, allocated: 420, used: 350 },
]

export default function DistributorAnalytics() {
  return (
    <DistributorLayout>
      <h1 className="text-xl font-bold text-[#111827] mb-1">Territory Analytics</h1>
      <p className="text-[13px] text-[#6b7280] mb-5">Territory performance, practitioner utilization, and credit flow.</p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <DataCard title="Credits Used by Region" className="!mt-0">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={CREDITS_BY_REGION}><CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" /><XAxis dataKey="region" tick={{ fontSize: 10 }} /><YAxis tick={{ fontSize: 11 }} /><Tooltip /><Bar dataKey="credits" fill="#3B5BFF" radius={[4, 4, 0, 0]} /></BarChart>
          </ResponsiveContainer>
        </DataCard>

        <DataCard title="Practitioner Utilization" className="!mt-0">
          <div className="space-y-3">
            {PRAC_UTIL.map((p) => (
              <ProgressBar key={p.name} label={p.name} value={p.util} color="#3B5BFF" />
            ))}
          </div>
        </DataCard>
      </div>

      <DataCard title="Credit Flow (6 months)">
        <ResponsiveContainer width="100%" height={240}>
          <AreaChart data={CREDIT_FLOW}><CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" /><XAxis dataKey="month" tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 11 }} /><Tooltip /><Legend />
            <Area type="monotone" dataKey="purchased" stroke="#3B5BFF" fill="rgba(59,91,255,0.1)" name="Purchased" />
            <Area type="monotone" dataKey="allocated" stroke="#2DD4BF" fill="rgba(45,212,191,0.1)" name="Allocated" />
            <Area type="monotone" dataKey="used" stroke="#8B5CF6" fill="rgba(139,92,246,0.1)" name="Used" />
          </AreaChart>
        </ResponsiveContainer>
      </DataCard>
    </DistributorLayout>
  )
}
