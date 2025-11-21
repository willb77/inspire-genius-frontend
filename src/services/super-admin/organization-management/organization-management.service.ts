import { api } from "@/lib/axios";
import type { BaseApiResponse } from "@/types/api";

// Organization Item
export type OrganizationItem = {
  id: string;
  name: string;
  contact?: string;
  email?: string;
  address?: string;
  website_url?: string;
  status: boolean;
  created_at?: string;
  type?: string;
  admin_name?: string;
  admin_email: string;
  admin_is_active?: boolean;
};

// GET /v1/organizations
export type GetOrganizationsResponse = BaseApiResponse<{
  organizations: OrganizationItem[];
  total: number;
  page: number;
  limit: number;
}>;

// POST /v1/organizations — Create Organization Response
export type CreateOrganizationResponse = BaseApiResponse<{
  organization_id: string;
  logo_uploaded: boolean;
}>;

// Role Item
export type RoleItem = {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
};

export type GetRolesResponse = BaseApiResponse<{
  roles: RoleItem[];
}>;

export type AssignItem = {
  agent_id: string;
  tone_ids: string[];
  accent_id: string;
  gender_id: string;
};

export type AssignCoachRequest = {
  preferences: AssignItem[];
};

export type AssignCoachResponse = BaseApiResponse<{
  organization_id: string;
  assigned_agents: string[];
  failed_agents: string[];
  assigned_by: string;
}>;

export type CreateLicenseRequest = {
  organization_id: string;
  subscription_tier: string;
  start_date: string;
  end_date: string;
};

export type CreateLicenseResponse = BaseApiResponse<{
  license_id: string;
}>;

export type DeactivateOrganizationResponse = BaseApiResponse<{}>;

export type OrganizationViewItem = {
  id: string;
  name: string;
  contact: string;
  email: string;
  address: string;
  website_url: string;
  logo: string | null;
  logo_url: string | null;
  status: boolean;
  created_at: string;
  updated_at: string;
  admin_name: string;
  admin_email: string;
  admin_is_active: boolean;
  total_chat: number;
  avg_online: number;
  type?: string;
  is_onboarded?: boolean;
};

export type CoachTraits = {
  gender: string;
  accent: string;
  tones: string[];
};

export type CoachItem = {
  id: string;
  name: string;
  organization_id: string;
  assigned_by: string;
  is_active: boolean;
  traits: CoachTraits;
  created_at: string;
  updated_at: string;
};

export type LicenseItem = {
  id: string;
  subscription_tier: string;
  status: string;
  start_date: string;
  end_date: string;
  days_remaining: number;
  is_active: boolean;
};

export type AssignedCoach = {
  business_assignment_id: string;
  agent_id: string;
  agent_name: string;
  is_active: boolean;
};

export type BusinessItem = {
  id: string;
  name: string;
  description: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  business_type: string;
  is_onboarded: boolean;
  is_active: boolean;
  created_at: string;
  admin_name: string;
  admin_email: string;
  admin_is_active: boolean | null;
  assigned_coaches?: AssignedCoach[];
};

export type OrganizationDetail = OrganizationViewItem & {
  businesses: BusinessItem[];
  licenses: LicenseItem[];
  coaches: CoachItem[];
};

export type GetOrganizationViewResponse = BaseApiResponse<OrganizationDetail>;

export type AssignCoachesToBusinessRequest = {
  agent_ids: string[];
};

export type AssignCoachesToBusinessResponse = BaseApiResponse<{
  business_id: string;
  assigned_agents: string[];
  failed_agents: string[];
  total_assigned: number;
}>;

// NEW: Organization Agents Types
export type AgentPreferences = {
  accent: {
    id: string;
    name: string;
  };
  gender: {
    id: string;
    name: string;
  };
  tones: Array<{
    id: string;
    name: string;
  }>;
};

export type OrganizationAgent = {
  id: string;
  agent_id: string;
  agent_name: string;
  organization_id: string;
  assigned_by: string;
  is_active: boolean;
  preferences: AgentPreferences;
  created_at: string;
  updated_at: string;
  is_assigned_to_business?: boolean;
};

export type GetOrganizationAgentsResponse = BaseApiResponse<{
  organization_id: string;
  organization_name: string;
  agents: OrganizationAgent[];
  total_agents: number;
  business_id?: string;
}>;

export type BusinessAgentTone = { id: string; name: string };
export type BusinessAgentAccent = { accent_id: string; name: string };
export type BusinessAgentGender = { gender_id: string; name: string };

export type RemoveAgentsRequest = {
  agent_ids: string[];
};

export type RemoveOrganizationAgentsData = {
  organization_id: string;
  removed_agents: string[];
  failed_agents: string[];
  removed_by: string;
};

export type RemoveBusinessAgentsData = {
  business_id: string;
  removed_agents: string[];
  failed_agents: string[];
};

export type RemoveOrganizationAgentsResponse =
  BaseApiResponse<RemoveOrganizationAgentsData>;
export type RemoveBusinessAgentsResponse =
  BaseApiResponse<RemoveBusinessAgentsData>;

export async function getOrganizations(params?: {
  page?: number;
  limit?: number;
}) {
  const { data } = await api.get<GetOrganizationsResponse>(
    "/v1/organizations/",
    { params }
  );
  return data;
}

export async function getRoles() {
  const { data } = await api.get<GetRolesResponse>("/v1/rbac/roles");
  return data;
}

export async function createOrganization(formData: FormData) {
  const { data } = await api.post<CreateOrganizationResponse>(
    "/v1/organizations/",
    formData
  );
  return data;
}

export async function assignCoachesToOrganization(
  orgId: string,
  payload: AssignCoachRequest
) {
  const { data } = await api.post<AssignCoachResponse>(
    `/v1/organizations/${orgId}/agents/assign`,
    payload
  );
  return data;
}

export async function assignCoachesToBusiness(
  orgId: string,
  businessId: string,
  payload: AssignCoachesToBusinessRequest
) {
  const { data } = await api.post<AssignCoachesToBusinessResponse>(
    `/v1/organizations/${orgId}/businesses/${businessId}/agents/assign`,
    payload
  );
  return data;
}

export async function createLicense(payload: CreateLicenseRequest) {
  const { data } = await api.post<CreateLicenseResponse>(
    "/v1/licenses/",
    payload
  );
  return data;
}

export async function getOrganizationViewDetail(orgId: string) {
  const { data } = await api.get<GetOrganizationViewResponse>(
    `/v1/organizations/${orgId}`
  );
  return data;
}

export async function deactivateOrganization(orgId: string) {
  const { data } = await api.delete<DeactivateOrganizationResponse>(
    `/v1/organizations/${orgId}`
  );
  return data;
}

export async function getOrganizationAgents(
  orgId: string,
  businessId?: string
) {
  const params = businessId ? { business_id: businessId } : undefined;
  const { data } = await api.get<GetOrganizationAgentsResponse>(
    `/v1/organizations/${orgId}/agents`,
    { params }
  );
  return data;
}

export async function removeCoachesFromOrganization(
  orgId: string,
  payload: RemoveAgentsRequest
) {
  const { data } = await api.delete<RemoveOrganizationAgentsResponse>(
    `/v1/organizations/${orgId}/agents/delete`,
    {
      data: payload,
    }
  );
  return data;
}

export async function removeCoachesFromBusiness(
  orgId: string,
  businessId: string,
  payload: RemoveAgentsRequest
) {
  const { data } = await api.delete<RemoveBusinessAgentsResponse>(
    `/v1/organizations/${orgId}/businesses/${businessId}/agents/remove`,
    {
      data: payload,
    }
  );
  return data;
}
