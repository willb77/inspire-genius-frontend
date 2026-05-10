/** M.4 — React Query hooks for the /v1/memory/* tier-aware privacy endpoints. */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type { AxiosError } from "axios"

import {
  deleteMyInsight,
  deleteMyMemory,
  deleteUserInsight,
  deleteUserMemory,
  downloadBlob,
  exportMyMemory,
  exportUserMemory,
  getMyMemory,
  getUserMemory,
} from "@/services/privacy/memory.service"
import type { MemoryDeleteResponse, MemorySnapshot } from "@/types/memory"

// ─── Self-service ───────────────────────────────────────────────

export function useMyMemory() {
  return useQuery<MemorySnapshot, AxiosError>({
    queryKey: ["memory", "me"],
    queryFn: getMyMemory,
    staleTime: 30_000,
  })
}

export function useExportMyMemory() {
  return useMutation<void, AxiosError, void>({
    mutationFn: async () => {
      const blob = await exportMyMemory()
      downloadBlob(blob, "inspire-genius-memory.json")
    },
  })
}

export function useDeleteMyMemory() {
  const qc = useQueryClient()
  return useMutation<MemoryDeleteResponse, AxiosError, void>({
    mutationFn: deleteMyMemory,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["memory", "me"] })
    },
  })
}

export function useDeleteMyInsight() {
  const qc = useQueryClient()
  return useMutation<MemoryDeleteResponse, AxiosError, string>({
    mutationFn: (key) => deleteMyInsight(key),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["memory", "me"] })
    },
  })
}

// ─── Super-admin ────────────────────────────────────────────────

export function useUserMemory(userId: string | undefined) {
  return useQuery<MemorySnapshot, AxiosError>({
    queryKey: ["memory", "users", userId],
    queryFn: () => getUserMemory(userId as string),
    enabled: !!userId,
    staleTime: 30_000,
  })
}

export function useExportUserMemory() {
  return useMutation<void, AxiosError, string>({
    mutationFn: async (userId) => {
      const blob = await exportUserMemory(userId)
      downloadBlob(blob, `inspire-genius-memory-${userId}.json`)
    },
  })
}

export function useDeleteUserMemory() {
  const qc = useQueryClient()
  return useMutation<MemoryDeleteResponse, AxiosError, string>({
    mutationFn: deleteUserMemory,
    onSuccess: (_data, userId) => {
      qc.invalidateQueries({ queryKey: ["memory", "users", userId] })
    },
  })
}

export function useDeleteUserInsight() {
  const qc = useQueryClient()
  return useMutation<
    MemoryDeleteResponse,
    AxiosError,
    { userId: string; key: string }
  >({
    mutationFn: ({ userId, key }) => deleteUserInsight(userId, key),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["memory", "users", vars.userId] })
    },
  })
}
