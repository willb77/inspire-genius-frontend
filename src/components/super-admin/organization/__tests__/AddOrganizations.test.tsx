import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { act } from "react-dom/test-utils";
import AddOrganization from "../AddOrganizations";

/* ---------------------------------- */
/* MOCK CHILD COMPONENTS              */
/* ---------------------------------- */
jest.mock(
  "@/components/super-admin/organization/onboarding-steps/OrganizationInfo",
  () => () => <div>Organization Step</div>,
);

jest.mock(
  "@/components/super-admin/organization/onboarding-steps/CoachesInfo",
  () => ({ isOrganizationLevel, assignedCoachIds }: any) => (
    <div>
      Coaches Step
      <span data-testid="org-level">{isOrganizationLevel ? "org" : "biz"}</span>
      <span data-testid="assigned-coaches">{assignedCoachIds.join(",")}</span>
    </div>
  ),
);

jest.mock(
  "@/components/super-admin/organization/onboarding-steps/LicenseInfo",
  () => () => <div>License Step</div>,
);

/* ---------------------------------- */
/* MOCK MODAL                         */
/* ---------------------------------- */
jest.mock(
  "@/components/super-admin/organization/OnboardingOrganizationModel",
  () => ({
    OnboardingOrganizationModel: ({ open, title, children, footer, steps, currentStep, showProgress }: any) =>
      open ? (
        <div>
          <h1>{title}</h1>
          <div data-testid="progress">{showProgress ? "show" : "hide"}</div>
          <div data-testid="current-step">{currentStep}</div>
          <div data-testid="total-steps">{steps?.length}</div>
          {children}
          {footer}
        </div>
      ) : null,
  }),
);

/* ---------------------------------- */
/* MOCK UI COMPONENTS                 */
/* ---------------------------------- */
jest.mock("@/components/ui/button", () => ({
  Button: ({ children, onClick, disabled }: any) => (
    <button onClick={onClick} disabled={disabled}>
      {children}
    </button>
  ),
}));

jest.mock("@/components/ui/form", () => ({
  Form: ({ children }: any) => <form>{children}</form>,
}));

/* ---------------------------------- */
/* MOCK CONSTANTS                     */
/* ---------------------------------- */
jest.mock("@/components/shared/forms/organizationForm.constants", () => ({
  ORGANIZATION_FORM_DEFAULTS: {
    organization_name: "",
    email: "",
    contact: "",
    address: "",
    coaches: [],
    license_type: "",
    license_start_date: "",
    license_end_date: "",
  },
  ORGANIZATION_STEPS: [
    { label: "Organization" },
    { label: "Coaches" },
    { label: "License" },
  ],
}));

/* ---------------------------------- */
/* MOCK TOAST                         */
/* ---------------------------------- */
const toastSuccess = jest.fn();
const toastError = jest.fn();

jest.mock("sonner", () => ({
  toast: {
    success: (...args: any[]) => toastSuccess(...args),
    error: (...args: any[]) => toastError(...args),
  },
}));

/* ---------------------------------- */
/* MOCK FORM                          */
/* ---------------------------------- */
const mockTrigger = jest.fn().mockResolvedValue(true);
const mockGetValues = jest.fn().mockReturnValue({
  organization_name: "Test Org",
  email: "test@test.com",
  contact: "1234567890",
  address: "123 Test St",
  type: "business",
  website_url: "https://test.com",
  logo: null,
  coaches: [],
  license_type: "premium",
  license_start_date: "2024-01-01",
  license_end_date: "2025-01-01",
});
const mockReset = jest.fn();

jest.mock("react-hook-form", () => ({
  useForm: () => ({
    trigger: mockTrigger,
    getValues: mockGetValues,
    reset: mockReset,
    control: {},
  }),
}));

/* ---------------------------------- */
/* MOCK HOOKS (API)                   */
/* ---------------------------------- */
const mockCreateOrg = jest.fn().mockResolvedValue({
  status: true,
  data: { organization_id: "org-123" },
  message: "Organization created successfully",
});

const mockAssignOrg = jest.fn().mockResolvedValue({});
const mockAssignBiz = jest.fn().mockResolvedValue({});
const mockCreateLicense = jest.fn().mockResolvedValue({});

