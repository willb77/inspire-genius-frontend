import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import UserLayout from "@/layouts/UserLayout";
import CoachCard from "@/components/onboarding/CoachCard";
import CoachCardSkeleton from "@/components/shared/CoachCardSkeleton";
import IconInput from "@/components/ui/icon-input";
import { Search } from "lucide-react";
import { useCoachData } from "@/hooks/coaches/useCoachData";
import { useUpdatePreferences } from "@/hooks/coaches/useUpdatePreferences";
import { useQueryClient } from "@tanstack/react-query";
import { useAgentEngine } from "@/lib/agentApi";

export default function Coaches() {
  const { t } = useTranslation(["common", "dashboard"]);
  const [query, setQuery] = useState("");
  const [submittingAgentId, setSubmittingAgentId] = useState<string | null>(null);
  const [activeAgentId, setActiveAgentId] = useState<string | null>(null);
  const [activeAgentPhase, setActiveAgentPhase] = useState<'idle' | 'starting' | 'speaking' | 'paused' | 'error'>('idle');
  const queryClient = useQueryClient();

  const { agents: rawAgents, toneOptions, accentOptions, genderOptions, isLoading } = useCoachData({ page: 1, page_size: 10 });

  const updateMutation = useUpdatePreferences();

  // When Agent Engine is OFF, only show the 3 deployed monolith coaches.
  // When Agent Engine is ON, show all ecosystem agents.
  const agentEngineOn = useAgentEngine();
  const ACTIVE_COACH_NAMES = ["prism coach", "training coach", "career coach"];

  const agents = useMemo(() => {
    let list = Array.isArray(rawAgents) ? rawAgents : [];
    if (!agentEngineOn) {
      list = list.filter((a) =>
        ACTIVE_COACH_NAMES.includes(String(a.name ?? "").toLowerCase()),
      );
    }
    const q = query.trim().toLowerCase();
    return list.filter((a) => !q || String(a.name ?? "").toLowerCase().includes(q));
  }, [rawAgents, query, agentEngineOn]);

  return (
    <UserLayout>
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex flex-col text-left gap-1">
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">{t("dashboard:manageCoaches")}</h1>
            <p className="text-xs text-muted-foreground">{t("dashboard:coachesConfigDescription")}</p>
          </div>
          <div className="w-full sm:max-w-xs">
            <IconInput
              placeholder={t("dashboard:search")}
              leftIcon={<Search className="size-4" />}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="rounded-xl bg-gray-100"
            />
          </div>
        </div>



        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {isLoading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <CoachCardSkeleton key={i} />
            ))
          ) : (
          agents.map((agent, idx) => {
            const TOUR_ATTRS: Record<number, Record<string, string>> = {
              0: { 'data-tour': 'coach-card-1-coaches' },
              1: { 'data-tour': 'coach-card-2-coaches' },
              2: { 'data-tour': 'coach-card-3-coaches' },
            };
            const tourAttr = TOUR_ATTRS[idx] ?? {};
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
              <div key={agent.id} {...tourAttr}>
                <CoachCard
                  title={agent.name}
                  agentId={agent.id}
                  genders={genderOptions}
                  accents={accentOptions}
                  tones={toneOptions}
                  disableButton = {false}
                  selectedGenderId={agent.user_gender?.id ?? undefined}
                  selectedAccentId={agent.user_accent?.id ?? undefined}
                  selectedToneIds={selectedToneIds}
                  extraCount={Math.max(0, selectedToneIds.length - 2)}
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
    </UserLayout>
  );
}
