import {
  getOrganizations,
  getRoles,
  createOrganization,
  assignCoachesToOrganization,
  assignCoachesToBusiness,
  createLicense,
  getOrganizationViewDetail,
  deactivateOrganization,
  getOrganizationAgents,
  removeCoachesFromOrganization,
  removeCoachesFromBusiness,
} from "../organization-management.service"; // adjust path if needed

import { api } from "@/lib/axios";

/* ---------------------------------- */
/* MOCK AXIOS INSTANCE                 */
/* ---------------------------------- */
jest.mock("@/lib/axios", () => ({
  api: {
    get: jest.fn(),
    post: jest.fn(),
    delete: jest.fn(),
  },
}));

const mockedApi = api as jest.Mocked<typeof api>;

const mockBaseResponse = {
  success: true,
  message: "success",
};

describe("Organizations Service API", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  /* ---------------------------------- */
  /* getOrganizations                   */
  /* ---------------------------------- */
  it("should fetch organizations with pagination params", async () => {
    mockedApi.get.mockResolvedValueOnce({
      data: {
        ...mockBaseResponse,
        data: {
          organizations: [],
          total: 0,
          page: 1,
          limit: 10,
        },
      },
    });

    const result = await getOrganizations({ page: 1, limit: 10 });

    expect(mockedApi.get).toHaveBeenCalledWith("/v1/organizations/", {
      params: { page: 1, limit: 10 },
    });

    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.data!.organizations).toEqual([]);
  });

  /* ---------------------------------- */
  /* getRoles                           */
  /* ---------------------------------- */
  it("should fetch roles", async () => {
    mockedApi.get.mockResolvedValueOnce({
      data: {
        ...mockBaseResponse,
        data: {
          roles: [],
        },
      },
    });

    const result = await getRoles();

    expect(mockedApi.get).toHaveBeenCalledWith("/v1/rbac/roles");

    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.data!.roles).toEqual([]);
  });

  /* ---------------------------------- */
  /* createOrganization                 */
  /* ---------------------------------- */
  it("should create an organization", async () => {
    const formData = new FormData();

    mockedApi.post.mockResolvedValueOnce({
      data: {
        ...mockBaseResponse,
        data: {
          organization_id: "org-1",
          logo_uploaded: true,
        },
      },
    });

    const result = await createOrganization(formData);

    expect(mockedApi.post).toHaveBeenCalledWith("/v1/organizations/", formData);

    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.data!.organization_id).toBe("org-1");
  });

  /* ---------------------------------- */
  /* assignCoachesToOrganization        */
  /* ---------------------------------- */
  it("should assign coaches to organization", async () => {
    const payload = { preferences: [] };

    mockedApi.post.mockResolvedValueOnce({
      data: {
        ...mockBaseResponse,
        data: {
          organization_id: "org-1",
          assigned_agents: ["agent-1"],
          failed_agents: [],
          assigned_by: "admin",
        },
      },
    });

    const result = await assignCoachesToOrganization("org-1", payload);

    expect(mockedApi.post).toHaveBeenCalledWith(
      "/v1/organizations/org-1/agents/assign",
      payload,
    );

    expect(result.data).toBeDefined();
    expect(result.data!.assigned_agents).toContain("agent-1");
  });

  /* ---------------------------------- */
  /* assignCoachesToBusiness            */
  /* ---------------------------------- */
  it("should assign coaches to business", async () => {
    const payload = { agent_ids: ["agent-1"] };

    mockedApi.post.mockResolvedValueOnce({
      data: {
        ...mockBaseResponse,
        data: {
          business_id: "biz-1",
          assigned_agents: ["agent-1"],
          failed_agents: [],
          total_assigned: 1,
        },
      },
    });

    const result = await assignCoachesToBusiness("org-1", "biz-1", payload);

    expect(mockedApi.post).toHaveBeenCalledWith(
      "/v1/organizations/org-1/businesses/biz-1/agents/assign",
      payload,
    );

    expect(result.data).toBeDefined();
    expect(result.data!.total_assigned).toBe(1);
  });

  /* ---------------------------------- */
  /* createLicense                      */
  /* ---------------------------------- */
  it("should create a license", async () => {
    const payload = {
      organization_id: "org-1",
      subscription_tier: "pro",
      start_date: "2024-01-01",
      end_date: "2025-01-01",
    };

    mockedApi.post.mockResolvedValueOnce({
      data: {
        ...mockBaseResponse,
        data: {
          license_id: "license-1",
        },
      },
    });

    const result = await createLicense(payload);

    expect(mockedApi.post).toHaveBeenCalledWith("/v1/licenses/", payload);

    expect(result.data).toBeDefined();
    expect(result.data!.license_id).toBe("license-1");
  });

  /* ---------------------------------- */
  /* getOrganizationViewDetail          */
  /* ---------------------------------- */
  it("should fetch organization view detail", async () => {
    mockedApi.get.mockResolvedValueOnce({
      data: {
        ...mockBaseResponse,
        data: {
          id: "org-1",
          businesses: [],
          licenses: [],
          coaches: [],
        },
      },
    });

    const result = await getOrganizationViewDetail("org-1");

    expect(mockedApi.get).toHaveBeenCalledWith("/v1/organizations/org-1");

    expect(result.data).toBeDefined();
    expect(result.data!.id).toBe("org-1");
  });

  /* ---------------------------------- */
  /* deactivateOrganization             */
  /* ---------------------------------- */
  it("should deactivate organization", async () => {
    mockedApi.delete.mockResolvedValueOnce({
      data: {
        ...mockBaseResponse,
        data: {},
      },
    });

    const result = await deactivateOrganization("org-1");

    expect(mockedApi.delete).toHaveBeenCalledWith("/v1/organizations/org-1");

    expect(result.success).toBe(true);
  });

  /* ---------------------------------- */
  /* getOrganizationAgents              */
  /* ---------------------------------- */
  it("should fetch organization agents", async () => {
    mockedApi.get.mockResolvedValueOnce({
      data: {
        ...mockBaseResponse,
        data: {
          organization_id: "org-1",
          organization_name: "Org",
          agents: [],
          total_agents: 0,
        },
      },
    });

    const result = await getOrganizationAgents("org-1");

    expect(mockedApi.get).toHaveBeenCalledWith(
      "/v1/organizations/org-1/agents",
      { params: undefined },
    );

    expect(result.data).toBeDefined();
    expect(result.data!.agents).toEqual([]);
  });

  /* ---------------------------------- */
  /* removeCoachesFromOrganization      */
  /* ---------------------------------- */
  it("should remove coaches from organization", async () => {
    const payload = { agent_ids: ["agent-1"] };

    mockedApi.delete.mockResolvedValueOnce({
      data: {
        ...mockBaseResponse,
        data: {
          organization_id: "org-1",
          removed_agents: ["agent-1"],
          failed_agents: [],
          removed_by: "admin",
        },
      },
    });

    const result = await removeCoachesFromOrganization("org-1", payload);

    expect(mockedApi.delete).toHaveBeenCalledWith(
      "/v1/organizations/org-1/agents/delete",
      { data: payload },
    );

    expect(result.data).toBeDefined();
    expect(result.data!.removed_agents).toContain("agent-1");
  });

  /* ---------------------------------- */
  /* removeCoachesFromBusiness          */
  /* ---------------------------------- */
  it("should remove coaches from business", async () => {
    const payload = { agent_ids: ["agent-1"] };

    mockedApi.delete.mockResolvedValueOnce({
      data: {
        ...mockBaseResponse,
        data: {
          business_id: "biz-1",
          removed_agents: ["agent-1"],
          failed_agents: [],
        },
      },
    });

    const result = await removeCoachesFromBusiness("org-1", "biz-1", payload);

    expect(mockedApi.delete).toHaveBeenCalledWith(
      "/v1/organizations/org-1/businesses/biz-1/agents/remove",
      { data: payload },
    );

    expect(result.data).toBeDefined();
    expect(result.data!.removed_agents).toContain("agent-1");
  });

  it("should fetch organization agents with businessId", async () => {
    mockedApi.get.mockResolvedValueOnce({
      data: {
        success: true,
        message: "success",
        data: {
          organization_id: "org-1",
          organization_name: "Org",
          agents: [],
          total_agents: 0,
          business_id: "biz-1",
        },
      },
    });

    const result = await getOrganizationAgents("org-1", "biz-1");

    expect(mockedApi.get).toHaveBeenCalledWith(
      "/v1/organizations/org-1/agents",
      { params: { business_id: "biz-1" } },
    );

    expect(result.data).toBeDefined();
    expect(result.data!.business_id).toBe("biz-1");
  });
});
