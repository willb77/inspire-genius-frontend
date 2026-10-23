import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  approveSnapshot,
  createShare,
  createSnapshot,
  downloadShared,
  downloadSnapshot,
  getCareerPathwaysStatus,
  getDraft,
  listRecipients,
  listShares,
  listSnapshots,
  openShared,
  requestCode,
  revokeShare,
} from "@/services/career-pathways/careerPathways.service"
import type {
  CareerPathwaysStatus,
  Draft,
  FileFormat,
  OpenedProfile,
  RecipientList,
  Share,
  ShareRequest,
  Snapshot,
  SnapshotRequest,
} from "@/types/careerPathways"

export const careerPathwaysKeys = {
  status: ["career-pathways", "status"] as const,
  draft: ["career-pathways", "draft"] as const,
  snapshots: ["career-pathways", "snapshots"] as const,
  recipients: ["career-pathways", "recipients"] as const,
  shares: ["career-pathways", "shares"] as const,
}

/** `enabled` is true only when the server says so; loading and errors read off. */
export function useCareerPathwaysStatus() {
  const q = useQuery<CareerPathwaysStatus, Error>({
    queryKey: careerPathwaysKeys.status,
    queryFn: getCareerPathwaysStatus,
    staleTime: 5 * 60_000,
    retry: false,
  })
  return {
    enabled: q.data?.enabled === true,
    externalSharing: q.data?.externalSharing === true,
    isLoading: q.isLoading,
  }
}

export function useCareerPathwaysDraft(enabled: boolean) {
  return useQuery<Draft, Error>({
    queryKey: careerPathwaysKeys.draft,
    queryFn: getDraft,
    enabled,
    retry: false,
  })
}

export function useCareerPathwaysSnapshots(enabled: boolean) {
  return useQuery<Snapshot[], Error>({
    queryKey: careerPathwaysKeys.snapshots,
    queryFn: listSnapshots,
    enabled,
    retry: false,
  })
}

export function useCareerPathwaysRecipients(enabled: boolean) {
  return useQuery<RecipientList, Error>({
    queryKey: careerPathwaysKeys.recipients,
    queryFn: listRecipients,
    enabled,
    retry: false,
  })
}

export function useCareerPathwaysShares(enabled: boolean) {
  return useQuery<Share[], Error>({
    queryKey: careerPathwaysKeys.shares,
    queryFn: listShares,
    enabled,
    retry: false,
  })
}

export function useCreateSnapshot() {
  const qc = useQueryClient()
  return useMutation<Snapshot, Error, SnapshotRequest>({
    mutationFn: createSnapshot,
    onSuccess: () => void qc.invalidateQueries({ queryKey: careerPathwaysKeys.snapshots }),
  })
}

export function useApproveSnapshot() {
  const qc = useQueryClient()
  return useMutation<Snapshot, Error, string>({
    mutationFn: approveSnapshot,
    onSuccess: () => void qc.invalidateQueries({ queryKey: careerPathwaysKeys.snapshots }),
  })
}

export function useDownloadSnapshot() {
  return useMutation<{ downloadUrl: string }, Error, { id: string; format: FileFormat }>({
    mutationFn: ({ id, format }) => downloadSnapshot(id, format),
  })
}

export function useCreateShare() {
  const qc = useQueryClient()
  return useMutation<Share, Error, ShareRequest>({
    mutationFn: createShare,
    onSuccess: () => void qc.invalidateQueries({ queryKey: careerPathwaysKeys.shares }),
  })
}

export function useRevokeShare() {
  const qc = useQueryClient()
  return useMutation<Share, Error, string>({
    mutationFn: revokeShare,
    onSuccess: () => void qc.invalidateQueries({ queryKey: careerPathwaysKeys.shares }),
  })
}

// ── the recipient ───────────────────────────────────────────────────────────

export function useRequestCode() {
  return useMutation<void, Error, string>({ mutationFn: requestCode })
}

export function useOpenShared() {
  return useMutation<OpenedProfile, Error, { token: string; code: string }>({
    mutationFn: ({ token, code }) => openShared(token, code),
  })
}

export function useDownloadShared() {
  return useMutation<Blob, Error, { token: string; viewKey: string; format: FileFormat }>({
    mutationFn: ({ token, viewKey, format }) => downloadShared(token, viewKey, format),
  })
}
