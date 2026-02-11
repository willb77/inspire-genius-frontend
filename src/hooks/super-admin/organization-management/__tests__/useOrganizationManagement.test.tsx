import {
  useOrganizationManagement,
  useRoles,
  useCreateOrganization,
  useAssignCoachesToOrganization,
  useCreateLicense,
  useOrganizationViewDetail,
  useDeactivateOrganization,
  useAssignCoachesToBusiness,
  useOrganizationAgents,
  useRemoveCoachesFromOrganization,
  useRemoveCoachesFromBusiness,
} from "../useOrganizationManagement"; // adjust path

import * as service from "@/services/super-admin/organization-management/organization-management.service";

import { useQuery, useMutation } from "@tanstack/react-query";

/* ---------------------------------- */
/* MOCK REACT QUERY                   */
/* ---------------------------------- */
jest.mock("@tanstack/react-query", () => ({
  useQuery: jest.fn(),
  useMutation: jest.fn(),
}));

/* ---------------------------------- */
/* MOCK SERVICE LAYER                 */
/* ---------------------------------- */
jest.mock(
  "@/services/super-admin/organization-management/organization-management.service",
  () => ({
    getOrganizations: jest.fn(),
    getRoles: jest.fn(),
    createOrganization: jest.fn(),
    assignCoachesToOrganization: jest.fn(),
    createLicense: jest.fn(),
    getOrganizationViewDetail: jest.fn(),
    deactivateOrganization: jest.fn(),
    assignCoachesToBusiness: jest.fn(),
    getOrganizationAgents: jest.fn(),
    removeCoachesFromOrganization: jest.fn(),
    removeCoachesFromBusiness: jest.fn(),
  }),
);

