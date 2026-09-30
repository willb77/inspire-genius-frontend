/**
 * Centralized React Query keys for the Team Development Studio.
 * Keeps invalidation consistent across hooks (any plan mutation invalidates
 * the member's dossier + downstream reads).
 */
export const developmentKeys = {
  all: ["development"] as const,
  roster: () => [...developmentKeys.all, "roster"] as const,
  /** The whole org's reporting tree — not per-member. */
  orgChart: () => [...developmentKeys.all, "org-chart"] as const,
  dossier: (memberId: string) => [...developmentKeys.all, "dossier", memberId] as const,
  /** Every PRISM scale on file — distinct from the dossier's 8-behaviour radar. */
  fullPrism: (memberId: string) =>
    [...developmentKeys.all, "full-prism", memberId] as const,
  goals: (memberId: string) => [...developmentKeys.all, "goals", memberId] as const,
  /** Coach reviews of the member's shared goals (Goals offering, Phase 4). */
  goalReviews: (memberId: string) =>
    [...developmentKeys.all, "goal-reviews", memberId] as const,
  /** This manager's coaching notes for one member. Per-manager, not shared. */
  notes: (memberId: string) => [...developmentKeys.all, "notes", memberId] as const,
  /**
   * This manager's saved Team Studio analyses for one member (TDS-3).
   *
   * Keyed on the MEMBER and nothing else — D-TDS3, "analyses follow the
   * member" — which is also what `notes` above does for the same reason. The
   * server scopes the read to the caller's signed sub, so the key does not
   * need to and cannot reliably state the manager.
   *
   * Caveat, shared with `notes` and `chat` and not introduced here: nothing
   * clears the QueryClient on logout (`AuthContext.logout` navigates, it does
   * not reload), so a second manager signing in to the SAME tab can be served
   * the first one's cached list until the refetch lands. The fix is one line in
   * AuthContext and belongs with all three reads at once, not inside this
   * package.
   */
  analyses: (memberId: string) => [...developmentKeys.all, "analyses", memberId] as const,
  /**
   * Prefix over EVERY target-blueprint variant of one member's gaps.
   *
   * Closing a gap has to reach all of them: `gaps()` appends the target id, so
   * invalidating `gaps(memberId)` matches only the `"default"` variant and a
   * manager who had a target selected would keep seeing the closed gap as open.
   */
  gapsFor: (memberId: string) => [...developmentKeys.all, "gaps", memberId] as const,
  gaps: (memberId: string, targetBlueprintId?: string) =>
    [...developmentKeys.gapsFor(memberId), targetBlueprintId ?? "default"] as const,
  milestones: (memberId: string) =>
    [...developmentKeys.all, "milestones", memberId] as const,
  matches: (memberId: string, kind: "internal" | "external") =>
    [...developmentKeys.all, "matches", memberId, kind] as const,
  chat: (memberId: string) => [...developmentKeys.all, "chat", memberId] as const,
}
