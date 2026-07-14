/**
 * React Query hooks wrapping the profile service (`src/services/profile/profile.ts`).
 *
 * Cache keys are namespaced under `["profile", ...]` so the invalidation
 * helpers can wipe the whole tree without touching unrelated agent-engine
 * caches.
 */

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationOptions,
  type UseQueryOptions,
} from "@tanstack/react-query";

import {
  createAssessment,
  createFact,
  deleteFact,
  getLoadedFrameworks,
  getMyProfile,
  getTrend,
  importAssessment,
  listAssessments,
} from "@/services/profile/profile";
import type {
  Assessment,
  AssessmentCreated,
  AssessmentHistoryResponse,
  CreateAssessmentRequest,
  CreateFactRequest,
  LoadedFramework,
  ProfileFact,
  ProfileMe,
  TrendResponse,
} from "@/types/profile/profile-types";

export const profileKeys = {
  root: ["profile"] as const,
  me: () => [...profileKeys.root, "me"] as const,
  history: (framework?: string, limit?: number, offset?: number) =>
    [...profileKeys.root, "history", framework ?? null, limit ?? 20, offset ?? 0] as const,
  trend: (framework: string, dimension: string) =>
    [...profileKeys.root, "trend", framework, dimension] as const,
  loadedFrameworks: () => [...profileKeys.root, "loaded-frameworks"] as const,
};

/** Full profile snapshot — short staleTime keeps facts fresh while typing. */
export function useMyProfile(options?: Omit<UseQueryOptions<ProfileMe>, "queryKey" | "queryFn">) {
  return useQuery<ProfileMe>({
    queryKey: profileKeys.me(),
    queryFn: getMyProfile,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
    ...options,
  });
}

/** Paginated assessment history; optional framework filter. */
export function useAssessmentHistory(
  framework?: string,
  page: { limit?: number; offset?: number } = {},
) {
  const { limit = 20, offset = 0 } = page;
  return useQuery<AssessmentHistoryResponse>({
    queryKey: profileKeys.history(framework, limit, offset),
    queryFn: () => listAssessments({ framework, limit, offset }),
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });
}

/** Trend points for a single (framework, dimension). Gated on both args. */
export function useAssessmentTrend(framework?: string, dimension?: string) {
  return useQuery<TrendResponse>({
    queryKey: profileKeys.trend(framework ?? "", dimension ?? ""),
    queryFn: () => getTrend({ framework: framework!, dimension: dimension! }),
    enabled: !!framework && !!dimension,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
}

/** Cheap framework-loaded list — drives the ProfileLoadedIndicator chip. */
export function useLoadedFrameworks() {
  return useQuery<LoadedFramework[]>({
    queryKey: profileKeys.loadedFrameworks(),
    queryFn: getLoadedFrameworks,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    // When the flag is OFF or the route 404s, treat the list as empty so the
    // indicator quietly hides instead of bubbling up an error to the chat UI.
    retry: 1,
  });
}

/** Append a fact — invalidates the profile snapshot only. */
export function useCreateFact(
  options?: UseMutationOptions<ProfileFact, unknown, CreateFactRequest>,
) {
  const qc = useQueryClient();
  return useMutation<ProfileFact, unknown, CreateFactRequest>({
    mutationFn: createFact,
    ...options,
    onSuccess: (data, vars, ctx) => {
      qc.invalidateQueries({ queryKey: profileKeys.me() });
      options?.onSuccess?.(data, vars, ctx);
    },
  });
}

/**
 * Import an assessment report FILE (multipart) → server adapter parse → store.
 * On success, refresh the loaded-frameworks list so the HomeV2 completeness
 * indicator flips the item to "done".
 */
export function useImportAssessment(
  options?: UseMutationOptions<
    AssessmentCreated,
    unknown,
    { framework: string; file: File }
  >,
) {
  const qc = useQueryClient();
  return useMutation<AssessmentCreated, unknown, { framework: string; file: File }>({
    mutationFn: ({ framework, file }) => importAssessment(framework, file),
    ...options,
    onSuccess: (data, vars, ctx) => {
      qc.invalidateQueries({ queryKey: profileKeys.loadedFrameworks() });
      qc.invalidateQueries({ queryKey: profileKeys.me() });
      options?.onSuccess?.(data, vars, ctx);
    },
  });
}

/** Soft-delete a fact — same invalidation surface as create. */
export function useDeleteFact(
  options?: UseMutationOptions<void, unknown, string>,
) {
  const qc = useQueryClient();
  return useMutation<void, unknown, string>({
    mutationFn: deleteFact,
    ...options,
    onSuccess: (data, vars, ctx) => {
      qc.invalidateQueries({ queryKey: profileKeys.me() });
      options?.onSuccess?.(data, vars, ctx);
    },
  });
}

/**
 * Add a prior assessment — invalidates the snapshot, history list, and the
 * loaded-frameworks chip so a fresh DISC entry surfaces in chat immediately.
 */
export function useCreateAssessment(
  options?: UseMutationOptions<Assessment, unknown, CreateAssessmentRequest>,
) {
  const qc = useQueryClient();
  return useMutation<Assessment, unknown, CreateAssessmentRequest>({
    mutationFn: createAssessment,
    ...options,
    onSuccess: (data, vars, ctx) => {
      qc.invalidateQueries({ queryKey: profileKeys.me() });
      qc.invalidateQueries({ queryKey: [...profileKeys.root, "history"] });
      qc.invalidateQueries({ queryKey: profileKeys.loadedFrameworks() });
      options?.onSuccess?.(data, vars, ctx);
    },
  });
}
