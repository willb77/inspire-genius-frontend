import React, { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import {
  TourContext,
  type TourStep,
  type TourContextValue,
} from "@/context/tour-context";
import { ROUTES } from "@/constants/routes";
import { useLocation, useNavigate } from "react-router-dom";
import { Volume2, Pause, Loader2, RotateCcw } from "lucide-react";
// import { useTextToSpeech } from "@/hooks/useTextToSpeech";
import { useTourSpeech } from "@/hooks/useTourSpeech";
import { scrollToTarget } from "@/lib/scroll";
import { useFrontendText } from "@/hooks/useFrontendText";
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";

// Central default tour steps
const DEFAULT_STEPS: TourStep[] = [
  {
    selector: '[data-tour="nav"]',
    title: "This is your navigation bar",
    description:
      "Move between dashboards, panels, and settings—access everything in a few clicks.",
    image: "/images/tour/left-alex.svg",
    padding: 8,
    route: ROUTES.HOME,
    tooltipClassName: "left-1/4 bottom-10",
    imageClassName: "left-[55%] bottom-10 w-24 md:w-28 lg:w-48",
  },
  {
    selector: '[data-tour="about"]',
    title: "About Prism",
    description:
      "Learn about PRISM Inspire and how it unlocks potential through neuroscience and AI.",
    image: "/images/tour/left-alex.svg",
    padding: 12,
    route: ROUTES.HOME,
    tooltipClassName: "left-[68%] bottom-40",
    imageClassName: "left-[85%] bottom-10 w-24 md:w-28 lg:w-48",
  },
  {
    selector: '[data-tour="ask-alex"]',
    title: "Ask Alex",
    description:
      "Your AI assistant is ready to help. Ask questions and explore features.",
    image: "/images/tour/right-alex.svg",
    padding: 12,
    route: ROUTES.HOME,
    tooltipClassName: "right-[40%] bottom-10",
    imageClassName: "right-[65%] bottom-10 w-24 md:w-28 lg:w-48",
  },
  {
    selector: '[data-tour="explore-coaches"]',
    title: "Explore Coaches",
    description:
      "Browse AI coaches and get personalized support for your needs.",
    image: "/images/tour/left-alex.svg",
    padding: 12,
    route: ROUTES.HOME,
    tooltipClassName: "right-[35%] bottom-2",
    imageClassName: "right-[20%] bottom-2 w-24 md:w-28 lg:w-48",
    increasePadding: "pb-36",
  },
  // Dashboard highlights: first three coaches
  {
    selector: '[data-tour="coach-card-1"]',
    title: "Pick a coach",
    description:
      "Start by exploring a coach card. Each card shows key details.",
    image: "/images/tour/left-alex.svg",
    padding: 12,
    route: ROUTES.DASHBOARD,
    tooltipClassName: "left-[5%] bottom-20",
    imageClassName: "left-[30%] bottom-20 w-24 md:w-28 lg:w-48",
  },
  {
    selector: '[data-tour="coach-card-2"]',
    title: "More coaches",
    description: "You can compare different AI coaches to find the right fit.",
    image: "/images/tour/right-alex.svg",
    padding: 12,
    route: ROUTES.DASHBOARD,
    tooltipClassName: "left-[50%] bottom-5",
    imageClassName: "left-[35%] bottom-5 w-24 md:w-28 lg:w-48",
  },
  {
    selector: '[data-tour="coach-card-3"]',
    title: "Ready to chat",
    description: "Open a coach to start chatting and get guidance.",
    image: "/images/tour/left-alex.svg",
    padding: 12,
    route: ROUTES.DASHBOARD,
    tooltipClassName: "left-[55%] bottom-5",
    imageClassName: "right-[3%] bottom-5 w-24 md:w-28 lg:w-48",
  },

  // Coach chat page (using default dummy coach id/slug "team-coach")
  {
    selector: '[data-tour="chat-history"]',
    title: "Chat history",
    description: "Your recent conversations appear here. Select any to resume.",
    image: "/images/tour/left-alex.svg",
    padding: 12,
    route: "/dashboard/team-coach/chat",
    tooltipClassName: "left-[50%] bottom-40",
    imageClassName: "left-[80%] bottom-40 w-24 md:w-28 lg:w-48",
  },
  {
    selector: '[data-tour="chat-window"]',
    title: "Chat window",
    description: "Type your message and chat with your selected coach here.",
    image: "/images/tour/right-alex.svg",
    padding: 12,
    route: "/dashboard/team-coach/chat",
    tooltipClassName: "left-[18%] bottom-28",
    imageClassName: "left-[5%] bottom-28 w-24 md:w-28 lg:w-48",
  },
  // Coaches page: first three cards (separate from dashboard)
  {
    selector: '[data-tour="coach-card-1-coaches"]',
    title: "Pick a coach",
    description:
      "Start by exploring a coach card. Each card shows key details.",
    image: "/images/tour/left-alex.svg",
    padding: 12,
    route: ROUTES.COACHES,
    tooltipClassName: "left-[5%] bottom-20",
    imageClassName: "left-[30%] bottom-20 w-24 md:w-28 lg:w-48",
  },
  {
    selector: '[data-tour="coach-card-2-coaches"]',
    title: "More coaches",
    description: "You can compare different AI coaches to find the right fit.",
    image: "/images/tour/right-alex.svg",
    padding: 12,
    route: ROUTES.COACHES,
    tooltipClassName: "left-[50%] bottom-5",
    imageClassName: "left-[35%] bottom-5 w-24 md:w-28 lg:w-48",
  },
  {
    selector: '[data-tour="coach-card-3-coaches"]',
    title: "Ready to chat",
    description: "Open a coach to start chatting and get guidance.",
    image: "/images/tour/left-alex.svg",
    padding: 12,
    route: ROUTES.COACHES,
    tooltipClassName: "left-[55%] bottom-5",
    imageClassName: "right-[3%] bottom-5 w-24 md:w-28 lg:w-48",
  },
  // Documents page

  {
    selector: '[data-tour="docs-toolbar"]',
    title: "Search and actions",
    description: "Search, upload, and manage documents with quick actions.",
    image: "/images/tour/right-alex.svg",
    padding: 10,
    route: ROUTES.DOCUMENTS,
    tooltipClassName: "left-[40%] bottom-24 ",
    imageClassName: "left-[20%] bottom-24 w-24 md:w-28 lg:w-48",
  },

  {
    selector: '[data-tour="docs-sections"]',
    title: "Document sections",
    description:
      "Your files are grouped by Today, Yesterday, and earlier dates.",
    image: "/images/tour/right-alex.svg",
    padding: 12,
    route: ROUTES.DOCUMENTS,
    tooltipClassName: "left-[25%] bottom-16",
    imageClassName: "left-[10%] bottom-16 w-24 md:w-28 lg:w-48",
  },
  // Settings page
  {
    selector: '[data-tour="settings-account"]',
    title: "Account settings",
    description: "View and edit your profile information.",
    image: "/images/tour/left-alex.svg",
    padding: 12,
    route: ROUTES.SETTINGS,
    tooltipClassName: "left-[30%] bottom-14",
    imageClassName: "left-[60%] bottom-14 w-24 md:w-28 lg:w-48",
  },
  {
    selector: '[data-tour="settings-notifications"]',
    title: "Notification preferences",
    description: "Control how you receive app notifications.",
    image: "/images/tour/right-alex.svg",
    padding: 12,
    route: ROUTES.SETTINGS,
    tooltipClassName: "right-[10%] bottom-24",
    imageClassName: "right-[60%] bottom-24 w-24 md:w-28 lg:w-48",
  },
  // Help page

  {
    selector: '[data-tour="help-search"]',
    title: "Search help",
    description: "Quickly search for help topics and guides.",
    image: "/images/tour/right-alex.svg",
    padding: 10,
    route: ROUTES.HELP,
    tooltipClassName: "right-[8%] bottom-24",
  },
  {
    selector: '[data-tour="help-form"]',
    title: "Contact support",
    description: "Send us a message and we’ll get back to you.",
    image: "/images/tour/right-alex.svg",
    padding: 12,
    route: ROUTES.HELP,
    tooltipClassName: "left-[25%] bottom-20",
    imageClassName: "left-[10%] bottom-20 w-24 md:w-28 lg:w-48",
  },
  {
    selector: '[data-tour="onboarding-one"]',
    title: "Empower Your Business",
    description:
      "Leverage AI to streamline operations, optimize strategy, and identify growth opportunities, ultimately helping you empower your business to reach its full potential.",
    image: "/images/tour/left-alex.svg",
    padding: 12,
    route: ROUTES.ONBOARDING.ONE,
      tooltipClassName: "right-[15%] bottom-20",
      imageClassName: "right-[5%] bottom-20 w-24 md:w-28 lg:w-48",
  },
  {
    selector: '[data-tour="onboarding-two"]',
    title: "Elevate Your Knowledge",
    description:
      "Go beyond simple answers. We analyze your data and industry trends to elevate your knowledge, giving you a competitive edge in every interaction.",
    image: "/images/tour/right-alex.svg",
    padding: 12,
    route: ROUTES.ONBOARDING.TWO,
    tooltipClassName: "left-[20%] bottom-20",
    imageClassName: "left-[5%] bottom-20 w-24 md:w-28 lg:w-48",
  },
  {
    selector: '[data-tour="onboarding-three"]',
    title: "Strengthen connections",
    description:
      "The platform provides actionable insights and communication strategies to foster and strengthen connections, turning contacts into advocates and partners.",
    image: "/images/tour/left-alex.svg",
    padding: 12,
    route: ROUTES.ONBOARDING.THREE,
    tooltipClassName: "right-[15%] bottom-20",
    imageClassName: "right-[5%] bottom-20 w-24 md:w-28 lg:w-48",
  },
  {
    selector: '[data-tour="onboarding-four"]',
    title: "Smart decisions with AI",
    description:
      "We synthesize complex information instantly, allowing you to move forward with confidence and clarity, ensuring you make the smart decisions that lead to success.",
    image: "/images/tour/right-alex.svg",
    padding: 12,
    route: ROUTES.ONBOARDING.FOUR,
    tooltipClassName: "left-[20%] bottom-20",
    imageClassName: "left-[5%] bottom-20 w-24 md:w-28 lg:w-48",
  },
  {
    selector: '[data-tour="onboarding-five"]',
    title: "Upload Documents",
    description:
      "Begin by securely uploading your key documents. This instantly builds a personal knowledge base for powerful, customized AI coaching.",
    image: "/images/tour/left-alex.svg",
    padding: 12,
    route: ROUTES.ONBOARDING.FIVE,
    tooltipClassName: "right-[15%] bottom-20",
    imageClassName: "right-[5%] bottom-20 w-24 md:w-28 lg:w-48",
  },
  {
    selector: '[data-tour="onboarding-details-one"]',
    title: "Tell us more about you",
    description:
      "Fill the forms below to add more details. The more we know about your unique journey, the better the AI Coach can serve you. Share the details that make your goals personal and actionable",
    image: "/images/tour/right-alex.svg",
    padding: 12,
    route: ROUTES.ONBOARDING_DETAILS.ONE,
    tooltipClassName: "left-[0%] top-10",
    imageClassName: "left-[0%] top-44 w-24 md:w-28 lg:w-48",
  },
 
];

export function TourProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [steps, setSteps] = useState<TourStep[]>([]);
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [padding, setPadding] = useState(12);
  const navigate = useNavigate();
  const location = useLocation();
  const { data: frontendText, } = useFrontendText();



  // Default tour steps live at module scope (see DEFAULT_STEPS above)

  // Map API response to TourStep overrides, preserving DEFAULT_STEPS order
  const apiMappedSteps = useMemo(() => {
    type ApiItem = {
      id: string;
      selector: string;
      routeKey: string;
      title: string;
      description: string;
    };
    type ApiShape = {
      data?: {
        frontend_texts?: ApiItem[];
      };
    };

    const items: ApiItem[] = (frontendText as ApiShape)?.data?.frontend_texts ?? [];
    if (!Array.isArray(items) || items.length === 0) return [] as TourStep[];

    // Helper to map routeKey (e.g., "HOME") to actual path in ROUTES
    const routePathFor = (routeKey: string): string | undefined => {
      const key = routeKey as keyof typeof ROUTES;
      const val = ROUTES[key];
      return typeof val === "string" ? val : undefined;
    };

    // Produce steps in the same order as defaults, overriding when selector matches
    // and the route matches exactly OR the step.route starts with the route path (to support chat subroutes)
    const mapped = DEFAULT_STEPS.map((s) => {
      const match = items.find((it) => {
        if (it.selector !== s.selector) return false;
        const routePath = routePathFor(it.routeKey);
        if (!routePath) return true; // if routeKey not mappable, match by selector only
        if (!s.route) return true; // if step has no route, selector match is enough
        return s.route === routePath || s.route.startsWith(routePath);
      });

      if (!match) return s;
      const overridden: TourStep = {
        ...s,
        id: match.id,
        title: match.title ?? s.title,
        description: match.description ?? s.description,
      };
      return overridden;
    });

    return mapped;
  }, [frontendText]);

  const activeStep = steps[index] ?? null;

  const measure = useCallback(() => {
    if (!activeStep) return;
    const el = document.querySelector(
      activeStep.selector
    ) as HTMLElement | null;
    if (!el) {
      setRect(null);
      return;
    }
    const r = el.getBoundingClientRect();
    setRect(r);
    setPadding(activeStep.padding ?? 12);
  }, [activeStep]);

  // Scroll into view and measure when step changes
  useEffect(() => {
    if (!open || !activeStep) return;
    scrollToTarget(activeStep.selector, "smooth");
    // measure after scroll settles
    const id = window.setTimeout(() => measure(), 300);
    return () => window.clearTimeout(id);
  }, [open, activeStep, measure]);

  // Re-measure on resize/scroll
  useEffect(() => {
    if (!open) return;
    const re = () => measure();
    window.addEventListener("resize", re);
    window.addEventListener("scroll", re, true);
    return () => {
      window.removeEventListener("resize", re);
      window.removeEventListener("scroll", re, true);
    };
  }, [open, measure]);


  const start = useCallback((newSteps?: TourStep[]) => {
    const toUse = newSteps?.length ? newSteps : (apiMappedSteps.length ? apiMappedSteps : DEFAULT_STEPS);
    const isOnboardingRoute = location.pathname.startsWith('/onboarding');
    // Filter steps to the relevant group only
    const grouped = toUse.filter((s) => {
      const r = s.route ?? ''
      return isOnboardingRoute ? r.startsWith('/onboarding') : !r.startsWith('/onboarding')
    })
    setSteps(grouped);
    // If we are on an onboarding route, start from its matching step inside the group
    if (isOnboardingRoute) {
      const idx = grouped.findIndex((s) => !!s.route && (location.pathname === s.route || location.pathname.startsWith(s.route)));
      setIndex(idx >= 0 ? idx : 0);
    } else {
      setIndex(0);
    }
    setOpen(true);
  }, [apiMappedSteps, location.pathname]);

  const stop = useCallback(() => {
    setOpen(false);
    setIndex(0);
    setSteps([]);
    setRect(null);
  }, []);

  // Resolve frontend text for a given selector/routeKey using the same API data TourContext consumes
  const resolveFrontendText = useCallback(
    (q: { selector?: string; routeKey?: string }) => {
      type ApiItem = {
        id: string;
        selector: string;
        routeKey: string;
        title: string;
        description: string;
      };
      type ApiShape = {
        data?: {
          frontend_texts?: ApiItem[];
        };
      };
      const items: ApiItem[] = (frontendText as ApiShape)?.data?.frontend_texts ?? [];
      if (!items.length) return null;
      let found: ApiItem | undefined;
      if (q.selector && q.routeKey) {
        found = items.find((it) => it.selector === q.selector && it.routeKey === q.routeKey);
      }
      if (!found && q.selector) {
        found = items.find((it) => it.selector === q.selector);
      }
      if (!found && q.routeKey) {
        found = items.find((it) => it.routeKey === q.routeKey);
      }
      return found
        ? { id: found.id, title: found.title, description: found.description }
        : null;
    },
    [frontendText]
  );

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") stop();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, stop]);

  // Ensure we are on the correct route for the active step and re-measure on navigation
  useEffect(() => {
    if (!open || !steps.length) return;
    const step = steps[index];
    let id: number | undefined;
    if (step?.route && location.pathname !== step.route) {
      navigate(step.route);
      id = window.setTimeout(() => {
        scrollToTarget(step.selector, "smooth");
        measure();
      }, 400);
    } else {
      // same route, ensure measurement in case content shifted
      id = window.setTimeout(() => {
        scrollToTarget(step.selector, "smooth");
        measure();
      }, 100);
    }
    return () => {
      if (id) window.clearTimeout(id);
    };
  }, [open, steps, index, location.pathname, navigate, measure]);

  const next = useCallback(() => {
    setIndex((i) => {
      const nxt = i + 1;
      if (nxt >= steps.length) {
        stop();
        return i;
      }
      return nxt;
    });
  }, [steps.length, stop]);

  const prev = useCallback(() => setIndex((i) => Math.max(0, i - 1)), []);

  const value = useMemo<TourContextValue>(
    () => ({ start, stop, isRunning: open, step: activeStep, resolveFrontendText }),
    [start, stop, open, activeStep, resolveFrontendText]
  );

  return (
    <TourContext.Provider value={value}>
      {children}
      {open &&
        activeStep &&
        createPortal(
          <Overlay
            rect={rect}
            padding={padding}
            step={activeStep}
            stepIndex={index}
            stepCount={steps.length}
            displayIndex={(function () {
              const isOnboarding = !!activeStep.route && activeStep.route.startsWith('/onboarding');
              const inGroup = steps.filter((s) => {
                const sr = s.route ?? '';
                return isOnboarding ? sr.startsWith('/onboarding') : !sr.startsWith('/onboarding');
              });
              const idx = inGroup.findIndex((s) => s.selector === activeStep.selector && (s.route ?? '') === (activeStep.route ?? ''));
              return idx >= 0 ? idx : 0;
            })()}
            displayCount={(function () {
              const isOnboarding = !!activeStep.route && activeStep.route.startsWith('/onboarding');
              return steps.filter((s) => {
                const sr = s.route ?? '';
                return isOnboarding ? sr.startsWith('/onboarding') : !sr.startsWith('/onboarding');
              }).length;
            })()}
            showPrev={(function () {
              const isOnboarding = !!activeStep.route && activeStep.route.startsWith('/onboarding');
              const inGroup = steps.filter((s) => {
                const sr = s.route ?? '';
                return isOnboarding ? sr.startsWith('/onboarding') : !sr.startsWith('/onboarding');
              });
              const idx = inGroup.findIndex((s) => s.selector === activeStep.selector && (s.route ?? '') === (activeStep.route ?? ''));
              return idx > 0;
            })()}
            onNext={next}
            onPrev={prev}
            onSkip={stop}
          />,
          document.body
        )}
    </TourContext.Provider>
  );
}

