import ProgressBar from "@/components/onboarding/ProgressBar";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { ROUTES } from "@/constants/routes";
import { ChevronRight, HelpCircle, Volume2, Pause, Loader2, RotateCcw } from "lucide-react";
import CoachCard from "@/components/onboarding/CoachCard";
import CoachCardSkeleton from "@/components/shared/CoachCardSkeleton";
import { Logo } from "@/components/shared/Logo";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTourSpeech } from "@/hooks/useTourSpeech";
import { useAuth } from "@/context/useAuth";
import { useTour } from "@/context/useTour";
import { useCoachData } from "@/hooks/coaches/useCoachData";
import { useUpdatePreferences } from "@/hooks/coaches/useUpdatePreferences";
import { useQueryClient } from "@tanstack/react-query";

export default function OnboardingDetailsTwo() {
  const navigate = useNavigate();
  const { user, markOnboardingCompleted } = useAuth();
  const { resolveFrontendText } = useTour();
  const [showTour, setShowTour] = useState(false);
  const [pendingDest, setPendingDest] = useState<string | null>(null);
  const [submittingAgentId, setSubmittingAgentId] = useState<string | null>(null);
  const [activeAgentId, setActiveAgentId] = useState<string | null>(null);
  const [activeAgentPhase, setActiveAgentPhase] = useState<'idle' | 'starting' | 'speaking' | 'paused' | 'error'>('idle');
  const queryClient = useQueryClient();
  const logoRef = useRef<HTMLDivElement | null>(null);
  const progressRef = useRef<HTMLDivElement | null>(null);
  const coachRefs = useRef<(HTMLDivElement | null)[]>([]);
  const setCoachRef = (index: number) => (el: HTMLDivElement | null) => {
    coachRefs.current[index] = el;
  };
  const [rects, setRects] = useState<DOMRect[]>([]);
  const { phase, play, pause, resume, replay, hasCached, stop: tourStop } = useTourSpeech();
  const detTwoSelector = '[data-tour="onboarding-details-two"]';
  const detailTwoItem =
    resolveFrontendText({ selector: detTwoSelector, routeKey: 'ONBOARDING_DETAILS.TWO' }) ||
    resolveFrontendText({ selector: detTwoSelector }) ||
    resolveFrontendText({ routeKey: 'ONBOARDING_DETAILS.TWO' });
  const stepId = detailTwoItem?.id;
  const overlayTitle = detailTwoItem?.title || 'Quick tip';
  const overlayDesc = detailTwoItem?.description || 'We highlighted key elements: You can edit coaches anytime.';

  // Consolidated coach data (shared with Coaches.tsx)
  const { agents, toneOptions, accentOptions, genderOptions, isLoading } = useCoachData({ page: 1, page_size: 9 });
  const updateMutation = useUpdatePreferences();

  // Navigate only after onboarding flag is reflected in context
  useEffect(() => {
    if (user?.isOnboardingCompleted && pendingDest) {
      navigate(pendingDest);
      setPendingDest(null);
    }
  }, [user?.isOnboardingCompleted, pendingDest, navigate]);

  const handleMarkOnboarded = useCallback(async (destination: string) => {
    setPendingDest(destination);
    await markOnboardingCompleted();
  }, [markOnboardingCompleted]);

  

  const handleCloseTour = () => {
    tourStop();
    setShowTour(false);
  };

  const measure = () => {
    const next: DOMRect[] = [];
    if (logoRef.current) next.push(logoRef.current.getBoundingClientRect());
    if (progressRef.current) next.push(progressRef.current.getBoundingClientRect());
    // First three coaches only
    for (let i = 0; i < 3; i++) {
      const el = coachRefs.current[i];
      if (el) next.push(el.getBoundingClientRect());
    }
    setRects(next);
  };

  useEffect(() => {
    if (!showTour) return;
    // Measure after open
    const id = window.setTimeout(measure, 50);
    const re = () => measure();
    window.addEventListener("resize", re);
    window.addEventListener("scroll", re, true);
    return () => {
      window.clearTimeout(id);
      window.removeEventListener("resize", re);
      window.removeEventListener("scroll", re, true);
    };
  }, [showTour]);

  return (
    <div data-tour="onboarding-details-two" className="relative min-h-screen w-full p-4 pb-32">
      <div className="w-fit">
        <Logo className="h-20"/>
      </div>
      <div className="mx-auto w-full max-w-4xl space-y-6">
        <div ref={progressRef}  className="flex items-center justify-between">
          <button
            className="text-xs text-muted-foreground hover:text-foreground"
            type="button"
            onClick={() => handleMarkOnboarded(ROUTES.ONBOARDING_DETAILS.ONE)}
          >
            Prev
          </button>
          <ProgressBar current={2} total={2} />
        </div>

        <div className="space-y-1 text-center md:text-left">
          <h2 className="text-xl font-semibold">Configure your mentor</h2>
          <p className="text-xs md:text-sm text-muted-foreground">
            Choose each mentor&apos;s voice tone, gender, and accent so conversations feel natural to you. You can change these settings later.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {isLoading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <CoachCardSkeleton key={i} />
            ))
          ) : (
            agents.map((agent, idx) => {
              const selectedToneIds = Array.isArray(agent.user_tones) ? agent.user_tones.map(t => t.id) : [];
              const handleSubmit = async (values: { genderId?: string; accentId?: string; toneIds: string[] }) => {
                setSubmittingAgentId(agent.id);
                try {
                  await updateMutation.mutateAsync({
                    agentId: agent.id,
                    body: {
                      tone_ids: values.toneIds ?? [],
                      accent_id: values.accentId ?? "",
                      gender_id: values.genderId ?? "",
                    },
                  });
                  await queryClient.invalidateQueries({ predicate: (q) => Array.isArray(q.queryKey) && q.queryKey[0] === 'agents' });
                } finally {
                  setSubmittingAgentId(null);
                }
              };
              return (
                <div key={agent.id} ref={setCoachRef(idx)}>
                  <CoachCard
                    title={agent.name}
                    agentId={agent.id}
                    genders={genderOptions}
                    accents={accentOptions}
                    tones={toneOptions}
                    selectedGenderId={agent.user_gender?.id ?? undefined}
                    selectedAccentId={agent.user_accent?.id ?? undefined}
                    selectedToneIds={selectedToneIds}
                    extraCount={Math.max(0, selectedToneIds.length - 1)}
                    onSubmit={handleSubmit}
                    isSubmitting={updateMutation.isPending && submittingAgentId === agent.id}
                    isOptionsLoading={isLoading}
                    activeAgentId={activeAgentId}
                    setActiveAgentId={setActiveAgentId}
                    activeAgentPhase={activeAgentPhase}
                    setActiveAgentPhase={setActiveAgentPhase}
                  />
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Bottom overlay action bar */}
      <div className="fixed w-full left-0 right-0 bottom-0 backdrop-blur-xl">
        <div className="mx-auto w-full max-w-5xl h-24">
          <div className="relative">
            <div className="absolute inset-0" />
            <div className="relative flex items-center justify-between gap-3 pt-3">
              <Button
                variant="outline"
                className="h-10 w-28 bg-white/80"
                type="button"
                onClick={() => {
                  setShowTour(true);
                  const firstCoach = coachRefs.current[0];
                  if (firstCoach) {
                    // Scroll the first coach into view for the tour
                    setTimeout(() => {
                      try {
                        firstCoach.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
                      } catch {
                        // fallback
                        const rect = firstCoach.getBoundingClientRect();
                        window.scrollTo({ top: window.scrollY + rect.top - 80, behavior: "smooth" });
                      }
                    }, 0);
                  }
                }}
              >
                Help <HelpCircle className="ml-2 h-4 w-4" />
              </Button>
              <Button
                className="h-10 w-32"
                type="button"
                onClick={() => handleMarkOnboarded(ROUTES.HOME)}
              >
                Let's go <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
      {showTour && (
        <div className="fixed inset-0 z-50 pointer-events-auto">
          {/* Dim layer */}
          <div
            className="absolute inset-0 bg-black/55"
            onClick={handleCloseTour}
            role="button"
            tabIndex={0}
            aria-label="Close tour"
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") handleCloseTour();
            }}
          />
          {/* Multiple spotlights */}
          {rects.map((r, i) => (
            <div
              key={i}
              className="absolute rounded-xl ring-1 ring-white/90 ring-offset-2 ring-offset-white/30 backdrop-brightness-160 backdrop-saturate-100 backdrop-contrast-200 pointer-events-none"
              style={{ left: r.left, top: r.top, width: r.width, height: r.height }}
            />
          ))}
          {/* Tooltip */}
          <div className="absolute left-[38%] -translate-x-1/2 bottom-4 md:bottom-12 bg-white rounded-xl shadow-xl p-4 w-[min(360px,calc(100vw-24px))]">
            <div className="text-sm font-semibold mb-1">{overlayTitle}</div>
            <div className="text-xs leading-relaxed text-black">
              {overlayDesc}
            </div>
            <div className="mt-3 flex items-center justify-between gap-2">
              <div className="flex items-center gap-4">
              <button
                type="button"
                aria-label={phase === 'speaking' ? "Pause audio" : (phase === 'paused' ? 'Resume audio' : phase === 'starting' ? 'Loading audio' : "Play audio")}
                onClick={() => {
                  if (!stepId) return;
                  if (phase === 'speaking') { pause(); return; }
                  if (phase === 'paused') { resume(); return; }
                  if (phase === 'starting') return;
                  play(stepId);
                }}
                className={`inline-flex items-center justify-center w-8 h-8 rounded-md hover:bg-gray-100 ${phase === 'starting' ? 'animate-pulse' : ''}`}
                disabled={phase === 'starting' || !stepId}
              >
                {phase === 'starting' ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : phase === 'speaking' ? (
                  <Pause className="w-4 h-4" />
                ) : (
                  <Volume2 className="w-4 h-4" />
                )}
              </button>
              {stepId && hasCached(stepId) ? (
                <button
                  type="button"
                  aria-label="Replay audio"
                  onClick={() => {
                    if (!stepId) return;
                    replay(stepId);
                  }}
                  className="inline-flex items-center justify-center w-8 h-8 rounded-md hover:bg-gray-100"
                  disabled={phase === 'starting'}
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              ) : null}
              </div>
              <Button size="sm" className="h-8 bg-blue-primary hover:bg-blue-primary/90" onClick={handleCloseTour}>Got it!</Button>
            </div>
          </div>
          <img src="/images/tour/right-alex.svg" alt="Alex" className="absolute bottom-0 left-1/10 w-48" />
        </div>
      )}
    </div>
  );
}
