import { useQuery } from "@tanstack/react-query";
import { getUserAgentAssignments, type UserAgentAssignment } from "@/services/super-admin/coaches/coachesService";

const QK = {
  assignments: (userId: string) => ["super-admin", "user-coaches", userId] as const,
};

export function useUserCoaches(userId: string | undefined) {
  return useQuery({
    enabled: typeof userId === "string" && !!userId,
    queryKey: QK.assignments(userId || ""),
    queryFn: async () => {
      if (!userId) return { user_name: "", agents: [] as UserAgentAssignment[] };
      const res = await getUserAgentAssignments(userId);
      const list: UserAgentAssignment[] = (res?.data?.agents ?? []) as UserAgentAssignment[];
      const user_name = (res?.data as { user_name?: string } | undefined)?.user_name ?? "";
      return { user_name, agents: list };
    },
    staleTime: 60_000,
  });
}
