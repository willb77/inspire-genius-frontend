import ProgressBar from "@/components/onboarding/ProgressBar";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { ROUTES } from "@/constants/routes";
import { ChevronRight, HelpCircle, Volume2, Pause } from "lucide-react";
import CoachCard from "@/components/onboarding/CoachCard";
import { Logo } from "@/components/shared/Logo";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTextToSpeech } from "@/hooks/useTextToSpeech";

export default function OnboardingDetailsTwo() {
  const navigate = useNavigate();
  const [showTour, setShowTour] = useState(false);
  const logoRef = useRef<HTMLDivElement | null>(null);
  const progressRef = useRef<HTMLDivElement | null>(null);
  const coachRefs = useRef<(HTMLDivElement | null)[]>([]);
  const setCoachRef = (index: number) => (el: HTMLDivElement | null) => {
    coachRefs.current[index] = el;
  };
  const [rects, setRects] = useState<DOMRect[]>([]);
  const { phase, toggle, stop, voices } = useTextToSpeech();
  const tooltipText = "We highlighted key elements: You can edit coaches anytime.";

  // Try to pick a female voice if available (heuristic by common female voice names)
  const femaleVoice = useMemo(() => {
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
    // 1) Names explicitly including 'Female'
    const explicit = voices.find(v => /female/i.test(v.name));
    if (explicit) return explicit;
    // 2) Known female-sounding names
    const byName = voices.find(v => preferredNames.some(n => v.name.toLowerCase().includes(n.toLowerCase())));
    if (byName) return byName;
    // 3) Prefer en-* voices if no match
    const en = voices.find(v => v.lang?.toLowerCase().startsWith("en"));
    return en ?? voices[0];
  }, [voices]);

  const handleCloseTour = () => {
    stop();
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
    <div className="relative min-h-screen w-full p-4 pb-32">
      <div className="w-fit">
        <Logo />
      </div>
      <div className="mx-auto w-full max-w-4xl space-y-6">
        <div ref={progressRef}  className="flex items-center justify-between">
          <button
          
            className="text-xs text-muted-foreground hover:text-foreground"
            type="button"
            onClick={() => navigate(ROUTES.ONBOARDING_DETAILS.ONE)}
          >
            Prev
          </button>
          <ProgressBar current={2} total={2} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            "Team Coach",
            "Train Coach",
            "Job Fit Coach",
            "Leadership Coach",
            "Well Being Coach",
            "Career Coach",
          ].map((title, idx) => (
            <div key={idx} ref={setCoachRef(idx)}>
              <CoachCard
                title={title}
                gender="Male"
                accent="American"
                tone="Warm, Motivative"
                extraCount={3}
              />
            </div>
          ))}
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
                onClick={() => setShowTour(true)}
              >
                Help <HelpCircle className="ml-2 h-4 w-4" />
              </Button>
              <Button
                className="h-10 w-32"
                type="button"
                onClick={() => navigate(ROUTES.DASHBOARD)}
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
          <div className="absolute inset-0 bg-black/55" onClick={handleCloseTour} />
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
            <div className="text-sm font-semibold mb-1">Quick tip</div>
            <div className="text-xs leading-relaxed text-black">
              We highlighted key elements: You can edit coaches anytime.
            </div>
            <div className="mt-3 flex items-center justify-between gap-2">
              <button
                type="button"
                aria-label={phase === 'speaking' ? "Pause audio" : (phase === 'starting' ? 'Loading audio' : "Play audio")}
                onClick={() => toggle(tooltipText, { voiceName: femaleVoice?.name, lang: femaleVoice?.lang ?? "en-US" })}
                className={`inline-flex items-center justify-center w-8 h-8 rounded-md hover:bg-gray-100 ${phase === 'starting' ? 'animate-pulse' : ''}`}
                disabled={phase === 'starting'}
              >
                {phase === 'speaking' ? (
                  <Pause className="w-4 h-4" />
                ) : (
                  <Volume2 className="w-4 h-4" />
                )}
              </button>
              <Button size="sm" className="h-8 bg-blue-primary hover:bg-blue-primary/90" onClick={handleCloseTour}>Got it!</Button>
            </div>
          </div>
          <img src="/images/tour/right-alex.svg" alt="Alex" className="absolute bottom-0 left-1/10 w-48" />
        </div>
      )}
    </div>
  );
}
