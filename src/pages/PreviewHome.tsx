/**
 * ⚠️ TEMPORARY preview page — remove before deploy.
 * Renders the Home page design without auth/layout dependencies.
 */
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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

const MOCK_COACHES = [
  "Meridian", "Aura", "Sage", "Alex", "Atlas", "Bridge",
  "Nova", "Echo", "Orion", "Luna", "Ember", "Phoenix",
];

export default function PreviewHome() {
  const quickLinks = [
    { label: "Chat with Coaches", icon: Bot },
    { label: "Manage Coaches", icon: TableProperties },
    { label: "My Documents", icon: FileText },
    { label: "Help & Support", icon: HelpCircle },
    { label: "Settings", icon: Settings },
  ];

  const statCards = [
    { label: "AI Coaches", value: "12", sub: "Available to chat", color: "text-violet-500", bg: "bg-violet-500/10", icon: Users },
    { label: "Conversations", value: "Start", sub: "Chat with a coach", color: "text-blue-500", bg: "bg-blue-500/10", icon: MessageSquare },
    { label: "Documents", value: "View", sub: "Your uploaded files", color: "text-emerald-500", bg: "bg-emerald-500/10", icon: FileText },
    { label: "PRISM Profile", value: "Explore", sub: "Your behavioral insights", color: "text-amber-500", bg: "bg-amber-500/10", icon: Sparkles },
  ];

  return (
    <div className="min-h-screen bg-background p-6 max-w-6xl mx-auto">
      {/* ── Hero Banner ─────────────────────────────────────── */}
      <div className="rounded-2xl bg-gradient-to-br from-blue-600 to-blue-800 px-8 py-7 mb-7">
        <h1 className="text-2xl font-bold text-white">
          Welcome back, James
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
              <div className="relative w-full h-64 bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center">
                <div className="text-center">
                  <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center shadow-lg mx-auto mb-3">
                    <Play className="w-5 h-5 text-blue-600 ml-0.5" />
                  </div>
                  <p className="text-sm text-blue-600 font-medium">PRISM Overview Video</p>
                </div>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mt-4">
              PRISM uses neuroscience-based behavioral insights to help you understand yourself, improve communication, and grow professionally.
            </p>
            <div className="grid grid-cols-2 gap-3 mt-4">
              <Button variant="outline" className="border-blue-500 text-blue-500 hover:bg-blue-500/5">
                Take Survey
              </Button>
              <Button>Know More</Button>
            </div>
          </CardContent>
        </Card>

        {/* Ask Alex */}
        <Card className="lg:col-span-5 border border-border/40 shadow-none">
          <CardContent className="p-5 flex flex-col h-full">
            <div className="flex items-center gap-2 mb-4">
              <Compass className="w-4 h-4 text-emerald-500" />
              <h2 className="text-base font-semibold">Ask Alex</h2>
              <span className="text-[11px] text-muted-foreground ml-auto">Your AI assistant</span>
            </div>
            <div className="relative flex items-center justify-center flex-1 min-h-[200px] rounded-xl bg-muted/20 mb-4">
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-emerald-400 flex items-center justify-center text-white text-2xl font-bold mx-auto mb-3">A</div>
                <p className="text-sm text-muted-foreground">Hey, I'm Alex!</p>
                <p className="text-xs text-muted-foreground">How can I help you?</p>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Button className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white">
                Take a Tour
              </Button>
              <Button variant="secondary" className="w-full h-12 bg-amber-700 hover:bg-amber-800 text-white">
                How to Use
              </Button>
              <Button variant="secondary" className="w-full h-12 bg-orange-800 hover:bg-orange-900 text-white">
                Coaches Introduction
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Explore Coaches ─────────────────────────────────── */}
      <Card className="border border-border/40 shadow-none">
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Bot className="w-4 h-4 text-violet-500" />
              <h2 className="text-base font-semibold">Explore Coaches</h2>
              <span className="text-[11px] text-muted-foreground">AI Coaches at Your Service</span>
            </div>
            <Button variant="ghost" size="sm" className="text-xs text-blue-500 hover:text-blue-600">
              View All <ArrowRight className="w-3 h-3 ml-1" />
            </Button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {MOCK_COACHES.map((name) => (
              <button
                key={name}
                className="flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium border border-border/50 bg-muted/30 text-foreground hover:border-blue-400/40 hover:bg-blue-500/5 hover:shadow-sm transition-all cursor-pointer"
              >
                <Bot className="w-3.5 h-3.5 text-violet-400 shrink-0" />
                {name}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
