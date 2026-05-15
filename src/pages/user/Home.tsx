import UserLayout from "@/layouts/UserLayout";
import { useAuth } from "@/context/useAuth";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ROUTES } from "@/constants/routes";
import DashboardFrame from "@/components/dashboard/DashboardFrame";
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

function getReportStatus(status: string | undefined, t: (key: string) => string): { label: string; bg: string; text: string } {
  if (!status) return { label: t("dashboard:noAssessment"), bg: "bg-gray-100", text: "text-gray-600" };
  if (ACTIVE_STATUSES.has(status as never)) return { label: t("dashboard:pending"), bg: "bg-amber-100", text: "text-amber-700" };
  if (COMPLETED_STATUSES.has(status as never)) return { label: t("dashboard:active"), bg: "bg-emerald-100", text: "text-emerald-700" };
  if (status === ASSESSMENT_STATUS.ERROR) return { label: t("common:error"), bg: "bg-red-100", text: "text-red-700" };
  return { label: status, bg: "bg-gray-100", text: "text-gray-600" };
}

export default function Home() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation(["common", "dashboard", "coaching"]);
  const firstName = user?.fullName?.split(" ")[0] ?? user?.name?.split(" ")[0] ?? "there";

  // Audit stats — real data from GET /v1/audit/stats
  const { data: auditData, isLoading: auditLoading } = useAuditStats();
  const stats = auditData?.data;

  const QUICK_ACTIONS = [
    { label: t("coaching:quickActions.chatWithMeridian"), icon: Bot, to: ROUTES.MERIDIAN_CHAT, bg: "bg-blue-100", iconColor: "text-blue-600" },
    { label: t("dashboard:uploadDocument"), icon: Upload, to: ROUTES.DOCUMENTS, bg: "bg-emerald-100", iconColor: "text-emerald-600" },
    { label: t("coaching:quickActions.viewPrismReport"), icon: ClipboardList, to: ROUTES.PRISM_ASSESSMENT, bg: "bg-violet-100", iconColor: "text-violet-600" },
    { label: t("coaching:quickActions.setNewGoal"), icon: Flag, to: ROUTES.COACHES, bg: "bg-amber-100", iconColor: "text-amber-600" },
  ];

  const STATS = [
    {
      label: t("dashboard:totalSessions"),
      value: auditLoading ? "..." : String(stats?.total_logs ?? 0),
      change: auditLoading ? "" : `+${stats?.logs_this_week ?? 0} ${t("dashboard:thisWeek")}`,
      icon: MessageSquare,
      iconColor: "text-blue-600",
      iconBg: "bg-blue-100",
    },
    {
      label: t("dashboard:sessionsToday"),
      value: auditLoading ? "..." : String(stats?.logs_today ?? 0),
      change: auditLoading ? "" : `${stats?.logs_this_month ?? 0} ${t("dashboard:thisMonth")}`,
      icon: Target,
      iconColor: "text-emerald-600",
      iconBg: "bg-emerald-100",
    },
    {
      label: t("dashboard:aiRequests"),
      value: auditLoading ? "..." : String(stats?.ai_usage?.request_count ?? 0),
      change: auditLoading ? "" : `$${(stats?.ai_usage?.total_cost_usd ?? 0).toFixed(2)} ${t("dashboard:cost")}`,
      icon: Activity,
      iconColor: "text-violet-600",
      iconBg: "bg-violet-100",
    },
    {
      label: t("dashboard:thisMonth"),
      value: auditLoading ? "..." : String(stats?.logs_this_month ?? 0),
      change: auditLoading ? "" : `${stats?.logs_this_week ?? 0} ${t("dashboard:thisWeek")}`,
      icon: FileUp,
      iconColor: "text-amber-600",
      iconBg: "bg-amber-100",
    },
  ];

  // Real PRISM assessment data
  const { data: prismData, isLoading: prismLoading } = usePrismHistory(user?.id ?? null);
  const assessments = (prismData as { data?: { assessments?: Array<{ status: string; initiatedAt?: string | null; completedAt?: string | null }> } } | undefined)?.data?.assessments ?? [];
  const latestAssessment = assessments[0];
  const reportStatus = getReportStatus(latestAssessment?.status, t);
  const lastReportDate = latestAssessment?.completedAt ?? latestAssessment?.initiatedAt;
  const hasActiveAssessment = assessments.some((a) => ACTIVE_STATUSES.has(a.status as never));

  const handleRequestSurvey = () => {
    navigate(ROUTES.PRISM_ASSESSMENT);
  };

  const primary = (
    <>
      {/* Behavioral Report Status + Request Survey */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border border-[#e5e7eb]">
          <CardContent className="p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-violet-100 flex items-center justify-center">
                <FileCheck className="w-5 h-5 text-violet-600" />
              </div>
              <div>
                <h3 className="text-sm font-semibold">{t("dashboard:behavioralReportStatus")}</h3>
                {prismLoading ? (
                  <span className="inline-block mt-0.5 text-xs text-muted-foreground">{t("common:loading")}</span>
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
                  : t("dashboard:lastReportNotCompleted")}
              </span>
            </div>
            {latestAssessment && (
              <Button
                variant="outline"
                size="sm"
                className="w-full mt-3"
                onClick={() => navigate("/prism-assessment")}
              >
                {t("common:viewReport")}
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
                <h3 className="text-sm font-semibold">{t("dashboard:prismSurvey")}</h3>
                <p className="text-xs text-muted-foreground">{t("dashboard:completeAssessment")}</p>
              </div>
            </div>
            <Button
              size="sm"
              className="w-full mt-2"
              disabled={hasActiveAssessment}
              onClick={handleRequestSurvey}
            >
              {hasActiveAssessment
                ? t("dashboard:assessmentInProgress")
                : t("dashboard:requestSurvey")}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions — full width */}
      <QuickActions actions={QUICK_ACTIONS} />

      {/* Recent Activity — from audit top actions */}
      <DataCard title={t("dashboard:recentActivity")}>
        <div className="space-y-4">
          {auditLoading ? (
            <p className="text-sm text-muted-foreground">{t("common:loadingActivity")}</p>
          ) : stats?.top_actions && stats.top_actions.length > 0 ? (
            stats.top_actions.slice(0, 5).map((item, i) => {
              const colors = ["bg-emerald-500", "bg-blue-500", "bg-violet-500", "bg-amber-500", "bg-rose-500"];
              return (
                <div key={i} className="flex items-start gap-3">
                  <div className={`w-2 h-2 rounded-full mt-2 ${colors[i % colors.length]}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{item.action.replace(/_/g, " ")}</p>
                    <p className="text-xs text-muted-foreground">{item.count} {t("common:occurrences")}</p>
                  </div>
                </div>
              );
            })
          ) : (
            <p className="text-sm text-muted-foreground">{t("common:noRecentActivity")}</p>
          )}
        </div>
      </DataCard>
    </>
  )

  const statsKpi = (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {STATS.map((s) => (
        <StatCard key={s.label} {...s} />
      ))}
    </div>
  )

  return (
    <UserLayout>
      <DashboardFrame
        title={t("dashboard:welcome", { name: firstName })}
        subtitle={t("dashboard:homeSubtitle")}
        kpis={statsKpi}
        primary={primary}
      />
    </UserLayout>
  );
}
