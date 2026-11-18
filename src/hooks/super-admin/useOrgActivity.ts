import { useMutation, useQuery } from "@tanstack/react-query"
import type { AxiosError } from "axios"

import {
  downloadOrgActivityDocx,
  getOrgActivityOrgs,
  getOrgActivityReport,
} from "@/services/super-admin/orgActivity.service"
import type {
  OrgActivityDocx,
  OrgActivityOrg,
  OrgActivityReport,
} from "@/types/super-admin/orgActivity"

export type OrgActivityRun = { orgId: string; includeInternal: boolean }

/** `retry: false`: a 403 means the caller is not super-admin and never will be. */
export function useOrgActivityOrgs() {
  return useQuery<OrgActivityOrg[], AxiosError>({
    queryKey: ["super-admin", "org-activity", "orgs"],
    queryFn: getOrgActivityOrgs,
    retry: false,
    staleTime: 5 * 60_000,
  })
}

/** Explicit Run button, not a query: a report is something you ask for. */
export function useRunOrgActivityReport() {
  return useMutation<OrgActivityReport, AxiosError, OrgActivityRun>({
    mutationFn: ({ orgId, includeInternal }) => getOrgActivityReport(orgId, includeInternal),
  })
}

export function useDownloadOrgActivityDocx() {
  return useMutation<OrgActivityDocx, AxiosError, OrgActivityRun>({
    mutationFn: ({ orgId, includeInternal }) => downloadOrgActivityDocx(orgId, includeInternal),
  })
}
