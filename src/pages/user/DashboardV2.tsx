import UserLayout from "@/layouts/UserLayout";
import { Input } from "@/components/ui/input";
import { Search, AlertCircle, Bot, RefreshCcw, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import UserCoachCard from "@/components/user/UserCoachCard";
import CoachCardSkeleton from "@/components/shared/CoachCardSkeleton";
import { useNavigate } from "react-router-dom";
import { useState, useMemo, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useAgents } from "@/hooks/coaches/useAgents";
import { useAgentEngine } from "@/lib/agentApi";
import { ROUTES } from "@/constants/routes";
import { MultiAgentIndicator } from "@/components/shared/MultiAgentIndicator";
import { V2Panel, V2Card } from "@/components/v2";
import AskMeridianButton from "@/components/support/AskMeridianButton";

/**
 * DashboardV2 — the new-design variant of the coach-picker Dashboard. Flag-gated
 * (new_user_surfaces) additive swap; classic page unchanged at /dashboard/classic.
 * Same data/hooks/logic — the Meridian banner + coach-list section + headings are
 * re-skinned to the new tokens (cream panel, V2Card, serif, ink/accent-orange).
 * RTL-safe (logical CSS). All existing t() calls preserved.
 */

type Agent = {
  id: string;
  name: string;
  user_gender: { id: string; name: string } | null;
  user_accent: { id: string; name: string } | null;
  user_tones: Array<{ id: string; name: string }> | null;
};

export default function DashboardV2() {
  const navigate = useNavigate();
  const { t } = useTranslation(["dashboard", "common"]);
  const [query, setQuery] = useState("");
  const { data: agentsResp, isLoading: agentsLoading, isError, error, refetch } = useAgents({ page: 1, page_size: 12 });

  // When Agent Engine is OFF, only show the 3 deployed monolith coaches.
  // When Agent Engine is ON, show all ecosystem agents.
  const agentEngineOn = useAgentEngine();
  const ACTIVE_COACH_NAMES = ["prism coach", "training coach", "career coach"];

  // Hydrate the most recent multi-agent collaboration from sessionStorage
  // (set by MeridianChat when a synthesized response comes back).
  const [recentCollaboration, setRecentCollaboration] = useState<{
    contributingAgents: string[];
    synthesized: boolean;
  } | null>(null);

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem("last_collaboration");
      if (stored) {
        setRecentCollaboration(JSON.parse(stored));
      }
    } catch {
      // ignore malformed payload
    }
  }, []);

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

  return (
    <UserLayout>
      <V2Panel>
        {agentEngineOn && (
          <V2Card className="bg-panel">
            <div className="flex items-center gap-3">
              <Sparkles className="h-8 w-8 text-accent-orange" />
              <div className="flex-1">
                <h3 className="font-serif text-lg text-ink">Chat with Meridian</h3>
                <p className="text-sm text-body-slate">
                  Meridian is your unified AI coaching persona. All 18 agents are accessible through a single conversation.
                </p>
              </div>
              {recentCollaboration && (
                <MultiAgentIndicator
                  contributingAgents={recentCollaboration.contributingAgents}
                  synthesized={recentCollaboration.synthesized}
                  className="ms-auto"
                />
              )}
              <button
                onClick={() => navigate(ROUTES.MERIDIAN_CHAT)}
                className="rounded-md bg-ink px-4 py-2 text-sm font-medium text-white hover:bg-ink/90"
              >
                Start Chatting
              </button>
            </div>
          </V2Card>
        )}
        <V2Card data-tour="dashboard-coach-list">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
            <div className="text-start flex-1 min-w-0">
              <h2 className="font-serif text-lg text-ink">{t("dashboard:chooseCoach")}</h2>
              <p className="mt-1 text-xs text-body-slate">
                {t("dashboard:coachDescription")}
              </p>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search className="absolute start-3 top-1/2 -translate-y-1/2 size-4 text-mute" />
                <Input
                  placeholder={t("dashboard:search")}
                  className="!bg-white ps-9 border-hairline"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
              {/* Answers a question without making the user pick a coach first. */}
              <AskMeridianButton className="!bg-white border-hairline" />
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
                <h3 className="font-serif text-lg text-ink">{t("dashboard:failedLoadCoaches")}</h3>
                <p className="text-sm text-body-slate mt-1 max-w-sm">
                  {(error as { message?: string })?.message || t("dashboard:couldNotConnect")}
                </p>
                <Button variant="outline" className="mt-4" onClick={() => refetch()}>
                  <RefreshCcw className="h-4 w-4 me-2" />
                  {t("common:retry")}
                </Button>
              </div>
            ) : agents.length === 0 ? (
              <div className="col-span-full flex flex-col items-center justify-center py-16 text-center">
                <Bot className="h-12 w-12 text-mute mb-4" />
                <h3 className="font-serif text-lg text-ink">{t("dashboard:noCoachesAvailable")}</h3>
                <p className="text-sm text-body-slate mt-1 max-w-sm">
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
                const gender = a.user_gender?.name ?? "—";
                const accent = a.user_accent?.name ?? "—";
                const toneNames = (a.user_tones ?? []).map(t => t.name);
                const tone = toneNames.length > 0 ? toneNames.slice(0, 2).join(", ") : "—";
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
                      onChat={() => navigate(ROUTES.MERIDIAN_CHAT)}
                    />
                  </div>
                );
              })
            )}
          </div>
        </V2Card>
      </V2Panel>
    </UserLayout>
  );
}
