import { api } from '@/lib/axios'

export type IssueType = { id: string; name: string }
export type GetIssueTypesResponse = {
  message?: string
  status?: boolean
  data?: IssueType[]
}

export async function getIssueTypes() {
  const { data } = await api.get<GetIssueTypesResponse>('/v1/issues/types')
  return data
}

export type IssuePriority = 'low' | 'medium' | 'high' | 'critical'

export type CreateIssueResponse = {
  message?: string
  status?: boolean
  data?: unknown
}

export async function createIssue(form: FormData) {
  const { data } = await api.post<CreateIssueResponse>('/v1/issues/', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data
}

export type IssueAdminComment = {
  id: string
  comment: string
  commented_by: string
  created_at: string
}

export type IssueListItem = {
  id: string
  subject: string
  description: string
  status: string
  priority: IssuePriority
  issue_type_id: string | null
  issue_type_name: string | null
  reported_by: string
  reported_by_name: string
  created_at: string
  // Optional extended fields from API
  updated_at?: string
  agent_id?: string | null
  organization_id?: string | null
  business_id?: string | null
  resolved_at?: string | null
  is_open?: boolean
  is_resolved?: boolean
  age_in_days?: number
  admin_comment?: IssueAdminComment | null
}

export type GetIssuesResponse = {
  message?: string
  status?: boolean
  data?: {
    items: IssueListItem[]
    page: number
    page_size: number
    total: number
  }
}

export async function getIssues(params: { page: number; page_size: number }) {
  const { data } = await api.get<GetIssuesResponse>('/v1/issues/', { params })
  return data
}