jest.mock(
  "@/hooks/super-admin/organization-management/useOrganizationManagement",
  () => ({
    useCreateOrganization: () => ({
      mutateAsync: mockCreateOrg,
    }),
    useAssignCoachesToOrganization: () => ({
      mutateAsync: mockAssignOrg,
    }),
    useAssignCoachesToBusiness: () => ({
      mutateAsync: mockAssignBiz,
    }),
    useCreateLicense: () => ({
      mutateAsync: mockCreateLicense,
    }),
    useOrganizationAgents: () => ({
      data: { data: { agents: [{ agent_id: "agent-1" }, { agent_id: "agent-2" }] } },
    }),
  }),
);

/* ---------------------------------- */
/* TESTS                              */
/* ---------------------------------- */
describe("AddOrganization", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockTrigger.mockResolvedValue(true);
    mockGetValues.mockReturnValue({
      organization_name: "Test Org",
      email: "test@test.com",
      contact: "1234567890",
      address: "123 Test St",
      type: "business",
      website_url: "https://test.com",
      logo: null,
      coaches: [],
      license_type: "premium",
      license_start_date: "2024-01-01",
      license_end_date: "2025-01-01",
    });
  });

  it("should render Add Organization modal", () => {
    render(<AddOrganization open />);

    expect(screen.getByText("Add Organization")).toBeInTheDocument();
    expect(screen.getByText("Organization Step")).toBeInTheDocument();
  });

  it("should render Edit Organization modal when mode is edit", () => {
    render(<AddOrganization open mode="edit" />);

    expect(screen.getByText("Edit Organization")).toBeInTheDocument();
  });

  it("should reset form when opened", () => {
    render(<AddOrganization open initialData={{ organization_name: "X" }} />);

    expect(mockReset).toHaveBeenCalled();
  });

  it("should close modal when Cancel is clicked", () => {
    const onOpenChange = jest.fn();

    render(<AddOrganization open onOpenChange={onOpenChange} />);

    fireEvent.click(screen.getByText("Cancel"));

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("should move to next step on Save & Next click", async () => {
    render(<AddOrganization open />);

    await act(async () => {
      fireEvent.click(screen.getByText("Save & Next"));
    });

    await waitFor(() => expect(mockTrigger).toHaveBeenCalled());
    await waitFor(() => expect(mockCreateOrg).toHaveBeenCalled());
  });

  it("should show Processing... while submitting", async () => {
    let resolveCreateOrg: any;
    mockCreateOrg.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveCreateOrg = resolve;
        })
    );

    render(<AddOrganization open />);

    await act(async () => {
      fireEvent.click(screen.getByText("Save & Next"));
    });

    expect(
      screen.getByRole("button", { name: /processing/i }),
    ).toBeInTheDocument();

    await act(async () => {
      resolveCreateOrg({
        status: true,
        data: { organization_id: "org-1" },
        message: "Created",
      });
    });

    await waitFor(() =>
      expect(
        screen.queryByRole("button", { name: /processing/i }),
      ).not.toBeInTheDocument(),
    );
  });

  it("should render coaches-only title correctly (organization)", () => {
    render(
      <AddOrganization open flowType="coaches-only" isOrganizationLevel />,
    );

    expect(
      screen.getByText("Assign Coaches to Organization"),
    ).toBeInTheDocument();
  });

  it("should render business-level coaches title correctly", () => {
    render(
      <AddOrganization
        open
        flowType="coaches-only"
        isOrganizationLevel={false}
      />,
    );

    expect(screen.getByText("Assign Coaches to Business")).toBeInTheDocument();
  });

  it("should handle errors gracefully", async () => {
    mockCreateOrg.mockRejectedValueOnce(new Error("Boom"));

    render(<AddOrganization open />);

    await act(async () => {
      fireEvent.click(screen.getByText("Save & Next"));
    });

    await waitFor(() => expect(toastError).toHaveBeenCalled());
  });

  it("should handle organization-only flow", async () => {
    render(<AddOrganization open flowType="organization-only" />);

    expect(screen.getByTestId("total-steps")).toHaveTextContent("2");
    expect(screen.getByText("Organization Step")).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByText("Save & Next"));
    });

    await waitFor(() => expect(mockCreateOrg).toHaveBeenCalled());
  });

  it("should handle coaches-only flow", () => {
    render(
      <AddOrganization
        open
        flowType="coaches-only"
        organizationId="org-123"
        isOrganizationLevel
      />
    );

    expect(screen.getByTestId("total-steps")).toHaveTextContent("1");
    expect(screen.getByText("Coaches Step")).toBeInTheDocument();
    expect(screen.getByTestId("progress")).toHaveTextContent("hide");
  });

  it("should handle full flow", () => {
    render(<AddOrganization open flowType="full" />);

    expect(screen.getByTestId("total-steps")).toHaveTextContent("3");
    expect(screen.getByTestId("progress")).toHaveTextContent("show");
  });

  it("should validate step fields before proceeding", async () => {
    mockTrigger.mockResolvedValueOnce(false);

    render(<AddOrganization open />);

    await act(async () => {
      fireEvent.click(screen.getByText("Save & Next"));
    });

    await waitFor(() => expect(mockTrigger).toHaveBeenCalled());
    expect(mockCreateOrg).not.toHaveBeenCalled();
  });

  it("should call onSubmit prop after organization creation", async () => {
    const onSubmit = jest.fn();

    render(<AddOrganization open onSubmit={onSubmit} />);

    await act(async () => {
      fireEvent.click(screen.getByText("Save & Next"));
    });

    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
  });

  it("should handle coaches step for organization level", async () => {
    mockGetValues.mockReturnValueOnce({
      coaches: [
        { agentId: "agent-1", toneIds: ["tone-1"], accentId: "accent-1", genderId: "gender-1" },
      ],
    });

    render(
      <AddOrganization
        open
        flowType="coaches-only"
        organizationId="org-123"
        isOrganizationLevel
      />
    );

    await act(async () => {
      fireEvent.click(screen.getByText("Submit"));
    });

    await waitFor(() => {
      expect(mockAssignOrg).toHaveBeenCalledWith({
        orgId: "org-123",
        payload: {
          preferences: [
            {
              agent_id: "agent-1",
              tone_ids: ["tone-1"],
              accent_id: "accent-1",
              gender_id: "gender-1",
            },
          ],
        },
      });
    });
  });

  it("should handle coaches step for business level", async () => {
    mockGetValues.mockReturnValueOnce({
      coaches: [{ agentId: "agent-1" }, { agentId: "agent-2" }],
    });

    render(
      <AddOrganization
        open
        flowType="coaches-only"
        organizationId="org-123"
        selectedBusinessId="biz-456"
        isOrganizationLevel={false}
      />
    );

    await act(async () => {
      fireEvent.click(screen.getByText("Submit"));
    });

    await waitFor(() => {
      expect(mockAssignBiz).toHaveBeenCalledWith({
        orgId: "org-123",
        businessId: "biz-456",
        payload: { agent_ids: ["agent-1", "agent-2"] },
      });
    });
  });

  it("should throw error when business ID is missing for business-level assignment", async () => {
    mockGetValues.mockReturnValueOnce({
      coaches: [{ agentId: "agent-1" }],
    });

    render(
      <AddOrganization
        open
        flowType="coaches-only"
        organizationId="org-123"
        isOrganizationLevel={false}
      />
    );

    await act(async () => {
      fireEvent.click(screen.getByText("Submit"));
    });

    await waitFor(() => {
      expect(toastError).toHaveBeenCalledWith("Business ID missing for business-level assignment");
    });
  });

  it("should throw error when organization ID is missing for coaches step", async () => {
    mockGetValues.mockReturnValueOnce({
      coaches: [{ agentId: "agent-1" }],
    });

    render(
      <AddOrganization
        open
        flowType="coaches-only"
        isOrganizationLevel
      />
    );

    await act(async () => {
      fireEvent.click(screen.getByText("Submit"));
    });

    await waitFor(() => {
      expect(toastError).toHaveBeenCalledWith("Organization ID missing.");
    });
  });

  it("should handle logo file upload", async () => {
    const logoFile = new File(["logo"], "logo.png", { type: "image/png" });
    mockGetValues.mockReturnValueOnce({
      organization_name: "Test Org",
      email: "test@test.com",
      contact: "1234567890",
      address: "123 Test St",
      type: "business",
      website_url: "https://test.com",
      logo: logoFile,
    });

    render(<AddOrganization open />);

    await act(async () => {
      fireEvent.click(screen.getByText("Save & Next"));
    });

    await waitFor(() => {
      expect(mockCreateOrg).toHaveBeenCalled();
      const formData = mockCreateOrg.mock.calls[0][0];
      expect(formData.get("logo")).toBe(logoFile);
    });
  });

  it("should pass assigned coach IDs to CoachesInfo component", () => {
    render(
      <AddOrganization
        open
        flowType="coaches-only"
        organizationId="org-123"
        isOrganizationLevel
      />
    );

    expect(screen.getByTestId("assigned-coaches")).toHaveTextContent("agent-1,agent-2");
  });

  it("should handle empty coaches array", async () => {
    mockGetValues.mockReturnValueOnce({
      coaches: [],
    });

    render(
      <AddOrganization
        open
        flowType="coaches-only"
        organizationId="org-123"
        isOrganizationLevel
      />
    );

    await act(async () => {
      fireEvent.click(screen.getByText("Submit"));
    });

    await waitFor(() => {
      expect(mockAssignOrg).not.toHaveBeenCalled();
    });
  });

  it("should handle non-Error exceptions in catch block", async () => {
    mockCreateOrg.mockRejectedValueOnce("String error");

    render(<AddOrganization open />);

    await act(async () => {
      fireEvent.click(screen.getByText("Save & Next"));
    });

    await waitFor(() => {
      expect(toastError).toHaveBeenCalledWith("Something went wrong");
    });
  });

  it("should use propOrganizationId when organizationId state is empty", async () => {
    mockGetValues.mockReturnValueOnce({
      coaches: [{ agentId: "agent-1" }],
    });

    render(
      <AddOrganization
        open
        flowType="coaches-only"
        organizationId="prop-org-456"
        isOrganizationLevel
      />
    );

    await act(async () => {
      fireEvent.click(screen.getByText("Submit"));
    });

    await waitFor(() => {
      expect(mockAssignOrg).toHaveBeenCalledWith(
        expect.objectContaining({ orgId: "prop-org-456" })
      );
    });
  });

  it("should reset organizationId on modal close", async () => {
    const onOpenChange = jest.fn();

    render(<AddOrganization open onOpenChange={onOpenChange} />);

    await act(async () => {
      fireEvent.click(screen.getByText("Save & Next"));
    });

    await waitFor(() => expect(mockCreateOrg).toHaveBeenCalled());

    fireEvent.click(screen.getByText("Cancel"));

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("should show success toast for coaches assignment to organization", async () => {
    mockGetValues.mockReturnValueOnce({
      coaches: [{ agentId: "agent-1" }],
    });

    render(
      <AddOrganization
        open
        flowType="coaches-only"
        organizationId="org-123"
        isOrganizationLevel
      />
    );

    await act(async () => {
      fireEvent.click(screen.getByText("Submit"));
    });

    await waitFor(() => {
      expect(toastSuccess).toHaveBeenCalledWith("Coaches assigned to organization successfully");
    });
  });

  it("should show success toast for coaches assignment to business", async () => {
    mockGetValues.mockReturnValueOnce({
      coaches: [{ agentId: "agent-1" }],
    });

    render(
      <AddOrganization
        open
        flowType="coaches-only"
        organizationId="org-123"
        selectedBusinessId="biz-456"
        isOrganizationLevel={false}
      />
    );

    await act(async () => {
      fireEvent.click(screen.getByText("Submit"));
    });

    await waitFor(() => {
      expect(toastSuccess).toHaveBeenCalledWith("Coaches assigned to business successfully");
    });
  });

  it("should disable buttons while submitting", async () => {
    let resolveCreateOrg: any;
    mockCreateOrg.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveCreateOrg = resolve;
        })
    );

    render(<AddOrganization open />);

    await act(async () => {
      fireEvent.click(screen.getByText("Save & Next"));
    });

    const cancelButton = screen.getByText("Cancel");
    const submitButton = screen.getByText("Processing...");

    expect(cancelButton).toBeDisabled();
    expect(submitButton).toBeDisabled();

    await act(async () => {
      resolveCreateOrg({
        status: true,
        data: { organization_id: "org-1" },
        message: "Created",
      });
    });
  });
});