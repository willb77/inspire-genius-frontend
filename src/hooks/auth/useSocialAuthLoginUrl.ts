import { useMutation, type UseMutationOptions } from "@tanstack/react-query";
import type { AxiosError } from "axios";
import { getSocialAuthLoginUrl } from "@/services/auth.service";
import type { ApiEnvelope } from "@/types/auth/api-types";

type Vars = { provider: string };
export type SocialAuthLoginUrlData = ApiEnvelope<{ login_url: string }>;

export function useSocialAuthLoginUrlMutation(
  options?: UseMutationOptions<SocialAuthLoginUrlData, AxiosError<ApiEnvelope>, Vars>
) {
  return useMutation<SocialAuthLoginUrlData, AxiosError<ApiEnvelope>, Vars>({
    mutationFn: async ({ provider }) => {
      const res = await getSocialAuthLoginUrl(provider);
      return res as SocialAuthLoginUrlData;
    },
    ...options,
  });
}
