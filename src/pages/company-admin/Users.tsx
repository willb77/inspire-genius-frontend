import { useState } from "react"
import CompanyAdminLayout from "@/layouts/CompanyAdminLayout"
import DataCard from "@/components/dashboard/DataCard"
import StatusBadge from "@/components/dashboard/StatusBadge"

const USERS = [
  { id: "u-1", name: "Alex Thompson", email: "alex.t@acme.com", role: "User", department: "Engineering", team: "Frontend Team", status: "active", joinDate: "Jun 2025" },
  { id: "u-2", name: "Maria Garcia", email: "maria.g@acme.com", role: "User", department: "Design", team: "Product Design", status: "active", joinDate: "Aug 2025" },
  { id: "u-3", name: "James Wilson", email: "james.w@acme.com", role: "Manager", department: "Product", team: "Core Product", status: "active", joinDate: "Nov 2024" },
  { id: "u-4", name: "Sarah Lee", email: "sarah.l@acme.com", role: "User", department: "Sales", team: "Enterprise Sales", status: "active", joinDate: "Feb 2025" },
  { id: "u-5", name: "Chris Martin", email: "chris.m@acme.com", role: "User", department: "Engineering", team: "Backend Team", status: "inactive", joinDate: "Sep 2024" },
  { id: "u-6", name: "Priya Patel", email: "priya.p@acme.com", role: "User", department: "Engineering", team: "Frontend Team", status: "active", joinDate: "Jan 2025" },
  { id: "u-7", name: "Tom Harris", email: "tom.h@acme.com", role: "Manager", department: "Product", team: "Growth", status: "active", joinDate: "Jul 2024" },
  { id: "u-8", name: "David Chen", email: "david.c@acme.com", role: "User", department: "Sales", team: "SMB Sales", status: "active", joinDate: "Apr 2025" },
]

export default function CompanyAdminUsers() {
  const [search, setSearch] = useState("")
  const filtered = USERS.filter((u) =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    u.department.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <CompanyAdminLayout>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-[#111827]">User Management</h1>
          <p className="text-[13px] text-[#6b7280]">Provision and manage users within your organization.</p>
        </div>
        <button className="bg-[#3B5BFF] text-white text-[13px] font-semibold px-4 py-2 rounded-lg hover:bg-[#2A47CC] transition-colors">
          + Add User
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        {[
          { label: "Total Users", value: "247" },
          { label: "Active", value: "231" },
          { label: "Managers", value: "16" },
          { label: "Inactive", value: "16" },
        ].map((s) => (
          <div key={s.label} className="bg-white border border-[#e5e7eb] rounded-lg p-3.5">
            <div className="text-xs text-[#6b7280]">{s.label}</div>
            <div className="text-2xl font-bold text-[#111827]">{s.value}</div>
          </div>
        ))}
      </div>

      <DataCard title="Users">
        {/* Search */}
        <div className="mb-4">
          <input
            type="text"
            placeholder="Search by name, email, or department..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full max-w-md border border-[#e5e7eb] rounded-lg px-3 py-2 text-[13px] outline-none focus:border-[#3B5BFF] transition-colors"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-[#f9fafb] border-b border-[#e5e7eb]">
                {["Name", "Email", "Role", "Department", "Team", "Status", "Joined"].map((h) => (
                  <th key={h} className="text-left text-[10px] font-bold uppercase tracking-wider text-[#6b7280] px-3 py-2.5">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => (
                <tr key={u.id} className="border-b border-[#f3f4f6] hover:bg-[#f9fafb]">
                  <td className="px-3 py-2.5 text-[13px] font-semibold text-[#1f2937]">{u.name}</td>
                  <td className="px-3 py-2.5 text-[13px] text-[#374151]">{u.email}</td>
                  <td className="px-3 py-2.5">
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${u.role === "Manager" ? "bg-[#EFF6FF] text-[#3B5BFF]" : "bg-[#f3f4f6] text-[#374151]"}`}>{u.role}</span>
                  </td>
                  <td className="px-3 py-2.5 text-[13px] text-[#374151]">{u.department}</td>
                  <td className="px-3 py-2.5 text-[13px] text-[#374151]">{u.team}</td>
                  <td className="px-3 py-2.5"><StatusBadge status={u.status} label={u.status.charAt(0).toUpperCase() + u.status.slice(1)} /></td>
                  <td className="px-3 py-2.5 text-xs text-[#6b7280]">{u.joinDate}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DataCard>
    </CompanyAdminLayout>
  )
}