function Overlay({
  rect,
  padding,
  step,
  stepIndex,
  stepCount,
  displayIndex,
  displayCount,
  showPrev,
  onNext,
  onPrev,
  onSkip,
}: {
  rect: DOMRect | null;
  padding: number;
  step: TourStep;
  stepIndex: number;
  stepCount: number;
  displayIndex: number;
  displayCount: number;
  showPrev: boolean;
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
}) {
  // Compute positions
  const [vpW, vpH] = [window.innerWidth, window.innerHeight];
  const r = rect;
  const p = padding;
  // Tour speech via API streaming (.pcm)
  const { phase, play, pause, resume, replay, hasCached, stop: tourStop } = useTourSpeech();

  const box = r
    ? {
        left: Math.max(8, r.left - p),
        top: Math.max(8, r.top - p),
        width: Math.min(vpW - 16, r.width + p * 0.1),
        height: Math.min(vpH - 16, r.height + p * 0),
      }
    : null;
  return (
    <div
      aria-live="polite"
      className="fixed inset-0 z-[1000]"
      style={{ pointerEvents: "auto" }}
      onClick={(e) => {
        // clicking on dark area skips; avoid when clicking inside tooltip or spotlight box
        const target = e.target as HTMLElement;
        if (
          target.closest("[data-tour-tooltip]") ||
          target.closest("[data-tour-spotlight]")
        )
          return;
        tourStop();
        onSkip();
      }}
    >
      {/* Transparent overlay for click-capture only (no global dim so highlight stays bright) */}
      <div className="absolute inset-0 bg-transparent" />

      {/* Spotlight box */}
      {box && (
        <div
          data-tour-spotlight
          className="absolute rounded-2xl ring-1 ring-white/95 shadow-[0_0_0_9999px_rgba(0,0,0,0.7)] ring-offset-2 ring-offset-white/40 backdrop-brightness-90 backdrop-saturate-100 backdrop-contrast-115"
          style={{
            left: box.left,
            top: box.top,
            width: box.width,
            height: box.height,
          }}
        />
      )}

      {/* Tooltip */}
      <div
        data-tour-tooltip
        className={
          "absolute bg-white rounded-xl p-4 shadow-xl w-[min(360px,calc(100vw-24px))] " +
          (step.tooltipClassName ? step.tooltipClassName : "")
        }
      >
        <div className="flex items-start gap-3">
          <div>
            <div className="text-sm font-semibold mb-1">{step.title}</div>
            <div className="text-xs text-muted-foreground leading-relaxed">
              {step.description}
            </div>
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between gap-3">
          <button
            className="text-sm text-muted-foreground hover:underline"
            onClick={() => {
              tourStop();
              onSkip();
            }}
          >
            Skip
          </button>
          <div className="text-xs text-muted-foreground">
            {displayIndex + 1}/{displayCount}
          </div>
          <div className="flex items-center gap-2">
            {showPrev && (
              <Button
                variant="outline"
                size="sm"
                className="h-8"
                onClick={() => {
                  tourStop();
                  onPrev();
                }}
              >
                Prev
              </Button>
            )}

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    aria-label={
                      phase === "speaking"
                        ? "Pause audio"
                        : phase === "paused"
                        ? "Resume audio"
                        : phase === "starting"
                        ? "Loading audio"
                        : "Play audio"
                    }
                    onClick={() => {
                      if (!step.id) return;
                      if (phase === "speaking") { pause(); return; }
                      if (phase === "paused") { resume(); return; }
                      if (phase === "starting") return;
                      play(step.id);
                    }}
                    className={`inline-flex items-center justify-center w-8 h-8 rounded-md hover:bg-gray-100 ${phase === "starting" ? "animate-pulse" : ""}`}
                    disabled={phase === "starting" || !step.id}
                  >
                    {phase === "starting" ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : phase === "speaking" ? (
                      <Pause className="w-4 h-4" />
                    ) : (
                      <Volume2 className="w-4 h-4" />
                    )}
                  </button>
                </TooltipTrigger>
                <TooltipContent className="z-[1200]">
                  <span className="text-xs">{phase === "speaking" ? "Pause" : phase === "paused" ? "Resume" : phase === "starting" ? "Loading" : "Play"}</span>
                </TooltipContent>
              </Tooltip>

              {hasCached(step.id) && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      aria-label="Replay audio"
                      onClick={() => {
                        if (!step.id) return;
                        replay(step.id);
                      }}
                      className="inline-flex items-center justify-center w-8 h-8 rounded-md hover:bg-gray-100"
                      disabled={phase === "starting"}
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent className="z-[1200]">
                    <span className="text-xs">Replay</span>
                  </TooltipContent>
                </Tooltip>
              )}
            </TooltipProvider>

            <Button
              size="sm"
              className="h-8 bg-blue-primary hover:bg-blue-primary/90"
              onClick={() => {
                tourStop();
                onNext();
              }}
            >
              {stepIndex + 1 === stepCount ? "Done" : "Next"}
            </Button>
          </div>
        </div>
      </div>
      {step.image ? (
        <img
          src={step.image}
          alt="guide"
          className={
            "pointer-events-none absolute select-none w-24 md:w-28 lg:w-32 " +
            (step.imageClassName ? step.imageClassName : "")
          }
        />
      ) : null}
    </div>
  );
}
