import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import UserLayout from "@/layouts/UserLayout";
import { useAuth } from "@/context/useAuth";
import { ROUTES } from "@/constants/routes";
import { useLatestPrism } from "@/hooks/documents/useLatestPrism";
import { useAuditStats } from "@/hooks/audit/useAudit";
import { useLoadedFrameworks } from "@/hooks/profile/useProfile";
import {
  WelcomeBackTile,
  type WelcomeBackAssessment,
  type WelcomeBackPersonalInfo,
} from "@/components/dashboard/v2/WelcomeBackTile";
import {
  AddAssessmentModal,
  type AddAssessmentTarget,
} from "@/components/dashboard/v2/AddAssessmentModal";
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
 * only. PRISM status is sourced from GET /v1/documents/latest-prism; the
 * additional-assessment checkmarks are sourced from
 * GET /v1/profile/me/loaded-frameworks (useLoadedFrameworks) — an item is
 * "done" (Add greyed, checkmark filled) when the user holds an authoritative
 * assessment in that framework.
 *
 * Layout (single full-width column, reduced vertical density):
 *   1. WelcomeBackTile   — welcome + behavioral + completeness (assessments +
 *      personal info, each with an Add / done indicator)
 *   2. MeridianEngageCard — merged engage hero + Meridian greeting + quick chips
 *   3. WatchVideoCard    — 5 real demo videos with HTML5 playback
 *   4. RecentActivityCard
 *   (the old inline Action tile — Upload/Goals/Careers — was removed per HomeV3.)
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
  {
    id: "people-transition",
    title: "People in Transition",
    src: "https://dj7od5nj42063.cloudfront.net/demo/People_in_Transition.mp4",
  },
];

// Additional-assessment roster → canonical framework name emitted by
// GET /v1/profile/me/loaded-frameworks. (Enneagram has no backend adapter yet,
// so it never resolves "done" — it stays addable, which is correct.)
const ASSESSMENT_CATALOG: { name: string; framework: string }[] = [
  { name: "DiSC", framework: "DISC" },
  { name: "Myers-Briggs (MBTI)", framework: "MBTI" },
  { name: "CliftonStrengths (StrengthsFinder)", framework: "CLIFTON" },
  { name: "Hogan", framework: "HOGAN" },
  { name: "The Big Five (OCEAN)", framework: "BIG_FIVE" },
  { name: "Enneagram", framework: "ENNEAGRAM" },
];

// Resume / Bio / Additional info. No detection endpoint exists yet (§4.2), so
// these stay not-done (Add active) — matches the completeness contract: an item
// flips to done only when a real source reports it.
const PERSONAL_INFO_ITEMS = ["Resume", "Bio", "Additional info"];

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
  const [addTarget, setAddTarget] = useState<AddAssessmentTarget | null>(null);
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

  const { data: loadedFrameworks = [] } = useLoadedFrameworks();
  // loaded-frameworks is a bare string[] of framework names
  // (LoadedFramework = string; see the type). Match by upper-cased name.
  const loadedSet = useMemo(
    () => new Set(loadedFrameworks.map((f) => f.toUpperCase())),
    [loadedFrameworks],
  );

  const assessments: WelcomeBackAssessment[] = useMemo(
    () =>
      ASSESSMENT_CATALOG.map((a) => ({
        name: a.name,
        done: loadedSet.has(a.framework),
      })),
    [loadedSet],
  );

  const personalInfo: WelcomeBackPersonalInfo[] = useMemo(
    () => PERSONAL_INFO_ITEMS.map((name) => ({ name, done: false })),
    [],
  );

  const profilePercent = useMemo(() => {
    const doneCount =
      (hasReport ? 1 : 0) +
      assessments.filter((a) => a.done).length +
      personalInfo.filter((p) => p.done).length;
    const totalCount = 1 + assessments.length + personalInfo.length;
    return Math.round((doneCount / totalCount) * 100);
  }, [hasReport, assessments, personalInfo]);

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

  // Add an assessment → open the inline upload/ingest modal for that framework.
  const openAddAssessment = (name: string): void => {
    const entry = ASSESSMENT_CATALOG.find((a) => a.name === name);
    if (entry) setAddTarget({ name: entry.name, framework: entry.framework });
  };

  // Resume / Bio / Additional info aren't structured assessments — route those
  // to the document upload surface (existing ingest pipeline).
  const goToUpload = (): void => {
    navigate(ROUTES.DOCUMENTS);
  };

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
            profilePercent={profilePercent}
            assessments={assessments}
            personalInfo={personalInfo}
            onAddAssessment={openAddAssessment}
            onAddPersonalInfo={goToUpload}
          />

          <AddAssessmentModal
            target={addTarget}
            onOpenChange={(open) => {
              if (!open) setAddTarget(null);
            }}
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
