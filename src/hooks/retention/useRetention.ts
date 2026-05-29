/**
 * React Query hooks for memory-retention policies.
 *
 * Used by the Retention card shown in super-admin, manager, and
 * company-admin Settings pages.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  deleteRetentionPolicy,
  listRetentionPolicies,
  upsertRetentionPolicy,
  type RetentionPolicy,
  type RetentionScope,
  type RetentionTier,
  type RetentionUpsertPayload,
} from "@/services/retention/retentionService";

const POLICIES_KEY = ["retention", "policies"] as const;

export function useRetentionPolicies(params?: {
  scope?: RetentionScope;
  memory_tier?: RetentionTier;
}) {
  return useQuery({
    queryKey: [...POLICIES_KEY, params ?? {}],
    queryFn: () => listRetentionPolicies(params),
    select: (resp): RetentionPolicy[] => resp?.data?.policies ?? [],
    staleTime: 30_000,
  });
}

export function useUpsertRetentionPolicy() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: RetentionUpsertPayload) =>
      upsertRetentionPolicy(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: POLICIES_KEY });
    },
  });
}

export function useDeleteRetentionPolicy() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (policyId: string) => deleteRetentionPolicy(policyId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: POLICIES_KEY });
    },
  });
}
