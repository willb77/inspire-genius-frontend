import { act, render, screen, fireEvent } from "@testing-library/react";
import UserFormModal from "../UserFormModal";

/* -------------------------------------------------
   MOCK invitation hooks (used by InvitationSection)
------------------------------------------------- */
const mockUpdateExpiryMutateAsync = jest.fn();
const mockResendMutateAsync = jest.fn();
const mockUseUserInvitation = jest.fn();

jest.mock(
  "@/hooks/super-admin/user-management/useUserManagement",
  () => ({
    useUserInvitation: (...args: any[]) => mockUseUserInvitation(...args),
    useUpdateInvitationExpiry: () => ({
      mutateAsync: mockUpdateExpiryMutateAsync,
      isPending: false,
    }),
    useResendInvitation: () => ({
      mutateAsync: mockResendMutateAsync,
      isPending: false,
    }),
  }),
);

/* -------------------------------------------------
   MOCK ModalFormFrame (important)
------------------------------------------------- */
jest.mock("@/components/shared/forms/ModalFormFrame", () => ({
  __esModule: true,
  default: ({
    open,
    title,
    submitLabel,
    onSubmit,
    children,
    defaultValues,
  }: any) => {
    if (!open) return null;

    const mockForm = {
      control: {},
      handleSubmit: (cb: any) => () => cb(defaultValues),
    };

    return (
      <div>
        <h1>{title}</h1>
        <form onSubmit={mockForm.handleSubmit(onSubmit)}>
          {children(mockForm)}
          <button type="submit">{submitLabel}</button>
        </form>
      </div>
    );
  },
}));

/* -------------------------------------------------
   MOCK shadcn calendar + popover so InvitationSection renders cleanly
------------------------------------------------- */
jest.mock("@/components/ui/calendar", () => ({
  Calendar: ({ onSelect }: any) => (
    <button
      type="button"
      data-testid="calendar-pick"
      onClick={() => onSelect(new Date("2030-01-15T00:00:00Z"))}
    >
      pick 2030-01-15
    </button>
  ),
}));

jest.mock("@/components/ui/popover", () => ({
  Popover: ({ children }: any) => <div>{children}</div>,
  PopoverTrigger: ({ children }: any) => <div>{children}</div>,
  PopoverContent: ({ children }: any) => <div>{children}</div>,
}));

jest.mock("@/components/ui/badge", () => ({
  Badge: ({ children, className }: any) => (
    <span className={className}>{children}</span>
  ),
}));

jest.mock("@/components/ui/button", () => ({
  Button: ({ children, onClick, disabled, ...rest }: any) => (
    <button onClick={onClick} disabled={disabled} {...rest}>
      {children}
    </button>
  ),
}));

/* -------------------------------------------------
   MOCK UI COMPONENTS
------------------------------------------------- */
jest.mock("@/components/ui/input", () => ({
  Input: (props: any) => <input {...props} />,
}));

jest.mock("@/components/ui/form", () => ({
  FormField: ({ render }: any) =>
    render({ field: { value: "", onChange: jest.fn() } }),
  FormItem: ({ children }: any) => <div>{children}</div>,
  FormLabel: ({ children }: any) => <label>{children}</label>,
  FormControl: ({ children }: any) => <div>{children}</div>,
  FormMessage: () => null,
}));

jest.mock("@/components/ui/select", () => ({
  Select: ({ children }: any) => <div>{children}</div>,
  SelectTrigger: ({ children }: any) => <div>{children}</div>,
  SelectValue: ({ placeholder }: any) => <span>{placeholder}</span>,
  SelectContent: ({ children }: any) => <div>{children}</div>,
  SelectItem: ({ children }: any) => <div>{children}</div>,
}));

