/**
 * React Query hooks for the Broadcast Alert composer (super-admin).
 * Mirrors the Service → Hook → Component pattern.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type { AxiosError } from "axios"

import {
  addBroadcastAdmin,
  getBroadcastAccess,
  listBroadcastAdmins,
  listBroadcasts,
  previewAudience,
  removeBroadcastAdmin,
  sendBroadcast,
} from "@/services/super-admin/broadcast.service"
import { useAuth } from "@/context/useAuth"
import type { AudienceSpec, BroadcastCreatePayload } from "@/types/broadcast"

const ACCESS_KEY = ["broadcast", "access"]
const ADMINS_KEY = ["broadcast", "admins"]
const HISTORY_KEY = ["broadcast", "history"]

/**
 * Whether the current user may use the broadcast tool. Only queries when the
 * user is a super-admin (avoids a needless 200/false for every other role).
 */
export function useBroadcastAccess() {
  const { user } = useAuth()
  const isSuperAdmin = user?.role === "super-admin"
  return useQuery({
    queryKey: ACCESS_KEY,
    queryFn: getBroadcastAccess,
    enabled: isSuperAdmin,
    staleTime: 5 * 60 * 1000,
  })
}

export function useBroadcastAdmins(enabled: boolean) {
  return useQuery({
    queryKey: ADMINS_KEY,
    queryFn: listBroadcastAdmins,
    enabled,
    staleTime: 60 * 1000,
  })
}

export function useAddBroadcastAdmin() {
  const qc = useQueryClient()
  return useMutation<Awaited<ReturnType<typeof addBroadcastAdmin>>, AxiosError, string>({
    mutationFn: (email: string) => addBroadcastAdmin(email),
    onSuccess: (admins) => qc.setQueryData(ADMINS_KEY, admins),
  })
}

export function useRemoveBroadcastAdmin() {
  const qc = useQueryClient()
  return useMutation<Awaited<ReturnType<typeof removeBroadcastAdmin>>, AxiosError, string>({
    mutationFn: (email: string) => removeBroadcastAdmin(email),
    onSuccess: (admins) => qc.setQueryData(ADMINS_KEY, admins),
  })
}

export function usePreviewAudience() {
  return useMutation<Awaited<ReturnType<typeof previewAudience>>, AxiosError, AudienceSpec>({
    mutationFn: (audience: AudienceSpec) => previewAudience(audience),
  })
}

export function useSendBroadcast() {
  const qc = useQueryClient()
  return useMutation<Awaited<ReturnType<typeof sendBroadcast>>, AxiosError, BroadcastCreatePayload>({
    mutationFn: (payload: BroadcastCreatePayload) => sendBroadcast(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: HISTORY_KEY }),
  })
}

export function useBroadcastHistory(enabled: boolean) {
  return useQuery({
    queryKey: HISTORY_KEY,
    queryFn: () => listBroadcasts(50),
    enabled,
    staleTime: 30 * 1000,
  })
}
