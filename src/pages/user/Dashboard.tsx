import UserLayout from "@/layouts/UserLayout";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import UserCoachCard from "@/components/user/UserCoachCard";
import CoachCardSkeleton from "@/components/shared/CoachCardSkeleton";
import { useNavigate } from "react-router-dom";
import { useState, useMemo } from "react";
import { useAgents } from "@/hooks/coaches/useAgents";

export default function Dashboard() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const { data: agentsResp, isLoading: agentsLoading } = useAgents({ page: 1, page_size: 12 });

  type Agent = {
    id: string;
    name: string;
    user_gender: { id: string; name: string } | null;
    user_accent: { id: string; name: string } | null;
    user_tones: Array<{ id: string; name: string }> | null;
  };

  const agents = useMemo<Agent[]>(() => {
    const list = (agentsResp as { data?: { agents?: Agent[] } } | undefined)?.data?.agents ?? [];
    const q = query.trim().toLowerCase();
    return (Array.isArray(list) ? list : []).filter((a) => !q || String(a.name ?? "").toLowerCase().includes(q));
  }, [agentsResp, query]);
  return (
    <UserLayout>
      <div className="space-y-6">
        <div className="bg-transparent rounded-xl p-4" data-tour="dashboard-coach-list">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-lg font-semibold">Choose a coach to chat</h2>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Search.."
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
            ) : (
              agents.map((a, idx) => {
                const gender = a.user_gender?.name ?? "—";
                const accent = a.user_accent?.name ?? "—";
                const toneNames = (a.user_tones ?? []).map(t => t.name);
                const tone = toneNames.join(", ") || "—";
                const extraCount = Math.max(0, toneNames.length - 1);
                return (
                  <div key={a.id} data-tour={idx < 3 ? `coach-card-${idx + 1}` : undefined}>
                    <UserCoachCard
                      title={a.name}
                      gender={gender}
                      accent={accent}
                      disableButton = {true}
                      tone={tone}
                      extraCount={extraCount}
                      onChat={() => navigate(`/dashboard/${a.id}/chat`)}
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
