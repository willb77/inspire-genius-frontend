/**
 * Centralized React Query keys for the Team Development Studio.
 * Keeps invalidation consistent across hooks (any plan mutation invalidates
 * the member's dossier + downstream reads).
 */
export const developmentKeys = {
  all: ["development"] as const,
  roster: () => [...developmentKeys.all, "roster"] as const,
  dossier: (memberId: string) => [...developmentKeys.all, "dossier", memberId] as const,
  /** Every PRISM scale on file — distinct from the dossier's 8-behaviour radar. */
  fullPrism: (memberId: string) =>
    [...developmentKeys.all, "full-prism", memberId] as const,
  goals: (memberId: string) => [...developmentKeys.all, "goals", memberId] as const,
  /** Coach reviews of the member's shared goals (Goals offering, Phase 4). */
  goalReviews: (memberId: string) =>
    [...developmentKeys.all, "goal-reviews", memberId] as const,
  gaps: (memberId: string, targetBlueprintId?: string) =>
    [...developmentKeys.all, "gaps", memberId, targetBlueprintId ?? "default"] as const,
  milestones: (memberId: string) =>
    [...developmentKeys.all, "milestones", memberId] as const,
  matches: (memberId: string, kind: "internal" | "external") =>
    [...developmentKeys.all, "matches", memberId, kind] as const,
  chat: (memberId: string) => [...developmentKeys.all, "chat", memberId] as const,
}
