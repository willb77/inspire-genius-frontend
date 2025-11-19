import {
  useMutation,
  useQuery,
  type UseMutationOptions,
  type UseQueryOptions,
} from "@tanstack/react-query";
import type { AxiosError } from "axios";
import {
  getOrganizations,
  getRoles,
  createOrganization,
  type GetOrganizationsResponse,
  type GetRolesResponse,
  type AssignCoachResponse,
  type AssignCoachRequest,
  assignCoachesToOrganization,
  type CreateOrganizationResponse,
  type CreateLicenseResponse,
  type CreateLicenseRequest,
  createLicense,
  getOrganizationViewDetail,
  type DeactivateOrganizationResponse,
  deactivateOrganization,
  type AssignCoachesToBusinessResponse,
  type AssignCoachesToBusinessRequest,
  assignCoachesToBusiness,
  type GetOrganizationViewResponse,
  getOrganizationAgents,
  type GetOrganizationAgentsResponse,
  type RemoveOrganizationAgentsResponse,
  type RemoveAgentsRequest,
  removeCoachesFromOrganization,
  type RemoveBusinessAgentsResponse,
  removeCoachesFromBusiness,
} from "@/services/super-admin/organization-management/organization-management.service";

export function useOrganizationManagement(
  params: { page: number; limit: number },
  options?: UseQueryOptions<GetOrganizationsResponse, AxiosError>
) {
  return useQuery<GetOrganizationsResponse, AxiosError>({
    queryKey: ["organization-management", params],
    queryFn: () => getOrganizations(params),
    ...options,
  });
}

export function useRoles(
  options?: UseQueryOptions<GetRolesResponse, AxiosError>
) {
  return useQuery<GetRolesResponse, AxiosError>({
    queryKey: ["roles"],
    queryFn: () => getRoles(),
    ...options,
  });
}

export function useCreateOrganization(
  options?: UseMutationOptions<CreateOrganizationResponse, AxiosError, FormData>
) {
  return useMutation<CreateOrganizationResponse, AxiosError, FormData>({
    mutationFn: (formData: FormData) => createOrganization(formData),
    ...options,
  });
}

export function useAssignCoachesToOrganization(
  options?: UseMutationOptions<
    AssignCoachResponse,
    AxiosError,
    { orgId: string; payload: AssignCoachRequest }
  >
) {
  return useMutation<
    AssignCoachResponse,
    AxiosError,
    { orgId: string; payload: AssignCoachRequest }
  >({
    mutationFn: ({ orgId, payload }) =>
      assignCoachesToOrganization(orgId, payload),
    ...options,
  });
}

export function useCreateLicense(
  options?: UseMutationOptions<
    CreateLicenseResponse,
    AxiosError,
    CreateLicenseRequest
  >
) {
  return useMutation<CreateLicenseResponse, AxiosError, CreateLicenseRequest>({
    mutationFn: (payload: CreateLicenseRequest) => createLicense(payload),
    ...options,
  });
}

export function useOrganizationViewDetail(
  orgId?: string,
  options?: UseQueryOptions<GetOrganizationViewResponse, AxiosError>
) {
  return useQuery<GetOrganizationViewResponse, AxiosError>({
    queryKey: ["organization-view", orgId],
    queryFn: () => getOrganizationViewDetail(orgId!),
    enabled: !!orgId,
    ...options,
  });
}

export function useDeactivateOrganization(
  options?: UseMutationOptions<
    DeactivateOrganizationResponse,
    AxiosError,
    string
  >
) {
  return useMutation<DeactivateOrganizationResponse, AxiosError, string>({
    mutationFn: (orgId: string) => deactivateOrganization(orgId),
    ...options,
  });
}

export function useAssignCoachesToBusiness(
  options?: UseMutationOptions<
    AssignCoachesToBusinessResponse,
    AxiosError,
    { orgId: string; businessId: string; payload: AssignCoachesToBusinessRequest }
  >
) {
  return useMutation<
    AssignCoachesToBusinessResponse,
    AxiosError,
    { orgId: string; businessId: string; payload: AssignCoachesToBusinessRequest }
  >({
    mutationFn: ({ orgId, businessId, payload }) =>
      assignCoachesToBusiness(orgId, businessId, payload),
    ...options,
  });
}

export function useOrganizationAgents(
  orgId?: string,
  businessId?: string,
  options?: UseQueryOptions<GetOrganizationAgentsResponse, AxiosError>
) {
  return useQuery<GetOrganizationAgentsResponse, AxiosError>({
    queryKey: ["organization-agents", orgId, businessId],
    queryFn: () => getOrganizationAgents(orgId!, businessId),
    enabled: !!orgId,
    ...options,
  });
}

export function useRemoveCoachesFromOrganization(
  options?: UseMutationOptions<
    RemoveOrganizationAgentsResponse,
    AxiosError,
    { orgId: string; payload: RemoveAgentsRequest }
  >
) {
  return useMutation<
    RemoveOrganizationAgentsResponse,
    AxiosError,
    { orgId: string; payload: RemoveAgentsRequest }
  >({
    mutationFn: ({ orgId, payload }) =>
      removeCoachesFromOrganization(orgId, payload),
    ...options,
  });
}

export function useRemoveCoachesFromBusiness(
  options?: UseMutationOptions<
    RemoveBusinessAgentsResponse,
    AxiosError,
    { orgId: string; businessId: string; payload: RemoveAgentsRequest }
  >
) {
  return useMutation<
    RemoveBusinessAgentsResponse,
    AxiosError,
    { orgId: string; businessId: string; payload: RemoveAgentsRequest }
  >({
    mutationFn: ({ orgId, businessId, payload }) =>
      removeCoachesFromBusiness(orgId, businessId, payload),
    ...options,
  });
}