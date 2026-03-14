import UserLayout from "@/layouts/UserLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useTour } from "@/context/useTour";
import { useAuth } from "@/context/useAuth";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAgents } from "@/hooks/coaches/useAgents";
import { ROUTES } from "@/constants/routes";
import {
  Bot,
  FileText,
  Settings,
  HelpCircle,
  TableProperties,
  Play,
  Compass,
  Sparkles,
  BookOpen,
  Users,
  MessageSquare,
  ArrowRight,
} from "lucide-react";

export default function Home() {
  const { start, step } = useTour();
  const { user } = useAuth();
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
    startTimerRef.current = window.setTimeout(() => {
      try {
        videoRef.current?.play().catch(() => undefined);
      } catch { /* no-op */ }
      stopTimerRef.current = window.setTimeout(() => {
        try { videoRef.current?.pause(); } catch { /* no-op */ }
        setShowVideo(false);
      }, 8000);
    }, 0);
  }, [clearTimers]);

  useEffect(() => {
    const id = window.setTimeout(() => startPlaybackCycle(), 1000);
    return () => {
      window.clearTimeout(id);
      clearTimers();
    };
  }, [clearTimers, startPlaybackCycle]);

  const firstName = user?.fullName?.split(" ")[0] ?? user?.name?.split(" ")[0] ?? "there";

  const quickLinks = [
    { label: "Chat with Coaches", icon: Bot, route: ROUTES.DASHBOARD },
    { label: "Manage Coaches", icon: TableProperties, route: ROUTES.COACHES },
    { label: "My Documents", icon: FileText, route: ROUTES.DOCUMENTS },
    { label: "Help & Support", icon: HelpCircle, route: ROUTES.HELP },
    { label: "Settings", icon: Settings, route: ROUTES.SETTINGS },
  ];

  const statCards = [
    { label: "AI Coaches", value: agentsLoading ? "..." : String(agents.length), sub: "Available to chat", color: "text-violet-500", bg: "bg-violet-500/10", icon: Users },
    { label: "Conversations", value: "Start", sub: "Chat with a coach", color: "text-blue-500", bg: "bg-blue-500/10", icon: MessageSquare },
    { label: "Documents", value: "View", sub: "Your uploaded files", color: "text-emerald-500", bg: "bg-emerald-500/10", icon: FileText },
    { label: "PRISM Profile", value: "Explore", sub: "Your behavioral insights", color: "text-amber-500", bg: "bg-amber-500/10", icon: Sparkles },
  ];

  return (
    <UserLayout>
      {/* ── Hero Banner ─────────────────────────────────────── */}
      <div
        className="rounded-2xl bg-gradient-to-br from-blue-600 to-blue-800 px-8 py-7 mb-7"
        data-tour="about"
      >
        <h1 className="text-2xl font-bold text-white">
          Welcome back, {firstName}
        </h1>
        <p className="text-sm text-white/75 mt-1 max-w-xl">
          PRISM Inspire helps you unlock your potential through neuroscience, workforce development, and AI — empowering you to live your best life.
        </p>
        <div className="flex flex-wrap gap-2 mt-5">
          {quickLinks.map((link) => (
            <Button
              key={link.label}
              variant="ghost"
              size="sm"
              className="border border-white/30 bg-white/10 text-white hover:bg-white/25 hover:text-white backdrop-blur-sm text-xs font-medium h-8 px-3"
              onClick={() => navigate(link.route)}
            >
              <link.icon className="w-3.5 h-3.5 mr-1.5" />
              {link.label}
            </Button>
          ))}
        </div>
      </div>

      {/* ── Stat Cards ──────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-7">
        {statCards.map((stat) => (
          <Card key={stat.label} className="border border-border/40 shadow-none">
            <CardContent className="p-4">
              <div className="flex items-center gap-2.5 mb-2.5">
                <div className={`w-9 h-9 rounded-lg ${stat.bg} flex items-center justify-center`}>
                  <stat.icon className={`w-[18px] h-[18px] ${stat.color}`} />
                </div>
                <span className="text-[11px] text-muted-foreground uppercase tracking-wide">
                  {stat.label}
                </span>
              </div>
              <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{stat.sub}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Main Content Grid ───────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-7">
        {/* About Prism / Video */}
        <Card className="lg:col-span-7 border border-border/40 shadow-none overflow-hidden">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <BookOpen className="w-4 h-4 text-blue-500" />
              <h2 className="text-base font-semibold">About PRISM</h2>
            </div>
            <div className="rounded-xl overflow-hidden bg-muted/30 flex items-center justify-center">
              {showVideo ? (
                <video
                  src="/videos/ai-video.mp4"
                  autoPlay
                  muted
                  playsInline
                  controls={false}
                  loop
                  ref={videoRef}
                  className="h-64 w-full object-cover"
                  poster="/images/user/home/about-prism.svg"
                />
              ) : (
                <button
                  type="button"
                  onClick={startPlaybackCycle}
                  className="relative appearance-none border-0 bg-transparent p-0 cursor-pointer group w-full"
                  title="Play overview"
                >
                  <img
                    src="/images/user/home/about-prism.svg"
                    alt="Play overview"
                    className="h-64 w-full object-cover"
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/10 group-hover:bg-black/20 transition-colors">
                    <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                      <Play className="w-5 h-5 text-blue-600 ml-0.5" />
                    </div>
                  </div>
                </button>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-4">
              PRISM uses neuroscience-based behavioral insights to help you understand yourself, improve communication, and grow professionally.
            </p>
            <div className="grid grid-cols-2 gap-3 mt-4">
              <Button variant="outline" className="border-blue-500 text-blue-500 hover:bg-blue-500/5" disabled>
                Take Survey
              </Button>
              <Button disabled>Know More</Button>
            </div>
          </CardContent>
        </Card>

        {/* Ask Alex */}
        <Card className="lg:col-span-5 border border-border/40 shadow-none" data-tour="ask-alex">
          <CardContent className="p-5 flex flex-col h-full">
            <div className="flex items-center gap-2 mb-4">
              <Compass className="w-4 h-4 text-emerald-500" />
              <h2 className="text-base font-semibold">Ask Alex</h2>
              <span className="text-[11px] text-muted-foreground ml-auto">Your AI assistant</span>
            </div>
            <div className="relative flex items-center justify-center flex-1 min-h-[200px] rounded-xl bg-muted/20 mb-4">
              <img
                src="/images/user/home/help-alex.svg"
                alt="Ask Alex"
                className="h-48 object-contain"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Button
                className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white"
                onClick={() => start()}
              >
                <img src="/images/user/home/tour.svg" alt="" className="w-4 h-4 mr-2" />
                Take a Tour
              </Button>
              <Button
                variant="secondary"
                className="w-full h-12 bg-amber-700 hover:bg-amber-800 text-white"
                disabled
              >
                <img src="/images/user/home/how-to-use.svg" alt="" className="w-4 h-4 mr-2" />
                How to Use
              </Button>
              <Button
                variant="secondary"
                className="w-full h-12 bg-orange-800 hover:bg-orange-900 text-white"
                disabled
              >
                <img src="/images/user/home/coaches.svg" alt="" className="w-4 h-4 mr-2" />
                Coaches Introduction
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Explore Coaches ─────────────────────────────────── */}
      <div className={step?.increasePadding ?? ""}>
        <Card className="border border-border/40 shadow-none" data-tour="explore-coaches">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Bot className="w-4 h-4 text-violet-500" />
                <h2 className="text-base font-semibold">Explore Coaches</h2>
                <span className="text-[11px] text-muted-foreground">AI Coaches at Your Service</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-blue-500 hover:text-blue-600"
                onClick={() => navigate(ROUTES.DASHBOARD)}
              >
                View All <ArrowRight className="w-3 h-3 ml-1" />
              </Button>
            </div>
            {agentsLoading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {Array.from({ length: 12 }).map((_, i) => (
                  <Skeleton key={i} className="h-11 w-full rounded-xl" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {agents.map((a) => (
                  <button
                    key={a.id}
                    onClick={() => navigate(`/dashboard/${a.id}--${toSlug(a.name)}/chat`)}
                    className="flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium border border-border/50 bg-muted/30 text-foreground hover:border-blue-400/40 hover:bg-blue-500/5 hover:shadow-sm transition-all"
                  >
                    <Bot className="w-3.5 h-3.5 text-violet-400 shrink-0" />
                    {a.name}
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </UserLayout>
  );
}
