import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import SuperAdminLayout from "@/layouts/SuperAdminLayout";
import { Skeleton } from "@/components/ui/skeleton";
import SACoachCard from "@/components/super-admin/SACoachCard";
import { useUserCoaches } from "@/hooks/super-admin/coaches/useUserCoaches";
import { useAssignAgents } from "@/hooks/super-admin/coaches/useAssignAgents";

export default function UserCoaches() {
  const { userId = "" } = useParams();
  const { data, isLoading } = useUserCoaches(userId);
  const [busyId, setBusyId] = useState<string | null>(null);
  const assignMutation = useAssignAgents(userId);

  const list = useMemo(() => {
    return (data?.agents ?? []) as Array<{
      id: string;
      name?: string;
      category_name?: string;
      is_assigned_to_user?: boolean;
      is_active?: boolean;
    }>;
  }, [data]);

  return (
    <SuperAdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold capitalize">{data?.user_name || "User Coaches"}</h1>
        </div>

        {isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-48 rounded-2xl" />
            ))}
          </div>
        )}
        {!isLoading && list.length === 0 && (
          <div className="text-sm text-muted-foreground">No coaches found.</div>
        )}
        {!isLoading && list.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {list.map((c) => {
              const active = Boolean(c.is_assigned_to_user ?? c.is_active);
              return (
                <SACoachCard
                  key={c.id}
                  title={c.name || c.id}
                  categoryName={c.category_name}
                  isActive={active}
                  isLoading={busyId === c.id}
                  disabled={assignMutation.isPending}
                  onToggle={async () => {
                    if (!userId) return;
                    try {
                      setBusyId(c.id);
                      await assignMutation.mutateAsync({
                        user_id: userId,
                        agent_ids: [c.id],
                        is_active: !active,
                      });
                    } finally {
                      setBusyId(null);
                    }
                  }}
                />
              );
            })}
          </div>
        )}
      </div>
    </SuperAdminLayout>
  );
}
