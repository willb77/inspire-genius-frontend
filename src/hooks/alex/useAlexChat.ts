import { useMutation, useQuery } from "@tanstack/react-query";
import { getAlexDeviceId, getAlexHistoryList, type AlexHistoryListParams } from "@/services/alex/chat.service";

export function useAlexDeviceId(enabled: boolean) {
  return useQuery({
    queryKey: ["alex", "device-id"],
    queryFn: async () => getAlexDeviceId(),
    enabled,
    staleTime: 10 * 60 * 1000,
  });
}



export function useAlexHistoryList(params: AlexHistoryListParams = { limit: 100, offset: 0 }, enabled = false) {
  return useQuery({
    queryKey: ["alex", "history", params],
    queryFn: async () => getAlexHistoryList(params),
    enabled,
    staleTime: 60 * 1000,
  });
}

export function useAlexHistoryListOnce() {
  return useMutation({
    mutationFn: async (params: AlexHistoryListParams) => getAlexHistoryList(params),
  });
}
