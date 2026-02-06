import UserLayout from "@/layouts/UserLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import OnboardingCallout from "@/components/onboarding/OnboardingCallout";
import { useTour } from "@/context/useTour";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ExploreCoachesNames from "@/components/user/ExploreCoachesNames";
import { useNavigate } from "react-router-dom";
import { useAgents } from "@/hooks/coaches/useAgents";

export default function Home() {
  const { start, step } = useTour();
  const navigate = useNavigate();
  const [showVideo, setShowVideo] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const startTimerRef = useRef<number | null>(null);
  const stopTimerRef = useRef<number | null>(null);
  const { data: agentsResp, isLoading: agentsLoading } = useAgents({ page: 1, page_size: 12 });
  type Agent = { id: string; name: string };
  const agents = useMemo<Agent[]>(() => {
    const list = (agentsResp as { data?: { agents?: Agent[] } } | undefined)?.data?.agents ?? [];
    return Array.isArray(list) ? list : [];
  }, [agentsResp]);
  const toSlug = (s: string) => {
    const input = String(s || "").trim().toLowerCase();
    let out = "";
    let lastWasDash = false;
    for (let i = 0; i < input.length; i += 1) {
      const code = input.charCodeAt(i);
      const isDigit = code >= 48 && code <= 57;
      const isLower = code >= 97 && code <= 122;
      if (isLower || isDigit) {
        out += input[i] ?? "";
        lastWasDash = false;
      } else if (!lastWasDash && out.length > 0) {
        out += "-";
        lastWasDash = true;
      } else {
        lastWasDash = true;
      }
    }
    if (out.endsWith("-")) out = out.slice(0, -1);
    return out;
  };

  const clearTimers = useCallback(() => {
    if (startTimerRef.current) {
      window.clearTimeout(startTimerRef.current);
      startTimerRef.current = null;
    }
    if (stopTimerRef.current) {
      window.clearTimeout(stopTimerRef.current);
      stopTimerRef.current = null;
    }
  }, []);

  const startPlaybackCycle = useCallback(() => {
    clearTimers();
    setShowVideo(true);
    // Allow DOM to render the <video> before playing
    startTimerRef.current = window.setTimeout(() => {
      try {
        videoRef.current?.play().catch(() => undefined);
      } catch { /* no-op */ }
      // Stop after 30s
      stopTimerRef.current = window.setTimeout(() => {
        try { videoRef.current?.pause(); } catch { /* no-op */ }
        setShowVideo(false);
      }, 8000);
    }, 0);
  }, [clearTimers]);

  useEffect(() => {
    // Auto-start after 2 seconds on first mount
    const id = window.setTimeout(() => startPlaybackCycle(), 1000);
    return () => {
      window.clearTimeout(id);
      clearTimers();
    };
  }, [clearTimers, startPlaybackCycle]);
  return (
    <UserLayout>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <Card className="rounded-lg bg-blue-20 lg:col-span-7 border-none shadow-none" data-tour="about">
          <CardHeader>
            <CardTitle className="text-left">About Prism</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 flex flex-col gap-6">
            <div className="flex flex-col items-start gap-4">
            <div className="rounded-2xl flex items-center justify-center">
              {showVideo ? (
                <video
                  src="/videos/ai-video.mp4"
                  autoPlay
                  muted
                  playsInline
                  controls={false}
                  loop
                  ref={videoRef}
                  className="h-80 object-cover rounded-2xl"
                  poster="/images/user/home/about-prism.svg"
                />
              ) : (
                <button
                  type="button"
                  onClick={startPlaybackCycle}
                  className="appearance-none border-0 bg-transparent p-0 cursor-pointer"
                  title="Play overview"
                >
                  <img
                    src="/images/user/home/about-prism.svg"
                    alt="Play overview"
                    className="h-80 object-cover rounded-2xl"
                  />
                </button>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              PRISM Inspire helps people unlock their potential through neuroscience, workforce development, and AI—empowering individuals everywhere to live their best lives.
            </p>
            </div>
            <div className="grid grid-cols-2 gap-5">
              <Button variant="outline" className="cursor-not-allowed w-full border border-blue-primary text-blue-primary">Take Survey</Button>
              <Button className="cursor-not-allowed w-full">Know more</Button>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-lg bg-gray-20 lg:col-span-5 border-none shadow-none" data-tour="ask-alex">
          <CardHeader className="text-left">
            <CardTitle>Ask Alex</CardTitle>
            <p className="text-xs text-muted-foreground">Your AI assistant is here to help!</p>
          </CardHeader>

          <CardContent className="space-y-3 relative">
          <div className="relative flex items-center justify-center h-72">
            <img src="/images/user/home/help-alex.svg" alt="Ask Alex" className="h-full object-cover" />
            <OnboardingCallout
                  title="How can i help you?"
                  positionClass="z-10 absolute top-[50%] md:top-36 right-[0%] md:right-[20%] lg:right-[0%]"
                  className="!rounded-b-xl !rounded-tr-xl"
                />
                      <OnboardingCallout
                  title="Hey ,I’m Alex"
                  positionClass="z-10 absolute top-[5%] md:top-10 lg:top-10 right-[60%] md:right-[60%] lg:right-[60%]"
                  className="!rounded-b-xl !rounded-tr-xl !text-blue-primary"
                />
                <img src="/images/user/home/alex-stars.svg" alt="Alex" className="absolute top-0 right-0  md:right-[20%] lg:right-[10%]" />
          </div>
          <div className="absolute -bottom-32 left-0 w-full flex flex-col gap-2 px-4">
            <Button
              className="w-full h-16 bg-blue-primary hover:bg-blue-primary/80 hover:text-white text-white"
              variant="secondary"
              onClick={() => start()}
            >
              <img src="/images/user/home/tour.svg" alt="Tour" className="w-5 h-5" />
              <span>Take a Tour</span>
            </Button>
            <Button className="cursor-not-allowed w-full h-16 bg-brown-350 hover:bg-brown-350/80 hover:text-white text-white" variant="outline"><img src="/images/user/home/how-to-use.svg" alt="How to use" className="w-5 h-5" /><span>How to use</span></Button>
            <Button className="cursor-not-allowed w-full h-16 bg-brown-250 hover:bg-brown-250/80 hover:text-white text-white" variant="destructive"><img src="/images/user/home/coaches.svg" alt="Coaches" className="w-5 h-5" /><span>Coaches Introduction</span></Button>
          </div>
          </CardContent>
        </Card>
      </div>

      <div className={`mt-8 ${step?.increasePadding ?? ''}`}>
        <Card className="border-none shadow-none" data-tour="explore-coaches">
          <CardHeader className="text-left">
            <CardTitle>Explore Coaches</CardTitle>
            <p className="text-xs text-muted-foreground">AI Coaches at Your Service.</p>
          </CardHeader>
          <CardContent>
            <ExploreCoachesNames
              agents={agents}
              isLoading={agentsLoading}
              onSelect={(a) => navigate(`/dashboard/${a.id}--${toSlug(a.name)}/chat`)}
            />
          </CardContent>
        </Card>
      </div>
    </UserLayout>
  );
}
