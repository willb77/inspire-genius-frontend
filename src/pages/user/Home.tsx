import UserLayout from "@/layouts/UserLayout";
import { useAuth } from "@/context/useAuth";
import { useNavigate } from "react-router-dom";
import { ROUTES } from "@/constants/routes";
import WelcomeBanner from "@/components/dashboard/WelcomeBanner";
import StatCard from "@/components/dashboard/StatCard";
import QuickActions from "@/components/dashboard/QuickActions";
import DataCard from "@/components/dashboard/DataCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { usePrismHistory } from "@/hooks/prism/usePrismHistory";
import { useAuditStats } from "@/hooks/audit/useAudit";
import { ASSESSMENT_STATUS } from "@/constants/prism";
import {
  MessageSquare,
  Target,
  Activity,
  FileUp,
  Bot,
  Upload,
  ClipboardList,
  Flag,
  FileCheck,
  CalendarDays,
} from "lucide-react";

const QUICK_ACTIONS = [
  { label: "Chat with Meridian", icon: Bot, to: ROUTES.DASHBOARD, bg: "bg-blue-100", iconColor: "text-blue-600" },
  { label: "Upload Document", icon: Upload, to: ROUTES.DOCUMENTS, bg: "bg-emerald-100", iconColor: "text-emerald-600" },
  { label: "View PRISM Report", icon: ClipboardList, to: ROUTES.PRISM_ASSESSMENT, bg: "bg-violet-100", iconColor: "text-violet-600" },
  { label: "Set New Goal", icon: Flag, to: ROUTES.COACHES, bg: "bg-amber-100", iconColor: "text-amber-600" },
];

const ACTIVE_STATUSES = new Set([
  ASSESSMENT_STATUS.INITIATED,
  ASSESSMENT_STATUS.QUESTIONNAIRE_SENT,
  ASSESSMENT_STATUS.IN_PROGRESS,
]);

const COMPLETED_STATUSES = new Set([
  ASSESSMENT_STATUS.COMPLETED,
  ASSESSMENT_STATUS.UNLOCKED,
  ASSESSMENT_STATUS.REPORT_READY,
  ASSESSMENT_STATUS.INGESTED,
]);

function getReportStatus(status: string | undefined): { label: string; bg: string; text: string } {
  if (!status) return { label: "No Assessment", bg: "bg-gray-100", text: "text-gray-600" };
  if (ACTIVE_STATUSES.has(status as never)) return { label: "Pending", bg: "bg-amber-100", text: "text-amber-700" };
  if (COMPLETED_STATUSES.has(status as never)) return { label: "Active", bg: "bg-emerald-100", text: "text-emerald-700" };
  if (status === ASSESSMENT_STATUS.ERROR) return { label: "Error", bg: "bg-red-100", text: "text-red-700" };
  return { label: status, bg: "bg-gray-100", text: "text-gray-600" };
}

