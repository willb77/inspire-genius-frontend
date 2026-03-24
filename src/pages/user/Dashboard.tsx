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
    const raw = (agentsResp as { data?: Agent[] | { agents?: Agent[] } } | undefined)?.data;
    const list = Array.isArray(raw) ? raw : (raw as { agents?: Agent[] } | undefined)?.agents ?? [];
    const q = query.trim().toLowerCase();
    return (Array.isArray(list) ? list : []).filter((a) => !q || String(a.name ?? "").toLowerCase().includes(q));
  }, [agentsResp, query]);
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
        <div className="bg-transparent rounded-xl p-4" data-tour="dashboard-coach-list">
          <div className="flex items-center justify-between gap-4">
            <div className="text-left flex-1 min-w-0">
              <h2 className="text-lg font-semibold">Choose a coach to chat</h2>
              <p className="mt-1 max-w-[75%] text-xs text-muted-foreground">
                Pick a coach card below to open a chat and start your conversation. You can adjust each coach&apos;s settings later from the Manage Coaches page.
              </p>
            </div>
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
                const tone = toneNames?.length > 0 ? toneNames.slice(0, 2).join(", ") : "—";
                const extraCount = Math.max(0, toneNames.length - 2);
                return (
                  <div key={a.id} data-tour={idx < 3 ? `coach-card-${idx + 1}` : undefined}>
                    <UserCoachCard
                      title={a.name}
                      gender={gender}
                      accent={accent}
                      disableButton = {false}
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
