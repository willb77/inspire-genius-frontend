import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Briefcase, Sparkles, UserRoundSearch } from "lucide-react";
import UserLayout from "@/layouts/UserLayout";
import { useAuth } from "@/context/useAuth";
import { ROUTES } from "@/constants/routes";
import { useEnabledVerticals } from "@/verticals/core";
import { useLatestPrism } from "@/hooks/documents/useLatestPrism";
import { useLoadedFrameworks, useMyProfile } from "@/hooks/profile/useProfile";
import {
  WelcomeBackTile,
  type WelcomeBackAssessment,
  type WelcomeBackPersonalInfo,
  type WelcomeBackQuickAction,
} from "@/components/dashboard/v2/WelcomeBackTile";
import {
  AddPersonalDocModal,
  type AddPersonalDocTarget,
} from "@/components/dashboard/v2/AddPersonalDocModal";
import {
  AddAssessmentModal,
  type AddAssessmentTarget,
} from "@/components/dashboard/v2/AddAssessmentModal";
import { MeridianEngageCard } from "@/components/dashboard/v2/MeridianEngageCard";
import { QuickDirectionCard } from "@/components/dashboard/v2/QuickDirectionCard";
import { MERIDIAN_STARTER_GROUPS } from "@/constants/meridianStarterQuestions";
import type { DashboardVideo } from "@/components/dashboard/v2/WatchVideoCard";

/**
 * HomeV2 — the user dashboard (ig-surfaces/user-dashboard), and since
 * 2026-08-01 the DEFAULT surface at /home. The original Home is untouched and
 * stays reachable at /home/classic; see `isNewHomeEnabled` in
 * `@/lib/surfaceFlags` for how the default is resolved.
 *
 * Data comes from existing hooks only. PRISM status is sourced from
 * GET /v1/documents/latest-prism; the other-assessment checkmarks come from
 * GET /v1/profile/me/loaded-frameworks (useLoadedFrameworks) — an item is
 * "done" (Add greyed, checkmark filled) when the user holds an authoritative
 * assessment in that framework.
 *
 * Layout — two tiles, nothing below them:
 *   1. MeridianEngageCard — "Chat with Meridian": greeting + ask box + Starter
 *      Questions (collapsed by default).
 *   2. WelcomeBackTile    — welcome + behavioral + completion gauge, then the
 *      quick-action row (Self-Portrait / Today's Prep / Job Fit / Videos) and
 *      the Personal Info + Other Assessments dropdowns.
 *
 * The Watch-a-Video and Recent-Activity tiles were removed; the videos survive
 * inside the quick-action row's Videos dropdown, so nothing became unreachable.
 *
 * `QuickDirectionCard` sits after those two. It is self-gating — it renders
 * null unless the user is entitled to Direction Setting AND the journey read
 * succeeds — so for everyone else the two-tile layout above is exactly what
 * renders, and a failure in a new vertical cannot clutter Home.
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

// Quick-action links under the completion gauge. Each belongs to an
// entitlement-gated vertical, so each is resolved against the user's
// enabled_verticals before it renders as a live link.
const QUICK_ACTIONS: {
  key: string;
  labelKey: string;
  defaultLabel: string;
  to: string;
  vertical: string;
  icon: WelcomeBackQuickAction["icon"];
}[] = [
  {
    key: "self-portrait",
    labelKey: "homeV2.quickSelfPortrait",
    defaultLabel: "Self-Portrait",
    to: ROUTES.LUMEN.SELF_PORTRAIT,
    vertical: "lumen",
    icon: UserRoundSearch,
  },
  {
    key: "moments",
    labelKey: "homeV2.quickTodaysPrep",
    defaultLabel: "Today's Prep",
    to: ROUTES.LUMEN.MOMENTS,
    vertical: "lumen",
    icon: Sparkles,
  },
  {
    key: "job-fit",
    labelKey: "homeV2.quickJobFit",
    defaultLabel: "Job Fit",
    to: ROUTES.JOB_FIT.MATCHES,
    vertical: "job-fit",
    icon: Briefcase,
  },
];

// "Other Assessments" roster → canonical framework name emitted by
// GET /v1/profile/me/loaded-frameworks.
const ASSESSMENT_CATALOG: { name: string; framework: string }[] = [
  { name: "DISC", framework: "DISC" },
  { name: "Myers-Briggs", framework: "MBTI" },
  { name: "Clifton Strengths", framework: "CLIFTON" },
  { name: "Hogan", framework: "HOGAN" },
  { name: "The Big Five", framework: "BIG_FIVE" },
];

// "Personal Info" roster. Everything except the PRISM report resolves its
// done-state from GET /me `personal_docs` (documents tagged
// resume/cv/bio/personal); PRISM resolves from GET /v1/documents/latest-prism
// instead, which is why it carries no `matches` list.
const PRISM_DOC_KIND = "prism";
const PERSONAL_INFO_CATALOG: {
  name: string;
  docKind: string;
  /** Absent for PRISM — see above. */
  matches?: string[];
  accept?: string;
  promptOverride?: string;
}[] = [
  {
    name: "Prism Rpt .csv",
    docKind: PRISM_DOC_KIND,
    accept: ".csv,text/csv",
    promptOverride:
      "Upload your PRISM report (.csv). We'll tag it as your PRISM result so Meridian can read your brain map in every chat.",
  },
  { name: "Resume", docKind: "resume", matches: ["resume", "cv"] },
  { name: "Bio", docKind: "bio", matches: ["bio"] },
  { name: "Additional Info", docKind: "personal", matches: ["personal"] },
];

