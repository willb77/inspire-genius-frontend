import { useMemo, useState } from "react";
import UserLayout from "@/layouts/UserLayout";
import CoachCard from "@/components/onboarding/CoachCard";
import CoachCardSkeleton from "@/components/shared/CoachCardSkeleton";
import IconInput from "@/components/ui/icon-input";
import { Search } from "lucide-react";
import { useAgents } from "@/hooks/coaches/useAgents";
import { useTones } from "@/hooks/coaches/useTones";
import { useAccents } from "@/hooks/coaches/useAccents";
import { useGenders } from "@/hooks/coaches/useGenders";
import { useUpdatePreferences } from "@/hooks/coaches/useUpdatePreferences";
import { useQueryClient } from "@tanstack/react-query";

type Agent = {
  id: string;
  name: string;
  user_gender: { id: string; name: string } | null;
  user_accent: { id: string; name: string } | null;
  user_tones: Array<{ id: string; name: string }> | null;
};
type Option = { label: string; value: string };
export default function Coaches() {
  const [query, setQuery] = useState("");
  const [submittingAgentId, setSubmittingAgentId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: agentsResp, isLoading: agentsLoading } = useAgents({ page: 1, page_size: 10 });
  const { data: tonesResp, isLoading: tonesLoading } = useTones();
  const { data: accentsResp, isLoading: accentsLoading } = useAccents();
  const { data: gendersResp, isLoading: gendersLoading } = useGenders();

  const updateMutation = useUpdatePreferences();


  const toneOptions = useMemo<Option[]>(() => {
    const list = (tonesResp as { data?: { Tones?: Array<{ id: string; name: string }> } } | undefined)?.data?.Tones ?? [];
    return Array.isArray(list) ? list.map((t) => ({ label: t.name, value: t.id })) : [];
  }, [tonesResp]);

  const accentOptions = useMemo<Option[]>(() => {
    const list = (accentsResp as { data?: { Tones?: Array<{ id: string; name: string }> } } | undefined)?.data?.Tones ?? [];
    return Array.isArray(list) ? list.map((a) => ({ label: a.name, value: a.id })) : [];
  }, [accentsResp]);

  const genderOptions = useMemo<Option[]>(() => {
    const list = (gendersResp as { data?: { Genders?: Array<{ id: string; name: string }> } } | undefined)?.data?.Genders ?? [];
    return Array.isArray(list) ? list.map((g) => ({ label: g.name, value: g.id })) : [];
  }, [gendersResp]);

  const agents = useMemo<Agent[]>(() => {
    const list = (agentsResp as { data?: { agents?: Agent[] } } | undefined)?.data?.agents ?? [];
    const q = query.trim().toLowerCase();
    return (Array.isArray(list) ? list : []).filter((a) => !q || String(a.name ?? "").toLowerCase().includes(q));
  }, [agentsResp, query]);

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
          {(agentsLoading || tonesLoading || accentsLoading || gendersLoading) ? (
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
                  selectedGenderId={agent.user_gender?.id ?? undefined}
                  selectedAccentId={agent.user_accent?.id ?? undefined}
                  selectedToneIds={selectedToneIds}
                  extraCount={Math.max(0, selectedToneIds.length - 1)}
                  onSubmit={handleSubmit}
                  isSubmitting={updateMutation.isPending && submittingAgentId === agent.id}
                  isOptionsLoading={tonesLoading || accentsLoading || gendersLoading}
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
