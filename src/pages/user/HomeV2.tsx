import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Upload, Target, Compass } from "lucide-react";
import UserLayout from "@/layouts/UserLayout";
import { useAuth } from "@/context/useAuth";
import { ROUTES } from "@/constants/routes";
import { useLatestPrism } from "@/hooks/documents/useLatestPrism";
import { useAuditStats } from "@/hooks/audit/useAudit";
import { WelcomeTile } from "@/components/dashboard/v2/WelcomeTile";
import {
  WatchVideoCard,
  type DashboardVideo,
} from "@/components/dashboard/v2/WatchVideoCard";
import {
  OnboardingProgressCard,
  type AdditionalAssessment,
} from "@/components/dashboard/v2/OnboardingProgressCard";
import { StarterQuestionsCard } from "@/components/dashboard/v2/StarterQuestionsCard";
import { BehavioralAssessmentCard } from "@/components/dashboard/v2/BehavioralAssessmentCard";
import {
  RecentActivityCard,
  type ActivityItem,
} from "@/components/dashboard/v2/RecentActivityCard";
import {
  MeridianPanel,
  type MeridianQuickChip,
} from "@/components/dashboard/v2/MeridianPanel";

/**
 * HomeV2 — the new wireframe user dashboard (ig-surfaces/user-dashboard).
 *
 * Additive + flag-gated (see routes.tsx `new_user_surfaces`); the original Home
 * is untouched and reachable at /home/classic. Data comes from existing hooks
 * only. PRISM status is sourced from GET /v1/documents/latest-prism, not the
 * 404-ing /v1/prism/history.
 */

const VIDEOS: DashboardVideo[] = [
  { id: "welcome", title: "Welcome to Inspire Genius", duration: "2:14" },
  { id: "prism", title: "Understanding your PRISM brain-map", duration: "3:40" },
  { id: "meridian", title: "Meet Meridian, your mentor", duration: "1:58" },
  { id: "start", title: "Get started in 5 minutes", duration: "4:05" },
];

// Additional-assessment roster (per spec). Bind to a real endpoint later.
const ASSESSMENTS: AdditionalAssessment[] = [
  { name: "DiSC", done: true },
  { name: "Myers-Briggs (MBTI)", done: false },
  { name: "CliftonStrengths (StrengthsFinder)", done: true },
  { name: "Hogan", done: false },
  { name: "The Big Five (OCEAN)", done: false },
  { name: "Enneagram", done: false },
];

const MISSING_PROFILE = ["Resume", "Bio", "Additional info"];

const STARTER_QUESTIONS = [
  "How do I read my PRISM report?",
  "Help me set a goal for this quarter",
  "What careers fit my strengths?",
  "Can you review my resume?",
  "How should I prepare for an interview?",
];

const MERIDIAN_CHIPS: MeridianQuickChip[] = [
  { label: "Goals", prompt: "Help me set a goal and a plan to reach it." },
  { label: "Careers", prompt: "Help me explore careers that fit my strengths." },
  {
    label: "Review my resume",
    prompt: "Can you review my resume and suggest improvements?",
  },
];

export default function HomeV2() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const firstName =
    user?.fullName?.split(" ")[0] ?? user?.name?.split(" ")[0] ?? "there";

  const {
    data: latestPrism,
    isLoading: prismLoading,
    isError: prismError,
  } = useLatestPrism();
  const hasReport = !prismError && !!latestPrism?.file_name;

  const { data: auditData, isLoading: auditLoading } = useAuditStats();
  const activityItems: ActivityItem[] = useMemo(() => {
    const actions = auditData?.data?.top_actions ?? [];
    return actions.slice(0, 5).map((a) => ({
      label: a.action.replace(/_/g, " "),
      meta: `${a.count}×`,
    }));
  }, [auditData]);

  const goToChat = (prompt?: string): void => {
    navigate(ROUTES.MERIDIAN_CHAT, {
      state: { autoLoadPrism: true, ...(prompt ? { prefillPrompt: prompt } : {}) },
    });
  };

  // Goals + Careers pages are on hold — surface the buttons but no navigation yet.
  const comingSoon = (name: string) => () => toast.info(`${name} is coming soon`);

  return (
    <UserLayout>
      <div className="rounded-2xl bg-[#FBF7F0] p-4 md:p-6">
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Main column */}
          <div className="flex flex-col gap-6 lg:col-span-2">
            <WelcomeTile firstName={firstName} />

            <WatchVideoCard videos={VIDEOS} />

            <OnboardingProgressCard
              profilePercent={40}
              missing={MISSING_PROFILE}
              prismStatusLabel="PRISM · Jun 9, 2026"
              assessments={ASSESSMENTS}
              onAddAssessment={(name) => toast.info(`Add ${name} — coming soon`)}
            />

            <StarterQuestionsCard
              onAsk={(text) => goToChat(text)}
              questions={STARTER_QUESTIONS}
              onSelectQuestion={(q) => goToChat(q)}
            />

            {/* Action links (replaces the old Quick Actions grid) */}
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => navigate(ROUTES.DOCUMENTS)}
                className="inline-flex items-center gap-2 rounded-xl border border-[rgba(11,27,51,0.10)] bg-white px-4 py-2.5 text-sm font-medium text-[#0B1B33] shadow-sm transition-colors hover:bg-[#5B8A72]/[0.08]"
              >
                <Upload className="size-4 text-[#3E6B55]" />
                Upload a File/Document
              </button>
              <button
                type="button"
                onClick={comingSoon("Goals")}
                className="inline-flex items-center gap-2 rounded-xl border border-[rgba(11,27,51,0.10)] bg-white px-4 py-2.5 text-sm font-medium text-[#0B1B33] shadow-sm transition-colors hover:bg-[#5B8A72]/[0.08]"
              >
                <Target className="size-4 text-[#C9711A]" />
                Goals
              </button>
              <button
                type="button"
                onClick={comingSoon("Careers")}
                className="inline-flex items-center gap-2 rounded-xl border border-[rgba(11,27,51,0.10)] bg-white px-4 py-2.5 text-sm font-medium text-[#0B1B33] shadow-sm transition-colors hover:bg-[#5B8A72]/[0.08]"
              >
                <Compass className="size-4 text-[#3E6B55]" />
                Careers
              </button>
            </div>

            <BehavioralAssessmentCard
              hasReport={hasReport}
              reportFileName={latestPrism?.file_name}
              loading={prismLoading}
              onRequestAssessment={() => navigate(ROUTES.PRISM_ASSESSMENT)}
              onViewReportPdf={() => navigate(ROUTES.PRISM_ASSESSMENT)}
            />

            <RecentActivityCard
              items={activityItems}
              loading={auditLoading}
              emptyLabel="No recent activity yet"
            />
          </div>

          {/* Right Meridian panel */}
          <div className="lg:col-span-1">
            <div className="lg:sticky lg:top-6">
              <MeridianPanel
                firstName={firstName}
                onSend={(text) => goToChat(text)}
                quickChips={MERIDIAN_CHIPS}
                onQuickChip={(chip) => goToChat(chip.prompt)}
              />
            </div>
          </div>
        </div>
      </div>
    </UserLayout>
  );
}
