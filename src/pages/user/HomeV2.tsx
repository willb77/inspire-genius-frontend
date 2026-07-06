import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import UserLayout from "@/layouts/UserLayout";
import { useAuth } from "@/context/useAuth";
import { ROUTES } from "@/constants/routes";
import { useLatestPrism } from "@/hooks/documents/useLatestPrism";
import { WelcomeHero } from "@/components/dashboard/v2/WelcomeHero";
import { OnboardingProgressCard } from "@/components/dashboard/v2/OnboardingProgressCard";
import {
  BehavioralAssessmentCard,
  type AssessmentTone,
} from "@/components/dashboard/v2/BehavioralAssessmentCard";
import {
  MeridianStarterCard,
  type PersonaChip,
} from "@/components/dashboard/v2/MeridianStarterCard";

/**
 * HomeV2 — the new wireframe user dashboard (ig-surfaces/user-dashboard).
 *
 * Additive + flag-gated: this renders in place of the original Home only when
 * `isNewUserSurfacesEnabled()` is true (see routes.tsx). The original Home is
 * never edited and stays reachable at /home/classic. All data comes from hooks
 * that already run against stable — no new backend.
 *
 * PRISM status is intentionally sourced from GET /v1/documents/latest-prism
 * (useLatestPrism), NOT the /v1/prism/history endpoint, which 404s today.
 */

const PERSONAS: PersonaChip[] = [
  {
    label: "Setting goals",
    prompt: "Help me set a meaningful goal and a plan to reach it.",
  },
  {
    label: "Corporate / hiring",
    prompt: "I'm hiring — help me think through the role and the right fit.",
  },
  {
    label: "Student — career area",
    prompt: "I'm a student exploring career areas. Where could I start?",
  },
  {
    label: "Adult — career change",
    prompt: "I'm considering a career change. Help me weigh my options.",
  },
];

// Placeholder tier label matching the wireframe. AuthUser has no plan/tier field
// yet; bind this to a real subscription field when one exists (follow-up).
const USER_TIER = "Individual · Free tier";

export default function HomeV2() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const firstName =
    user?.fullName?.split(" ")[0] ?? user?.name?.split(" ")[0] ?? "there";

  // Behavioral card sourced from the working /v1/documents/latest-prism endpoint.
  // A 404 (no PRISM yet) surfaces as isError — the expected first-time state.
  const {
    data: latestPrism,
    isLoading: prismLoading,
    isError: prismError,
  } = useLatestPrism();
  const hasPrism = !prismError && !!latestPrism?.file_name;

  const behavioral = useMemo(() => {
    if (hasPrism) {
      return {
        tone: "active" as AssessmentTone,
        statusLabel: "Report ready",
        lastReportLabel: `Latest report: ${latestPrism?.file_name ?? "available"}`,
        hasReport: true,
      };
    }
    return {
      tone: "none" as AssessmentTone,
      statusLabel: "No assessment yet",
      lastReportLabel: "Last report: not completed",
      hasReport: false,
    };
  }, [hasPrism, latestPrism]);

  // Onboarding progress heuristic (client-derived, pending a real endpoint):
  // a baseline for signing in, with a completed PRISM as the big early milestone.
  const onboardingPercent = hasPrism ? 60 : 15;
  const onboardingCaption = hasPrism
    ? "You're on your way"
    : "You're just getting started";

  const goToChat = (prompt?: string): void => {
    navigate(ROUTES.MERIDIAN_CHAT, {
      state: {
        autoLoadPrism: true,
        ...(prompt ? { prefillPrompt: prompt } : {}),
      },
    });
  };

  return (
    <UserLayout>
      <div className="rounded-2xl bg-[#FBF7F0] p-4 md:p-8">
        <div className="mx-auto flex max-w-6xl flex-col gap-6">
          <WelcomeHero firstName={firstName} tier={USER_TIER} />

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="flex flex-col gap-6 lg:col-span-2">
              <MeridianStarterCard
                onAsk={(text) => goToChat(text)}
                personas={PERSONAS}
                onPersona={(chip) => goToChat(chip.prompt)}
              />
              <BehavioralAssessmentCard
                statusLabel={behavioral.statusLabel}
                tone={behavioral.tone}
                lastReportLabel={behavioral.lastReportLabel}
                hasReport={behavioral.hasReport}
                loading={prismLoading}
                onViewReport={() => navigate(ROUTES.PRISM_ASSESSMENT)}
                onRequestSurvey={() => navigate(ROUTES.PRISM_ASSESSMENT)}
              />
            </div>

            <div className="flex flex-col gap-6">
              <OnboardingProgressCard
                percent={onboardingPercent}
                caption={onboardingCaption}
              />
            </div>
          </div>
        </div>
      </div>
    </UserLayout>
  );
}