describe("useOrganizationManagement hooks", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  /* ---------------------------------- */
  /* useOrganizationManagement          */
  /* ---------------------------------- */
  it("should call useQuery with correct params for organization list", () => {
    (useQuery as jest.Mock).mockReturnValue({});

    useOrganizationManagement({ page: 1, limit: 10 });

    expect(useQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: ["organization-management", { page: 1, limit: 10 }],
        queryFn: expect.any(Function),
      }),
    );
  });

  /* ---------------------------------- */
  /* useRoles                           */
  /* ---------------------------------- */
  it("should call useQuery for roles", () => {
    (useQuery as jest.Mock).mockReturnValue({});

    useRoles();

    expect(useQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: ["roles"],
        queryFn: expect.any(Function),
      }),
    );
  });

  /* ---------------------------------- */
  /* useCreateOrganization              */
  /* ---------------------------------- */
  it("should call useMutation for create organization", () => {
    (useMutation as jest.Mock).mockReturnValue({});

    useCreateOrganization();

    expect(useMutation).toHaveBeenCalledWith(
      expect.objectContaining({
        mutationFn: expect.any(Function),
      }),
    );
  });

  /* ---------------------------------- */
  /* useAssignCoachesToOrganization     */
  /* ---------------------------------- */
  it("should call service on assign coaches to organization", async () => {
    (useMutation as jest.Mock).mockImplementation(({ mutationFn }) => {
      mutationFn({
        orgId: "org-1",
        payload: { preferences: [] },
      });
      return {};
    });

    useAssignCoachesToOrganization();

    expect(service.assignCoachesToOrganization).toHaveBeenCalledWith("org-1", {
      preferences: [],
    });
  });

  /* ---------------------------------- */
  /* useCreateLicense                   */
  /* ---------------------------------- */
  it("should call service on create license", async () => {
    (useMutation as jest.Mock).mockImplementation(({ mutationFn }) => {
      mutationFn({
        organization_id: "org-1",
        subscription_tier: "pro",
        start_date: "2024-01-01",
        end_date: "2025-01-01",
      });
      return {};
    });

    useCreateLicense();

    expect(service.createLicense).toHaveBeenCalled();
  });

  /* ---------------------------------- */
  /* useOrganizationViewDetail          */
  /* ---------------------------------- */
  it("should enable query only when orgId exists", () => {
    (useQuery as jest.Mock).mockReturnValue({});

    useOrganizationViewDetail(undefined);

    expect(useQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        enabled: false,
      }),
    );
  });

  it("should call service when orgId exists", async () => {
    (useQuery as jest.Mock).mockImplementation(({ queryFn }) => {
      queryFn();
      return {};
    });

    useOrganizationViewDetail("org-1");

    expect(service.getOrganizationViewDetail).toHaveBeenCalledWith("org-1");
  });

  /* ---------------------------------- */
  /* useDeactivateOrganization          */
  /* ---------------------------------- */
  it("should call service on deactivate organization", async () => {
    (useMutation as jest.Mock).mockImplementation(({ mutationFn }) => {
      mutationFn("org-1");
      return {};
    });

    useDeactivateOrganization();

    expect(service.deactivateOrganization).toHaveBeenCalledWith("org-1");
  });

  /* ---------------------------------- */
  /* useAssignCoachesToBusiness         */
  /* ---------------------------------- */
  it("should call service on assign coaches to business", async () => {
    (useMutation as jest.Mock).mockImplementation(({ mutationFn }) => {
      mutationFn({
        orgId: "org-1",
        businessId: "biz-1",
        payload: { agent_ids: ["a1"] },
      });
      return {};
    });

    useAssignCoachesToBusiness();

    expect(service.assignCoachesToBusiness).toHaveBeenCalledWith(
      "org-1",
      "biz-1",
      { agent_ids: ["a1"] },
    );
  });

  /* ---------------------------------- */
  /* useOrganizationAgents              */
  /* ---------------------------------- */
  it("should disable agents query when orgId is missing", () => {
    (useQuery as jest.Mock).mockReturnValue({});

    useOrganizationAgents(undefined);

    expect(useQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        enabled: false,
      }),
    );
  });

  it("should call service when orgId exists", async () => {
    (useQuery as jest.Mock).mockImplementation(({ queryFn }) => {
      queryFn();
      return {};
    });

    useOrganizationAgents("org-1", "biz-1");

    expect(service.getOrganizationAgents).toHaveBeenCalledWith(
      "org-1",
      "biz-1",
    );
  });

  /* ---------------------------------- */
  /* useRemoveCoachesFromOrganization   */
  /* ---------------------------------- */
  it("should call service to remove coaches from organization", async () => {
    (useMutation as jest.Mock).mockImplementation(({ mutationFn }) => {
      mutationFn({
        orgId: "org-1",
        payload: { agent_ids: ["a1"] },
      });
      return {};
    });

    useRemoveCoachesFromOrganization();

    expect(service.removeCoachesFromOrganization).toHaveBeenCalledWith(
      "org-1",
      { agent_ids: ["a1"] },
    );
  });

  /* ---------------------------------- */
  /* useRemoveCoachesFromBusiness       */
  /* ---------------------------------- */
  it("should call service to remove coaches from business", async () => {
    (useMutation as jest.Mock).mockImplementation(({ mutationFn }) => {
      mutationFn({
        orgId: "org-1",
        businessId: "biz-1",
        payload: { agent_ids: ["a1"] },
      });
      return {};
    });

    useRemoveCoachesFromBusiness();

    expect(service.removeCoachesFromBusiness).toHaveBeenCalledWith(
      "org-1",
      "biz-1",
      { agent_ids: ["a1"] },
    );
  });

  it("should execute createOrganization mutationFn", () => {
    (useMutation as jest.Mock).mockImplementation(({ mutationFn }) => {
      const formData = new FormData();
      mutationFn(formData);
      return {};
    });

    useCreateOrganization();

    expect(service.createOrganization).toHaveBeenCalled();
  });

  it("should execute assignCoachesToOrganization mutationFn", () => {
    (useMutation as jest.Mock).mockImplementation(({ mutationFn }) => {
      mutationFn({
        orgId: "org-1",
        payload: { preferences: [] },
      });
      return {};
    });

    useAssignCoachesToOrganization();

    expect(service.assignCoachesToOrganization).toHaveBeenCalledWith("org-1", {
      preferences: [],
    });
  });

  it("should execute createLicense mutationFn", () => {
    (useMutation as jest.Mock).mockImplementation(({ mutationFn }) => {
      mutationFn({
        organization_id: "org-1",
        subscription_tier: "pro",
        start_date: "2024-01-01",
        end_date: "2025-01-01",
      });
      return {};
    });

    useCreateLicense();

    expect(service.createLicense).toHaveBeenCalled();
  });
});
