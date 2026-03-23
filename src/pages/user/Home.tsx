import UserLayout from "@/layouts/UserLayout";
import WelcomeBanner from "@/components/dashboard/WelcomeBanner";
import StatCard from "@/components/dashboard/StatCard";
import QuickActions from "@/components/dashboard/QuickActions";
import DataCard from "@/components/dashboard/DataCard";
import { useAuth } from "@/context/useAuth";
import { ROUTES } from "@/constants/routes";
import {
  Calendar,
  CheckCircle2,
  BarChart3,
  FileUp,
  MessageSquare,
  FolderUp,
  Target,
  Brain,
} from "lucide-react";
import type { StatCardData } from "@/types/dashboard/data-types";

const STATS: StatCardData[] = [
  { label: "Total Sessions", value: "12", change: "+3 this week", changeColor: "text-[#10B981]", icon: Calendar, iconColor: "text-[#3B5BFF]", iconBg: "bg-[rgba(59,91,255,.1)]" },
  { label: "Goals Completed", value: "5/8", change: "63%", changeColor: "text-[#3B5BFF]", icon: CheckCircle2, iconColor: "text-[#2DD4BF]", iconBg: "bg-[#D1FAE5]" },
  { label: "Alignment Score", value: "85", change: "+5", changeColor: "text-[#10B981]", icon: BarChart3, iconColor: "text-[#10B981]", iconBg: "bg-[#ECFDF5]" },
  { label: "Files Uploaded", value: "24", change: "+8", changeColor: "text-[#3B82F6]", icon: FileUp, iconColor: "text-[#3B82F6]", iconBg: "bg-[#EFF6FF]" },
];

const QUICK_ACTIONS = [
  { label: "Chat with Meridian", icon: MessageSquare, to: ROUTES.DASHBOARD, bg: "bg-[rgba(59,91,255,.1)]", iconColor: "text-[#3B5BFF]" },
  { label: "Upload Document", icon: FolderUp, to: ROUTES.DOCUMENTS, bg: "bg-[#EFF6FF]", iconColor: "text-[#3B82F6]" },
  { label: "View PRISM Report", icon: Brain, to: ROUTES.PRISM_ASSESSMENT, bg: "bg-[#F5F3FF]", iconColor: "text-[#8B5CF6]" },
  { label: "Set New Goal", icon: Target, to: ROUTES.SETTINGS, bg: "bg-[#ECFDF5]", iconColor: "text-[#10B981]" },
];

const ACTIVITY = [
  { id: "1", text: "Completed PRISM reassessment", time: "2 hours ago", dotColor: "bg-[#3B5BFF]" },
  { id: "2", text: "New goal created: Improve delegation skills", time: "Yesterday", dotColor: "bg-[#2DD4BF]" },
  { id: "3", text: "Chat session with Meridian (23 min)", time: "Yesterday", dotColor: "bg-[#3B82F6]" },
  { id: "4", text: "Uploaded Q4 Review document", time: "2 days ago", dotColor: "bg-[#10B981]" },
  { id: "5", text: "Goal milestone reached: Active Listening", time: "3 days ago", dotColor: "bg-[#e9c46a]" },
];

export default function Home() {
  const { user } = useAuth();
  const firstName = user?.fullName?.split(" ")[0] ?? user?.name?.split(" ")[0] ?? "there";

  return (
    <UserLayout>
      {/* Welcome Banner */}
      <WelcomeBanner
        title={`Welcome back, ${firstName}!`}
        subtitle="Your PRISM coaching journey continues. You've completed 3 sessions this week."
      >
        <button className="bg-white/20 text-white rounded-md px-4 py-2 text-[13px] font-semibold hover:bg-white/30 transition-colors">
          Start Session
        </button>
      </WelcomeBanner>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-5">
        {STATS.map((s) => (
          <StatCard key={s.label} {...s} />
        ))}
      </div>

      {/* Quick Actions */}
      <QuickActions actions={QUICK_ACTIONS} />

      {/* Recent Activity */}
      <DataCard title="Recent Activity">
        {ACTIVITY.map((item) => (
          <div key={item.id} className="flex items-center gap-2.5 py-2 border-b border-[#f3f4f6] last:border-b-0">
            <span className={`w-2 h-2 rounded-full shrink-0 ${item.dotColor}`} />
            <span className="text-[13px] text-[#374151] flex-1">{item.text}</span>
            <span className="text-[11px] text-[#9ca3af] whitespace-nowrap">{item.time}</span>
          </div>
        ))}
      </DataCard>
    </UserLayout>
  );
}
