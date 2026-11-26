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
  confirmImportAssessment,
  createAssessment,
  createFact,
  deleteFact,
  getLoadedFrameworks,
  getMyProfile,
  getTrend,
  importAssessment,
  listAssessments,
  previewImportAssessment,
  removeAssessment,
  listPendingImports,
  acceptPendingImport,
} from "@/services/profile/profile";
import type {
  Assessment,
  AssessmentCreated,
  AssessmentHistoryItem,
  AssessmentHistoryResponse,
  AssessmentImportConfirm,
  AssessmentImportPreview,
  CreateAssessmentRequest,
  CreateFactRequest,
  LoadedFramework,
  PendingImport,
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
  pending: () => [...profileKeys.root, "pending"] as const,
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

/**
 * Confirm-before-save step 1 — parse a report and return the scores WITHOUT
 * saving. No cache invalidation (nothing changed).
 */
export function usePreviewImportAssessment(
  options?: UseMutationOptions<
    AssessmentImportPreview,
    unknown,
    { framework: string; file: File }
  >,
) {
  return useMutation<
    AssessmentImportPreview,
    unknown,
    { framework: string; file: File }
  >({
    mutationFn: ({ framework, file }) => previewImportAssessment(framework, file),
    ...options,
  });
}

/** Confirm-before-save step 2 — save the reviewed scores. */
export function useConfirmImportAssessment(
  options?: UseMutationOptions<AssessmentCreated, unknown, AssessmentImportConfirm>,
) {
  const qc = useQueryClient();
  return useMutation<AssessmentCreated, unknown, AssessmentImportConfirm>({
    mutationFn: confirmImportAssessment,
    ...options,
    onSuccess: (data, vars, ctx) => {
      qc.invalidateQueries({ queryKey: profileKeys.loadedFrameworks() });
      qc.invalidateQueries({ queryKey: profileKeys.me() });
      // F-W7-1: Settings counts the older entries per framework from history.
      qc.invalidateQueries({ queryKey: [...profileKeys.root, "history"] });
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

/**
 * Remove one of your own results (TDS F-W7-1 Part B). Refreshes the snapshot,
 * the history and the loaded-frameworks chip on success AND on failure: a
 * 409 means it was already removed elsewhere, and the card must catch up.
 */
export function useRemoveAssessment(
  options?: UseMutationOptions<AssessmentHistoryItem, unknown, string>,
) {
  const qc = useQueryClient();
  const refresh = () => {
    qc.invalidateQueries({ queryKey: profileKeys.me() });
    qc.invalidateQueries({ queryKey: [...profileKeys.root, "history"] });
    qc.invalidateQueries({ queryKey: profileKeys.loadedFrameworks() });
  };
  return useMutation<AssessmentHistoryItem, unknown, string>({
    mutationFn: removeAssessment,
    ...options,
    onSuccess: (data, vars, ctx) => {
      refresh();
      options?.onSuccess?.(data, vars, ctx);
    },
    onError: (err, vars, ctx) => {
      refresh();
      options?.onError?.(err, vars, ctx);
    },
  });
}

// ── TDS A4: results a practitioner sent, waiting for the person ──

/** Results a practitioner sent that the person has not accepted or declined. */
export function usePendingImports() {
  return useQuery<PendingImport[]>({
    queryKey: profileKeys.pending(),
    queryFn: listPendingImports,
    staleTime: 30_000,
  });
}

/**
 * Accept and decline both change what counts, so both refresh the snapshot,
 * the history, the chips and the waiting list, on success AND on failure: a
 * 409 means another tab already answered, and the card must catch up.
 */
function usePendingAnswer(
  mutationFn: (id: string) => Promise<AssessmentHistoryItem>,
  options?: UseMutationOptions<AssessmentHistoryItem, unknown, string>,
) {
  const qc = useQueryClient();
  const refresh = () => {
    qc.invalidateQueries({ queryKey: profileKeys.pending() });
    qc.invalidateQueries({ queryKey: profileKeys.me() });
    qc.invalidateQueries({ queryKey: [...profileKeys.root, "history"] });
    qc.invalidateQueries({ queryKey: profileKeys.loadedFrameworks() });
  };
  return useMutation<AssessmentHistoryItem, unknown, string>({
    mutationFn,
    ...options,
    onSuccess: (data, vars, ctx) => {
      refresh();
      options?.onSuccess?.(data, vars, ctx);
    },
    onError: (err, vars, ctx) => {
      refresh();
      options?.onError?.(err, vars, ctx);
    },
  });
}

/** Accept a result a practitioner sent: it becomes the person's current one. */
export function useAcceptPendingImport(
  options?: UseMutationOptions<AssessmentHistoryItem, unknown, string>,
) {
  return usePendingAnswer(acceptPendingImport, options);
}

/** Decline it: the owner remove (DELETE), which the server allows on a held import. */
export function useDeclinePendingImport(
  options?: UseMutationOptions<AssessmentHistoryItem, unknown, string>,
) {
  return usePendingAnswer(removeAssessment, options);
}
