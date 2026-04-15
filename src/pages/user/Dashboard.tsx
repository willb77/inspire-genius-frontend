import UserLayout from "@/layouts/UserLayout";
import { Input } from "@/components/ui/input";
import { Search, AlertCircle, Bot, RefreshCcw, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import UserCoachCard from "@/components/user/UserCoachCard";
import CoachCardSkeleton from "@/components/shared/CoachCardSkeleton";
import { useNavigate } from "react-router-dom";
import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useAgents } from "@/hooks/coaches/useAgents";
import { useAgentEngine } from "@/lib/agentApi";
import { ROUTES } from "@/constants/routes";

type Agent = {
  id: string;
  name: string;
  user_gender: { id: string; name: string } | null;
  user_accent: { id: string; name: string } | null;
  user_tones: Array<{ id: string; name: string }> | null;
};

export default function Dashboard() {
  const navigate = useNavigate();
  const { t } = useTranslation(["dashboard", "common"]);
  const [query, setQuery] = useState("");
  const { data: agentsResp, isLoading: agentsLoading, isError, error, refetch } = useAgents({ page: 1, page_size: 12 });

  // When Agent Engine is OFF, only show the 3 deployed monolith coaches.
  // When Agent Engine is ON, show all ecosystem agents.
  const agentEngineOn = useAgentEngine();
  const ACTIVE_COACH_NAMES = ["prism coach", "training coach", "career coach"];

  const agents = useMemo<Agent[]>(() => {
    if (!agentsResp) return [];
    const payload = agentsResp as Record<string, unknown>;
    const raw = payload?.data ?? payload;
    let list: Agent[];
    if (Array.isArray(raw)) {
      list = raw;
    } else if (raw && typeof raw === "object" && "agents" in raw && Array.isArray((raw as Record<string, unknown>).agents)) {
      list = (raw as { agents: Agent[] }).agents;
    } else {
      list = [];
    }
    // Filter to only active coaches when using monolith
    if (!agentEngineOn) {
      list = list.filter((a) => ACTIVE_COACH_NAMES.includes(String(a.name ?? "").toLowerCase()));
    }
    const q = query.trim().toLowerCase();
    return list.filter((a) => !q || String(a.name ?? "").toLowerCase().includes(q));
  }, [agentsResp, query, agentEngineOn]);

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

  return (
    <UserLayout>
      <div className="space-y-6">
        {agentEngineOn && (
          <div className="mb-6 rounded-lg border bg-gradient-to-r from-violet-50 to-indigo-50 p-6 dark:from-violet-950/20 dark:to-indigo-950/20">
            <div className="flex items-center gap-3">
              <Sparkles className="h-8 w-8 text-violet-500" />
              <div className="flex-1">
                <h3 className="text-lg font-semibold">Chat with Meridian</h3>
                <p className="text-sm text-muted-foreground">
                  Meridian is your unified AI coaching persona. All 18 agents are accessible through a single conversation.
                </p>
              </div>
              <button
                onClick={() => navigate(ROUTES.MERIDIAN_CHAT)}
                className="rounded-md bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700"
              >
                Start Chatting
              </button>
            </div>
          </div>
        )}
        <div className="bg-transparent rounded-xl p-4" data-tour="dashboard-coach-list">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
            <div className="text-left flex-1 min-w-0">
              <h2 className="text-lg font-semibold">{t("dashboard:chooseCoach")}</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                {t("dashboard:coachDescription")}
              </p>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder={t("dashboard:search")}
                className="!bg-white pl-9"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {agentsLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <CoachCardSkeleton key={i} actions="single" />
              ))
            ) : isError ? (
              <div className="col-span-full flex flex-col items-center justify-center py-16 text-center">
                <AlertCircle className="h-12 w-12 text-destructive mb-4" />
                <h3 className="text-lg font-semibold">{t("dashboard:failedLoadCoaches")}</h3>
                <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                  {(error as { message?: string })?.message || t("dashboard:couldNotConnect")}
                </p>
                <Button variant="outline" className="mt-4" onClick={() => refetch()}>
                  <RefreshCcw className="h-4 w-4 mr-2" />
                  {t("common:retry")}
                </Button>
              </div>
            ) : agents.length === 0 ? (
              <div className="col-span-full flex flex-col items-center justify-center py-16 text-center">
                <Bot className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-semibold">{t("dashboard:noCoachesAvailable")}</h3>
                <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                  {query
                    ? t("dashboard:noCoachesMatch", { query })
                    : t("dashboard:noCoachesAssigned")}
                </p>
                {query && (
                  <Button variant="outline" className="mt-4" onClick={() => setQuery("")}>
                    {t("common:clearSearch")}
                  </Button>
                )}
              </div>
            ) : (
              agents.map((a, idx) => {
                const gender = a.user_gender?.name ?? "\u2014";
                const accent = a.user_accent?.name ?? "\u2014";
                const toneNames = (a.user_tones ?? []).map(t => t.name);
                const tone = toneNames.length > 0 ? toneNames.slice(0, 2).join(", ") : "\u2014";
                const extraCount = Math.max(0, toneNames.length - 2);
                return (
                  <div key={a.id} data-tour={idx < 3 ? `coach-card-${idx + 1}` : undefined}>
                    <UserCoachCard
                      title={a.name}
                      gender={gender}
                      accent={accent}
                      disableButton={false}
                      tone={tone}
                      extraCount={extraCount}
                      onChat={() => navigate(`/dashboard/${a.id}--${toSlug(a.name)}/chat`)}
                    />
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </UserLayout>
  );
}
