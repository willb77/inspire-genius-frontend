import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Upload, Target, Compass } from "lucide-react";
import UserLayout from "@/layouts/UserLayout";
import { useAuth } from "@/context/useAuth";
import { ROUTES } from "@/constants/routes";
import { useLatestPrism } from "@/hooks/documents/useLatestPrism";
import { useAuditStats } from "@/hooks/audit/useAudit";
import {
  WelcomeBackTile,
  type WelcomeBackAssessment,
} from "@/components/dashboard/v2/WelcomeBackTile";
import {
  MeridianEngageCard,
  type MeridianQuickChip,
} from "@/components/dashboard/v2/MeridianEngageCard";
import {
  WatchVideoCard,
  type DashboardVideo,
} from "@/components/dashboard/v2/WatchVideoCard";
import {
  RecentActivityCard,
  type ActivityItem,
} from "@/components/dashboard/v2/RecentActivityCard";

/**
 * HomeV2 — the new wireframe user dashboard (ig-surfaces/user-dashboard).
 *
 * Additive + flag-gated (see routes.tsx `new_user_surfaces`); the original Home
 * is untouched and reachable at /home/classic. Data comes from existing hooks
 * only. PRISM status is sourced from GET /v1/documents/latest-prism, not the
 * 404-ing /v1/prism/history.
 *
 * Layout (single full-width column, reduced vertical density):
 *   1. WelcomeBackTile  — welcome + behavioral + onboarding merged
 *   2. MeridianEngageCard — merged engage hero + Meridian greeting + quick chips
 *      (the old right-side MeridianPanel is folded into this one tile)
 *   3. Action tile — Upload a File/Document · Goals · Careers
 *   4. WatchVideoCard — 4 real demo videos with HTML5 playback
 *   5. RecentActivityCard
 */

const VIDEOS: DashboardVideo[] = [
  {
    id: "prism-survey",
    title: "PRISM Survey — Introduction",
    src: "https://dj7od5nj42063.cloudfront.net/demo/PRISM_Survey_Intro.mp4",
  },
  {
    id: "neuroscience",
    title: "The Neuroscience of Behavior",
    src: "https://ig-demo-public-videos.s3.amazonaws.com/IG_Neuroscience_of_Behavior_Narrated.mp4",
  },
  {
    id: "brainmap-quiz",
    title: "Brain-Map Quiz",
    src: "https://ig-demo-public-videos.s3.amazonaws.com/IG-BrainMap_quiz.mp4",
  },
  {
    id: "journey-map",
    title: "Journey Map Demo",
    src: "https://ig-demo-public-videos.s3.amazonaws.com/Journey_Map_Demos.mp4",
  },
];

// Additional-assessment roster (per spec). Bind to a real endpoint later.
const ASSESSMENTS: WelcomeBackAssessment[] = [
  { name: "DiSC", done: true },
  { name: "Myers-Briggs (MBTI)", done: false },
  { name: "CliftonStrengths (StrengthsFinder)", done: true },
  { name: "Hogan", done: false },
  { name: "The Big Five (OCEAN)", done: false },
  { name: "Enneagram", done: false },
];

const MISSING_PROFILE = ["Resume", "Bio", "Additional info"];

const MERIDIAN_CHIPS: MeridianQuickChip[] = [
  { label: "Goals", prompt: "Help me set a goal and a plan to reach it." },
  { label: "Careers", prompt: "Help me explore careers that fit my strengths." },
  {
    label: "Review my resume",
    prompt: "Can you review my resume and suggest improvements?",
  },
];

const ACTION_BTN_CLASS =
  "inline-flex flex-1 min-w-[10rem] items-center justify-center gap-2 rounded-xl border border-[rgba(11,27,51,0.10)] bg-white px-4 py-2.5 text-sm font-medium text-[#0B1B33] shadow-sm transition-colors hover:bg-[#5B8A72]/[0.08]";

export default function HomeV2() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const firstName =
    user?.fullName?.split(" ")[0] ?? user?.name?.split(" ")[0] ?? "there";
  const displayName =
    user?.name?.trim() || user?.email?.split("@")[0] || firstName;

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

  const goToAssessment = (): void => {
    navigate(ROUTES.PRISM_ASSESSMENT);
  };

  // Goals + Careers pages are on hold — surface the buttons but no navigation yet.
  const comingSoon = (name: string) => () => toast.info(`${name} is coming soon`);

  return (
    <UserLayout>
      <div className="rounded-2xl bg-[#FBF7F0] p-4 md:p-6">
        <div className="mx-auto flex max-w-6xl flex-col gap-4">
          <WelcomeBackTile
            displayName={displayName}
            onResumeConversation={() => goToChat()}
            hasReport={hasReport}
            reportFileName={latestPrism?.file_name}
            prismLoading={prismLoading}
            onRequestAssessment={goToAssessment}
            onViewReportPdf={goToAssessment}
            profilePercent={40}
            missing={MISSING_PROFILE}
            assessments={ASSESSMENTS}
            onAddAssessment={(name) => toast.info(`Add ${name} — coming soon`)}
          />

          {/* Merged Meridian tile — engage hero + greeting + quick chips
              (the old right-side panel is folded in here). */}
          <MeridianEngageCard
            firstName={firstName}
            onAsk={(text) => goToChat(text)}
            onAssessment={goToAssessment}
            quickChips={MERIDIAN_CHIPS}
            onQuickChip={(chip) => goToChat(chip.prompt)}
          />

          {/* Action tile — sits directly above Watch a Video. */}
          <div className="rounded-2xl border border-[rgba(11,27,51,0.10)] bg-white p-4 shadow-sm">
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => navigate(ROUTES.DOCUMENTS)}
                className={ACTION_BTN_CLASS}
              >
                <Upload className="size-4 text-[#3E6B55]" />
                Upload a File/Document
              </button>
              <button
                type="button"
                onClick={comingSoon("Goals")}
                className={ACTION_BTN_CLASS}
              >
                <Target className="size-4 text-[#C9711A]" />
                Goals
              </button>
              <button
                type="button"
                onClick={comingSoon("Careers")}
                className={ACTION_BTN_CLASS}
              >
                <Compass className="size-4 text-[#3E6B55]" />
                Careers
              </button>
            </div>
          </div>

          <WatchVideoCard videos={VIDEOS} />

          <RecentActivityCard
            items={activityItems}
            loading={auditLoading}
            emptyLabel="No recent activity yet"
          />
        </div>
      </div>
    </UserLayout>
  );
}