export default function HomeV2() {
  const { t } = useTranslation("dashboard");
  const { user } = useAuth();
  const navigate = useNavigate();
  const [addTarget, setAddTarget] = useState<AddAssessmentTarget | null>(null);
  const [personalTarget, setPersonalTarget] =
    useState<AddPersonalDocTarget | null>(null);
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

  // Entitlement gates USE, not SIGHT: an unentitled quick action still renders
  // (greyed + locked) so the capability stays discoverable. `[]` is also the
  // loading default, so a slow query cannot flash a working link that the route
  // guard then rejects.
  const { data: entitledVerticals = [] } = useEnabledVerticals();
  const quickActions: WelcomeBackQuickAction[] = useMemo(
    () =>
      QUICK_ACTIONS.map(({ key, labelKey, defaultLabel, to, vertical, icon }) => ({
        key,
        label: t(labelKey, { defaultValue: defaultLabel }),
        to,
        icon,
        entitled: entitledVerticals.includes(vertical),
      })),
    [entitledVerticals, t],
  );

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

  const { data: profileMe } = useMyProfile();
  const personalSet = useMemo(
    () => new Set((profileMe?.personal_docs ?? []).map((k) => k.toLowerCase())),
    [profileMe],
  );
  const personalInfo: WelcomeBackPersonalInfo[] = useMemo(
    () =>
      PERSONAL_INFO_CATALOG.map((p) => ({
        name: p.name,
        done: p.matches
          ? p.matches.some((k) => personalSet.has(k))
          : hasReport || personalSet.has(PRISM_DOC_KIND),
      })),
    [personalSet, hasReport],
  );

  // PRISM now lives inside personalInfo, so it is counted there — counting it
  // again as a standalone term would over-weight it and cap the gauge below
  // 100% for a fully-complete profile.
  const profilePercent = useMemo(() => {
    const items = [...assessments, ...personalInfo];
    if (items.length === 0) return 0;
    const doneCount = items.filter((i) => i.done).length;
    return Math.round((doneCount / items.length) * 100);
  }, [assessments, personalInfo]);

  // Route into the Meridian chat. When a prompt is supplied (typed ask or a
  // starter question) it is prefilled into the composer and auto-submitted so
  // the user lands on a live response; with no prompt we just open the chat.
  const goToChat = (prompt?: string): void => {
    navigate(ROUTES.MERIDIAN_CHAT, {
      state: prompt ? { prefillPrompt: prompt, autoSubmit: true } : {},
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

  // PRISM / Resume / Bio / Additional Info → open the tagged-upload modal,
  // which uploads the file with the right doc_kind so the profile loader can
  // inject it.
  const openAddPersonalInfo = (name: string): void => {
    const entry = PERSONAL_INFO_CATALOG.find((p) => p.name === name);
    if (entry)
      setPersonalTarget({
        name: entry.name,
        docKind: entry.docKind,
        accept: entry.accept,
        promptOverride: entry.promptOverride,
      });
  };

  return (
    <UserLayout>
      <div className="rounded-2xl bg-[#FBF7F0] p-4 md:p-6">
        <div className="mx-auto flex max-w-6xl flex-col gap-4">
          {/* Chat with Meridian leads the page — the primary action. Starter
              Questions start collapsed so the tile stays compact. */}
          <MeridianEngageCard
            firstName={firstName}
            onAsk={(text) => goToChat(text)}
            starterGroups={MERIDIAN_STARTER_GROUPS}
            onStarterQuestion={(question) => goToChat(question)}
            defaultStarterOpen={false}
          />

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
            onAddPersonalInfo={openAddPersonalInfo}
            quickActions={quickActions}
            videos={VIDEOS}
          />

          <AddPersonalDocModal
            target={personalTarget}
            onOpenChange={(open) => {
              if (!open) setPersonalTarget(null);
            }}
          />

          <AddAssessmentModal
            target={addTarget}
            onOpenChange={(open) => {
              if (!open) setAddTarget(null);
            }}
          />

          {/* Direction Setting — "what should I do next?". Renders null when the
              user isn't entitled or the journey read fails, so it adds nothing
              to Home for anyone outside the vertical. */}
          <QuickDirectionCard />
        </div>
      </div>
    </UserLayout>
  );
}
