import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  cancelWebinar,
  createWebinar,
  downloadReportCsv,
  downloadSessionCsv,
  getIntakeReport,
  getRegistration,
  getSessionList,
  listAllRegistrations,
  listRegistrations,
  listWebinars,
  markAttendance,
  updateWebinar,
} from "@/services/super-admin/intake/intake.service"
import type { RegistrationFilters, ReportFilters } from "@/types/intake"

const KEY = ["intake"] as const

/** One page of registrations. Keeps the previous page on screen while the next loads. */
export function useIntakeRegistrations(filters: RegistrationFilters, limit: number, offset: number) {
  return useQuery({
    queryKey: [...KEY, "registrations", filters, limit, offset],
    queryFn: () => listRegistrations(filters, limit, offset),
    placeholderData: keepPreviousData,
  })
}

/** One registrant with consents and webinar choices; idle until an id is chosen. */
export function useIntakeRegistration(id: string | null) {
  return useQuery({
    queryKey: [...KEY, "registration", id],
    queryFn: () => getRegistration(id as string),
    enabled: !!id,
  })
}

export function useIntakeWebinars() {
  return useQuery({ queryKey: [...KEY, "webinars"], queryFn: listWebinars })
}

/** A session's list; idle until a session is opened. */
export function useSessionList(webinarId: string | null) {
  return useQuery({
    queryKey: [...KEY, "session-list", webinarId],
    queryFn: () => getSessionList(webinarId as string),
    enabled: !!webinarId,
  })
}

function useInvalidatingMutation<TIn, TOut>(fn: (input: TIn) => Promise<TOut>) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: fn,
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}

export function useCreateWebinar() {
  return useInvalidatingMutation(createWebinar)
}

export function useUpdateWebinar() {
  return useInvalidatingMutation(updateWebinar)
}

export function useCancelWebinar() {
  return useInvalidatingMutation(cancelWebinar)
}

export function useMarkAttendance() {
  return useInvalidatingMutation(markAttendance)
}

/** Every registration matching the filters, for the CSV export. Reads only. */
export function useExportRegistrations() {
  return useMutation({ mutationFn: (filters: RegistrationFilters) => listAllRegistrations(filters) })
}

/** The server's CSV of one session's list. Reads only. */
export function useDownloadSessionCsv() {
  return useMutation({ mutationFn: (webinarId: string) => downloadSessionCsv(webinarId) })
}

/** IN-7 — every report block for the filters. Keeps the last report on screen while a new filter loads. */
export function useIntakeReport(filters: ReportFilters) {
  return useQuery({
    queryKey: [...KEY, "report", filters],
    queryFn: () => getIntakeReport(filters),
    placeholderData: keepPreviousData,
  })
}

/** The server's CSV of one report block. Reads only. */
export function useDownloadReportCsv() {
  return useMutation({ mutationFn: downloadReportCsv })
}
