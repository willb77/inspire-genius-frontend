import { useMemo, useState } from "react";
import UserLayout from "@/layouts/UserLayout";
import CoachCard from "@/components/onboarding/CoachCard";
import CoachCardSkeleton from "@/components/shared/CoachCardSkeleton";
import IconInput from "@/components/ui/icon-input";
import { Search } from "lucide-react";
import { useCoachData } from "@/hooks/coaches/useCoachData";
import { useUpdatePreferences } from "@/hooks/coaches/useUpdatePreferences";
import { useQueryClient } from "@tanstack/react-query";

export default function Coaches() {
  const [query, setQuery] = useState("");
  const [submittingAgentId, setSubmittingAgentId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { agents: rawAgents, toneOptions, accentOptions, genderOptions, isLoading } = useCoachData({ page: 1, page_size: 10 });

  const updateMutation = useUpdatePreferences();

  const agents = useMemo(() => {
    const list = rawAgents;
    const q = query.trim().toLowerCase();
    return (Array.isArray(list) ? list : []).filter((a) => !q || String(a.name ?? "").toLowerCase().includes(q));
  }, [rawAgents, query]);

  return (
    <UserLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold tracking-tight">Coaches</h1>
          <div className="w-full max-w-xs">
            <IconInput
              placeholder="Search.."
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
            const tourAttr =
              idx === 0 ? { 'data-tour': 'coach-card-1-coaches' } :
              idx === 1 ? { 'data-tour': 'coach-card-2-coaches' } :
              idx === 2 ? { 'data-tour': 'coach-card-3-coaches' } : {};
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
                  disableButton = {true}
                  selectedGenderId={agent.user_gender?.id ?? undefined}
                  selectedAccentId={agent.user_accent?.id ?? undefined}
                  selectedToneIds={selectedToneIds}
                  extraCount={Math.max(0, selectedToneIds.length - 1)}
                  onSubmit={handleSubmit}
                  isSubmitting={updateMutation.isPending && submittingAgentId === agent.id}
                  isOptionsLoading={isLoading}
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
