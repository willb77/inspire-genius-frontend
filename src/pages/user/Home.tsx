import UserLayout from "@/layouts/UserLayout";
import { useAuth } from "@/context/useAuth";
import { ROUTES } from "@/constants/routes";
import WelcomeBanner from "@/components/dashboard/WelcomeBanner";
import StatCard from "@/components/dashboard/StatCard";
import QuickActions from "@/components/dashboard/QuickActions";
import DataCard from "@/components/dashboard/DataCard";
import {
  MessageSquare,
  Target,
  Activity,
  FileUp,
  Bot,
  Upload,
  ClipboardList,
  Flag,
} from "lucide-react";

const STATS = [
  { label: "Total Sessions", value: "12", change: "+3 this week", icon: MessageSquare, iconColor: "text-blue-600", iconBg: "bg-blue-100" },
  { label: "Goals Completed", value: "5/8", change: "63%", icon: Target, iconColor: "text-emerald-600", iconBg: "bg-emerald-100" },
  { label: "Alignment Score", value: "85", change: "+5", changeColor: "text-emerald-500", icon: Activity, iconColor: "text-violet-600", iconBg: "bg-violet-100" },
  { label: "Files Uploaded", value: "24", change: "+4 new", icon: FileUp, iconColor: "text-amber-600", iconBg: "bg-amber-100" },
];

const QUICK_ACTIONS = [
  { label: "Chat with Meridian", icon: Bot, to: ROUTES.DASHBOARD, bg: "bg-blue-100", iconColor: "text-blue-600" },
  { label: "Upload Document", icon: Upload, to: ROUTES.DOCUMENTS, bg: "bg-emerald-100", iconColor: "text-emerald-600" },
  { label: "View PRISM Report", icon: ClipboardList, to: "/prism-assessment", bg: "bg-violet-100", iconColor: "text-violet-600" },
  { label: "Set New Goal", icon: Flag, to: ROUTES.DASHBOARD, bg: "bg-amber-100", iconColor: "text-amber-600" },
];

const ACTIVITY = [
  { label: "Completed session with Meridian", time: "2 hours ago", color: "bg-emerald-500" },
  { label: "Uploaded quarterly review document", time: "Yesterday", color: "bg-blue-500" },
  { label: "PRISM profile updated", time: "2 days ago", color: "bg-violet-500" },
  { label: "New goal: Improve team communication", time: "3 days ago", color: "bg-amber-500" },
  { label: "Completed coaching milestone #4", time: "1 week ago", color: "bg-emerald-500" },
];

export default function Home() {
  const { user } = useAuth();
  const firstName = user?.fullName?.split(" ")[0] ?? user?.name?.split(" ")[0] ?? "there";

  return (
    <UserLayout>
      <WelcomeBanner
        title={`Welcome back, ${firstName}`}
        subtitle="Here's an overview of your coaching journey"
      />

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 my-6">
        {STATS.map((s) => (
          <StatCard key={s.label} {...s} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <div className="lg:col-span-1">
          <QuickActions actions={QUICK_ACTIONS} />
        </div>

        {/* Recent Activity */}
        <div className="lg:col-span-2">
          <DataCard title="Recent Activity">
            <div className="space-y-4">
              {ACTIVITY.map((item, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className={`w-2 h-2 rounded-full mt-2 ${item.color}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{item.label}</p>
                    <p className="text-xs text-muted-foreground">{item.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </DataCard>
        </div>
      </div>
    </UserLayout>
  );
}
