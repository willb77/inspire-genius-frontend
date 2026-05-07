import { useQuery } from "@tanstack/react-query";
import { getSystemStatus, type SystemStatus } from "@/services/agent/systemStatusService";

export function useSystemStatus() {
  return useQuery<SystemStatus>({
    queryKey: ["agent", "system-status"],
    queryFn: getSystemStatus,
    refetchInterval: 30_000,
    refetchOnWindowFocus: false,
    staleTime: 15_000,
    retry: 1,
  });
}
