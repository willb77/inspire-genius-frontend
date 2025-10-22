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
import { Volume2, Pause, Loader2 } from "lucide-react";
import { useTextToSpeech } from "@/hooks/useTextToSpeech";
import { scrollToTarget } from "@/lib/scroll";
import { useFrontendText } from "@/hooks/useFrontendText";

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
    tooltipClassName: "right-[5%] bottom-24",
  },

  {
    selector: '[data-tour="docs-sections"]',
    title: "Document sections",
    description:
      "Your files are grouped by Today, Yesterday, and earlier dates.",
    image: "/images/tour/right-alex.svg",
    padding: 12,
    route: ROUTES.DOCUMENTS,
    tooltipClassName: "left-[10%] bottom-20",
  },
  // Settings page
  {
    selector: '[data-tour="settings-account"]',
    title: "Account settings",
    description: "View and edit your profile information.",
    image: "/images/tour/left-alex.svg",
    padding: 12,
    route: ROUTES.SETTINGS,
    tooltipClassName: "left-[30%] bottom-20",
  },
  {
    selector: '[data-tour="settings-notifications"]',
    title: "Notification preferences",
    description: "Control how you receive app notifications.",
    image: "/images/tour/right-alex.svg",
    padding: 12,
    route: ROUTES.SETTINGS,
    tooltipClassName: "right-[10%] bottom-24",
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
    image: "/images/tour/left-alex.svg",
    padding: 12,
    route: ROUTES.HELP,
    tooltipClassName: "left-[25%] bottom-20",
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
  const { data: frontendText, isLoading: frontendTextLoading, error: frontendTextError } = useFrontendText();

  useEffect(() => {
    if (frontendTextLoading) return;
    console.log("/v1/frontend-text (TourContext)", { data: frontendText, error: frontendTextError });
  }, [frontendText, frontendTextLoading, frontendTextError]);

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
    setSteps(toUse);
    setIndex(0);
    setOpen(true);
  }, [apiMappedSteps]);

  const stop = useCallback(() => {
    setOpen(false);
    setIndex(0);
    setSteps([]);
    setRect(null);
  }, []);

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
    () => ({ start, stop, isRunning: open, step: activeStep }),
    [start, stop, open, activeStep]
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
  onNext,
  onPrev,
  onSkip,
}: {
  rect: DOMRect | null;
  padding: number;
  step: TourStep;
  stepIndex: number;
  stepCount: number;
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
}) {
  // Compute positions
  const [vpW, vpH] = [window.innerWidth, window.innerHeight];
  const r = rect;
  const p = padding;
  // Text-to-speech for tooltip description
  const { phase, toggle, stop: ttsStop, voices } = useTextToSpeech();
  const femaleVoice = React.useMemo(() => {
    if (!voices?.length) return undefined;
    const preferredNames = [
      "Female",
      "Aria",
      "Zira",
      "Jenny",
      "Samantha",
      "Allison",
      "Victoria",
      "Karen",
      "Susan",
      "Hazel",
    ];
    const explicit = voices.find((v) => /female/i.test(v.name));
    if (explicit) return explicit;
    const byName = voices.find((v) =>
      preferredNames.some((n) => v.name.toLowerCase().includes(n.toLowerCase()))
    );
    if (byName) return byName;
    const en = voices.find((v) => v.lang?.toLowerCase().startsWith("en"));
    return en ?? voices[0];
  }, [voices]);

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
        ttsStop();
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
              ttsStop();
              onSkip();
            }}
          >
            Skip
          </button>
          <div className="text-xs text-muted-foreground">
            {stepIndex + 1}/{stepCount}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8"
              onClick={() => {
                ttsStop();
                onPrev();
              }}
              disabled={stepIndex === 0}
            >
              Prev
            </Button>
            <button
              type="button"
              aria-label={
                phase === "speaking"
                  ? "Pause audio"
                  : phase === "starting"
                  ? "Loading audio"
                  : "Play audio"
              }
              onClick={() =>
                toggle(step.description, {
                  voiceName: femaleVoice?.name,
                  lang: femaleVoice?.lang ?? "en-US",
                })
              }
              className={`inline-flex items-center justify-center w-8 h-8 rounded-md hover:bg-gray-100 ${
                phase === "starting" ? "animate-pulse" : ""
              }`}
              disabled={phase === "starting"}
            >
              {phase === "starting" ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : phase === "speaking" ? (
                <Pause className="w-4 h-4" />
              ) : (
                <Volume2 className="w-4 h-4" />
              )}
            </button>
            <Button
              size="sm"
              className="h-8 bg-blue-primary hover:bg-blue-primary/90"
              onClick={() => {
                ttsStop();
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
