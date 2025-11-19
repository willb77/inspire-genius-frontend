import { api } from "@/lib/axios"
import type { BaseApiResponse } from "@/types/api"

// Issue Data Type
export type IssueData = {
  id: string
  subject: string
  description: string
  status: string
  priority: string
  issue_type_id: string
  issue_type_name: string
  reported_by: string
  reported_by_name: string
  agent_id: string | null
  organization_id: string | null
  business_id: string | null
  resolved_at: string | null
  is_open: boolean
  is_resolved: boolean
  age_in_days: number
  created_at: string
  updated_at: string
  comments: any[]
  attachments: any[]
}

// Admin Comment Request Type
export type AddAdminCommentRequest = {
  comment: string
  change_status?: string
}

// Admin Comment Response Type
export type AddAdminCommentResponse = BaseApiResponse<{
  comment_id: string
}>

// API Response Type for issue
export type GetIssueResponse = BaseApiResponse<IssueData>

export async function getIssueById(issue_id: string) {
  const { data } = await api.get<GetIssueResponse>(
    `/v1/issues/${encodeURIComponent(issue_id)}`
  )
  return data
}

export async function addAdminComment(
  issue_id: string,
  payload: AddAdminCommentRequest
) {
  const { data } = await api.post<AddAdminCommentResponse>(
    `/v1/issues/${encodeURIComponent(issue_id)}/admin-comment`,
    payload
  )
  return data
}