/* -------------------------------------------------
   TESTS
------------------------------------------------- */
describe("UserFormModal", () => {
  const baseProps = {
    open: true,
    onOpenChange: jest.fn(),
    onSubmit: jest.fn(),
  };

  beforeEach(() => {
    // Default: invitation query returns no data (not loading, not error).
    // Per-test cases can override.
    mockUseUserInvitation.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: false,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("renders add mode with default title and submit label", () => {
    render(<UserFormModal {...baseProps} mode="add" />);

    expect(
      screen.getByRole("heading", { name: "Add User" }),
    ).toBeInTheDocument();

    // Submit button
    expect(
      screen.getByRole("button", { name: "Add User" }),
    ).toBeInTheDocument();
  });

  it("renders edit mode with default title and submit label", () => {
    render(<UserFormModal {...baseProps} mode="edit" />);

    expect(screen.getByText("Edit User")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Save Changes" }),
    ).toBeInTheDocument();
  });

  it("renders form fields", () => {
    render(<UserFormModal {...baseProps} mode="add" />);

    expect(screen.getByPlaceholderText("Enter First Name")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Enter Last Name")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Enter Email")).toBeInTheDocument();
  });

  it("makes email read-only in edit mode", () => {
    render(<UserFormModal {...baseProps} mode="edit" />);

    const email = screen.getByPlaceholderText("Enter Email");
    expect(email).toHaveAttribute("readonly");
  });

  it("shows status field in edit mode by default", () => {
    render(<UserFormModal {...baseProps} mode="edit" />);

    expect(screen.getAllByText("Status").length).toBeGreaterThan(0);
  });

  it("does not show status field when allowStatusEdit is false", () => {
    render(
      <UserFormModal {...baseProps} mode="edit" allowStatusEdit={false} />,
    );

    expect(screen.queryByText("Status")).not.toBeInTheDocument();
  });

  it("calls onSubmit with form values", () => {
    const onSubmit = jest.fn();

    render(<UserFormModal {...baseProps} mode="add" onSubmit={onSubmit} />);

    fireEvent.click(screen.getByRole("button", { name: "Add User" }));

    expect(onSubmit).toHaveBeenCalledWith({
      first_name: "",
      last_name: "",
      email: "",
      role: "",
      status: "Active",
      skip_onboarding: false,
    });
  });

  it("does not render when open is false", () => {
    render(<UserFormModal {...baseProps} open={false} mode="add" />);

    expect(screen.queryByText("Add User")).not.toBeInTheDocument();
  });

  it("renders the Skip onboarding toggle in add mode only", () => {
    const { unmount } = render(<UserFormModal {...baseProps} mode="add" />);
    expect(screen.getByText("Skip onboarding process")).toBeInTheDocument();
    unmount();

    render(
      <UserFormModal
        open
        mode="edit"
        onOpenChange={jest.fn()}
        onSubmit={jest.fn()}
      />,
    );
    expect(screen.queryByText("Skip onboarding process")).not.toBeInTheDocument();
  });

  it("merges defaultValues and submits them correctly", () => {
    const onSubmit = jest.fn();

    render(
      <UserFormModal
        open
        mode="edit"
        onOpenChange={jest.fn()}
        onSubmit={onSubmit}
        defaultValues={{
          first_name: "Alice",
          last_name: "Smith",
          email: "alice@test.com",
          status: "Deactivated",
        }}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));

    expect(onSubmit).toHaveBeenCalledWith({
      first_name: "Alice",
      last_name: "Smith",
      email: "alice@test.com",
      role: "",
      status: "Deactivated",
      skip_onboarding: false,
    });
  });

  it("uses custom submitLabel when provided", () => {
    render(
      <UserFormModal
        open
        mode="add"
        submitLabel="Create User Now"
        onOpenChange={jest.fn()}
        onSubmit={jest.fn()}
      />,
    );

    expect(
      screen.getByRole("button", { name: "Create User Now" }),
    ).toBeInTheDocument();
  });

  /* -------------------------------------------------
     INVITATION SECTION (new)
  ------------------------------------------------- */
  describe("InvitationSection", () => {
    const invitationContext = {
      userId: "user-1",
      invitationId: "inv-1",
      invitationStatus: "pending",
    };

    it("does not render invitation section in add mode", () => {
      render(
        <UserFormModal
          {...baseProps}
          mode="add"
          invitationContext={invitationContext}
        />,
      );
      expect(screen.queryByText("Invitation")).not.toBeInTheDocument();
    });

    it("does not render invitation section when invitationContext is omitted", () => {
      render(<UserFormModal {...baseProps} mode="edit" />);
      expect(screen.queryByText("Invitation")).not.toBeInTheDocument();
    });

    it("renders invitation section when status is 'accepted' (Bundle 2 widening)", () => {
      // Pre-2026-05-28: the gate hid the section on accepted status. After
      // Bundle 2 (Phil Gant + Tracey re-issue case), the section is shown
      // for any user with an invitation_id regardless of status so admins
      // can extend expiry / resend on accepted invitations.
      mockUseUserInvitation.mockReturnValue({
        data: {
          invitation_id: "inv-1",
          status: "accepted",
          stored_status: "accepted",
          expires_at: "2026-06-01T00:00:00Z",
          sent_at: "2026-05-15T00:00:00Z",
          role: "manager",
          role_id: "r1",
          email: "u@x.com",
          organization_id: null,
        },
        isLoading: false,
        isError: false,
      });
      render(
        <UserFormModal
          {...baseProps}
          mode="edit"
          invitationContext={{
            ...invitationContext,
            invitationStatus: "accepted",
          }}
        />,
      );
      expect(screen.getByText("Invitation")).toBeInTheDocument();
    });

    it("renders invitation section in edit mode with pending status", () => {
      mockUseUserInvitation.mockReturnValue({
        data: {
          invitation_id: "inv-1",
          status: "pending",
          stored_status: "pending",
          expires_at: "2026-06-01T00:00:00Z",
          sent_at: "2026-05-15T00:00:00Z",
          role: "manager",
          role_id: "r1",
          email: "u@x.com",
          organization_id: null,
        },
        isLoading: false,
        isError: false,
      });

      render(
        <UserFormModal
          {...baseProps}
          mode="edit"
          invitationContext={invitationContext}
        />,
      );

      expect(screen.getByText("Invitation")).toBeInTheDocument();
      expect(screen.getByText("u@x.com")).toBeInTheDocument();
      expect(screen.getByText("manager")).toBeInTheDocument();
      // The status badge label
      expect(screen.getByText("Pending")).toBeInTheDocument();
    });

    it("shows loading state while fetching invitation", () => {
      mockUseUserInvitation.mockReturnValue({
        data: undefined,
        isLoading: true,
        isError: false,
      });

      render(
        <UserFormModal
          {...baseProps}
          mode="edit"
          invitationContext={invitationContext}
        />,
      );

      expect(screen.getByText(/Loading invitation details/i)).toBeInTheDocument();
    });

    it("renders error message when invitation fetch fails", () => {
      mockUseUserInvitation.mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: true,
        error: { response: { data: { message: "User has no invitation" } } },
      });

      render(
        <UserFormModal
          {...baseProps}
          mode="edit"
          invitationContext={invitationContext}
        />,
      );

      expect(screen.getByText("User has no invitation")).toBeInTheDocument();
    });

    it("calls update-expiry mutation with ISO UTC date after picking a future date", async () => {
      mockUseUserInvitation.mockReturnValue({
        data: {
          invitation_id: "inv-1",
          status: "pending",
          stored_status: "pending",
          expires_at: "2026-06-01T00:00:00Z",
          sent_at: "2026-05-15T00:00:00Z",
          role: "user",
          role_id: "r1",
          email: "u@x.com",
          organization_id: null,
        },
        isLoading: false,
        isError: false,
      });
      mockUpdateExpiryMutateAsync.mockResolvedValue({});

      render(
        <UserFormModal
          {...baseProps}
          mode="edit"
          invitationContext={invitationContext}
        />,
      );

      // Update button is disabled until a date is chosen
      const updateBtn = screen.getByRole("button", { name: /Update Expiry/i });
      expect(updateBtn).toBeDisabled();

      fireEvent.click(screen.getByTestId("calendar-pick"));
      expect(updateBtn).not.toBeDisabled();

      await act(async () => {
        fireEvent.click(updateBtn);
      });

      expect(mockUpdateExpiryMutateAsync).toHaveBeenCalledWith({
        userId: "user-1",
        expires_at: new Date("2030-01-15T00:00:00Z").toISOString(),
      });
    });

    it("clicking Resend triggers useResendInvitation with the invitationId", async () => {
      mockUseUserInvitation.mockReturnValue({
        data: {
          invitation_id: "inv-1",
          status: "pending",
          stored_status: "pending",
          expires_at: "2026-06-01T00:00:00Z",
          sent_at: null,
          role: null,
          role_id: null,
          email: "u@x.com",
          organization_id: null,
        },
        isLoading: false,
        isError: false,
      });
      mockResendMutateAsync.mockResolvedValue({});

      render(
        <UserFormModal
          {...baseProps}
          mode="edit"
          invitationContext={invitationContext}
        />,
      );

      await act(async () => {
        fireEvent.click(
          screen.getByRole("button", { name: /Resend Invitation/i }),
        );
      });
      expect(mockResendMutateAsync).toHaveBeenCalledWith("inv-1");
    });
  });
});