export default function Home() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const firstName = user?.fullName?.split(" ")[0] ?? user?.name?.split(" ")[0] ?? "there";

  // Audit stats — real data from GET /v1/audit/stats
  const { data: auditData, isLoading: auditLoading } = useAuditStats();
  const stats = auditData?.data;

  const STATS = [
    {
      label: "Total Sessions",
      value: auditLoading ? "..." : String(stats?.total_logs ?? 0),
      change: auditLoading ? "" : `+${stats?.logs_this_week ?? 0} this week`,
      icon: MessageSquare,
      iconColor: "text-blue-600",
      iconBg: "bg-blue-100",
    },
    {
      label: "Sessions Today",
      value: auditLoading ? "..." : String(stats?.logs_today ?? 0),
      change: auditLoading ? "" : `${stats?.logs_this_month ?? 0} this month`,
      icon: Target,
      iconColor: "text-emerald-600",
      iconBg: "bg-emerald-100",
    },
    {
      label: "AI Requests",
      value: auditLoading ? "..." : String(stats?.ai_usage?.request_count ?? 0),
      change: auditLoading ? "" : `$${(stats?.ai_usage?.total_cost_usd ?? 0).toFixed(2)} cost`,
      icon: Activity,
      iconColor: "text-violet-600",
      iconBg: "bg-violet-100",
    },
    {
      label: "This Month",
      value: auditLoading ? "..." : String(stats?.logs_this_month ?? 0),
      change: auditLoading ? "" : `${stats?.logs_this_week ?? 0} this week`,
      icon: FileUp,
      iconColor: "text-amber-600",
      iconBg: "bg-amber-100",
    },
  ];

  // Real PRISM assessment data
  const { data: prismData, isLoading: prismLoading } = usePrismHistory(user?.id ?? null);
  const assessments = (prismData as { data?: { assessments?: Array<{ status: string; initiatedAt?: string | null; completedAt?: string | null }> } } | undefined)?.data?.assessments ?? [];
  const latestAssessment = assessments[0];
  const reportStatus = getReportStatus(latestAssessment?.status);
  const lastReportDate = latestAssessment?.completedAt ?? latestAssessment?.initiatedAt;
  const hasActiveAssessment = assessments.some((a) => ACTIVE_STATUSES.has(a.status as never));

  const handleRequestSurvey = () => {
    navigate(ROUTES.PRISM_ASSESSMENT);
  };

  return (
    <UserLayout>
      <WelcomeBanner
        title={`Welcome back, ${firstName}`}
        subtitle="Here's an overview of your coaching journey"
      />

      {/* Behavioral Report Status + Request Survey */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-6">
        <Card className="border border-[#e5e7eb]">
          <CardContent className="p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-violet-100 flex items-center justify-center">
                <FileCheck className="w-5 h-5 text-violet-600" />
              </div>
              <div>
                <h3 className="text-sm font-semibold">Behavioral Report Status</h3>
                {prismLoading ? (
                  <span className="inline-block mt-0.5 text-xs text-muted-foreground">Loading...</span>
                ) : (
                  <span className={`inline-block mt-0.5 text-xs font-medium px-2 py-0.5 rounded-full ${reportStatus.bg} ${reportStatus.text}`}>
                    {reportStatus.label}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <CalendarDays className="w-3.5 h-3.5" />
              <span>
                {lastReportDate
                  ? `Last report: ${new Date(lastReportDate).toLocaleDateString()}`
                  : "Last report: Not yet completed"}
              </span>
            </div>
            {latestAssessment && (
              <Button
                variant="outline"
                size="sm"
                className="w-full mt-3"
                onClick={() => navigate("/prism-assessment")}
              >
                View Report
              </Button>
            )}
          </CardContent>
        </Card>

        <Card className="border border-[#e5e7eb]">
          <CardContent className="p-4 flex flex-col justify-between h-full">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <ClipboardList className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="text-sm font-semibold">PRISM Survey</h3>
                <p className="text-xs text-muted-foreground">Complete your behavioral assessment</p>
              </div>
            </div>
            <Button
              size="sm"
              className="w-full mt-2"
              disabled={hasActiveAssessment}
              onClick={handleRequestSurvey}
            >
              {hasActiveAssessment
                ? "Assessment in Progress"
                : "Request Survey"}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {STATS.map((s) => (
          <StatCard key={s.label} {...s} />
        ))}
      </div>

      {/* Quick Actions — full width */}
      <QuickActions actions={QUICK_ACTIONS} />

      {/* Recent Activity — from audit top actions */}
      <DataCard title="Recent Activity">
        <div className="space-y-4">
          {auditLoading ? (
            <p className="text-sm text-muted-foreground">Loading activity...</p>
          ) : stats?.top_actions && stats.top_actions.length > 0 ? (
            stats.top_actions.slice(0, 5).map((item, i) => {
              const colors = ["bg-emerald-500", "bg-blue-500", "bg-violet-500", "bg-amber-500", "bg-rose-500"];
              return (
                <div key={i} className="flex items-start gap-3">
                  <div className={`w-2 h-2 rounded-full mt-2 ${colors[i % colors.length]}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{item.action.replace(/_/g, " ")}</p>
                    <p className="text-xs text-muted-foreground">{item.count} occurrences</p>
                  </div>
                </div>
              );
            })
          ) : (
            <p className="text-sm text-muted-foreground">No recent activity</p>
          )}
        </div>
      </DataCard>
    </UserLayout>
  );
}
