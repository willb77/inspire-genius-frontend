import { GraduationCap, CalendarClock, Award } from "lucide-react"
import { useStudentProfile } from "@/hooks/grant/useProfile"
import { useDeadlines } from "@/hooks/grant/useDeadlines"
import { useScholarships } from "@/hooks/grant/useScholarships"

/**
 * GRANT vertical landing page. Renders inside the shared AppShell (light theme)
 * via GrantLayout. Consumes the mock-backed data hooks so the shell + gated nav
 * are verifiable end-to-end for UI-0.
 */
export default function GrantDashboardPage() {
  const { data: profile } = useStudentProfile()
  const { data: deadlines } = useDeadlines()
  const { data: scholarships } = useScholarships()

  return (
    <div className="max-w-5xl">
      <div className="flex items-center gap-3 mb-1">
        <div className="w-10 h-10 rounded-lg bg-[rgba(59,91,255,0.1)] flex items-center justify-center">
          <GraduationCap className="w-5 h-5 text-[#3B5BFF]" />
        </div>
        <h1 className="text-2xl font-semibold text-[#1f2937]">Aid Dashboard</h1>
      </div>
      <p className="text-[#6b7280] mb-6">
        {profile ? `Welcome back, ${profile.fullName}.` : "Your financial-aid overview."}
      </p>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <section className="rounded-xl border border-[#e5e7eb] bg-white p-5">
          <div className="flex items-center gap-2 text-[#374151] mb-2">
            <CalendarClock className="w-4 h-4 text-[#3B5BFF]" />
            <h2 className="text-sm font-semibold">Upcoming Deadlines</h2>
          </div>
          <p className="text-3xl font-bold text-[#1f2937]">{deadlines?.length ?? 0}</p>
          <p className="text-xs text-[#9ca3af] mt-1">federal, state &amp; institutional</p>
        </section>

        <section className="rounded-xl border border-[#e5e7eb] bg-white p-5">
          <div className="flex items-center gap-2 text-[#374151] mb-2">
            <Award className="w-4 h-4 text-[#2DD4BF]" />
            <h2 className="text-sm font-semibold">Scholarship Matches</h2>
          </div>
          <p className="text-3xl font-bold text-[#1f2937]">{scholarships?.length ?? 0}</p>
          <p className="text-xs text-[#9ca3af] mt-1">ranked by match score</p>
        </section>

        <section className="rounded-xl border border-[#e5e7eb] bg-white p-5">
          <div className="flex items-center gap-2 text-[#374151] mb-2">
            <GraduationCap className="w-4 h-4 text-[#3B5BFF]" />
            <h2 className="text-sm font-semibold">Student Aid Index</h2>
          </div>
          <p className="text-3xl font-bold text-[#1f2937]">
            {profile ? profile.studentAidIndex.toLocaleString() : "—"}
          </p>
          <p className="text-xs text-[#9ca3af] mt-1">from your financial profile</p>
        </section>
      </div>
    </div>
  )
}
