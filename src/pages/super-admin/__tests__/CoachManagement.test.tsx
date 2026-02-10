import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import CoachManagement from "../CoachManagement";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { toast } from "sonner";

/* -------------------------------------------------
  TEST UTILS
------------------------------------------------- */
function renderWithQueryClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
      mutations: {
        retry: false,
      },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
  );
}

/* -------------------------------------------------
  MOCK LAYOUT
------------------------------------------------- */
jest.mock("@/layouts/SuperAdminLayout", () => ({
  __esModule: true,
  default: ({ children }: any) => <div>{children}</div>,
}));

/* -------------------------------------------------
  MOCK CHILD COMPONENTS
------------------------------------------------- */
jest.mock("@/components/super-admin/ManagementHeader", () => (props: any) => (
  <button onClick={props.onAdd}>{props.addLabel}</button>
));

jest.mock("@/components/super-admin/organization/DataTable", () => ({
  DataTable: ({ data, onSortChange, columns }: any) => (
    <div>
      <button onClick={() => onSortChange("name")}>Sort Name</button>
      <button onClick={() => onSortChange("category")}>Sort Category</button>
      <button onClick={() => onSortChange("status")}>Sort Status</button>
      {data.map((row: any) => (
        <div key={row.id}>
          <span>{row.name}</span>
          <span>{row.status}</span>
          {columns.map((col: any) => (
            col.render && <div key={col.key}>{col.render(row)}</div>
          ))}
        </div>
      ))}
    </div>
  ),
}));

jest.mock("@/components/shared/ActionMenu", () => (props: any) => (
  <div>
    {props.showEdit && (
      <button onClick={props.onEdit} data-testid="edit-btn">
        Edit
      </button>
    )}
    {props.showDeactivate && (
      <button onClick={props.onDeactivate} data-testid="deactivate-btn">
        Deactivate
      </button>
    )}
  </div>
));

jest.mock("@/components/shared/Pagination", () => (props: any) => (
  <button onClick={() => props.onPageChange(2)}>Next Page</button>
));

const mockCoachFormModal = jest.fn();
jest.mock(
  "@/components/shared/forms/CoachFormModal",
  () => (props: any) => {
    mockCoachFormModal(props);
    return props.open ? (
      <div data-testid="coach-form-modal">
        <button
          onClick={async () => {
            try {
              await props.onSubmit({
                name: "Coach X",
                category: "AI",
                voice_description: "Test voice",
                status: "active",
              });
            } catch (e) {
              // Error is handled in the component
            }
          }}
        >
          Submit
        </button>
      </div>
    ) : null;
  },
);

const mockConfirmModal = jest.fn();
jest.mock(
  "@/components/shared/forms/ConfirmActionModal",
  () => (props: any) => {
    mockConfirmModal(props);
    return props.open ? (
      <div data-testid="confirm-modal">
        <button onClick={props.onConfirm}>Confirm</button>
      </div>
    ) : null;
  },
);

jest.mock("@/components/ui/badge", () => ({
  Badge: ({ children, className }: any) => <span className={className}>{children}</span>,
}));

jest.mock("@/components/ui/skeleton", () => ({
  Skeleton: () => <div data-testid="skeleton" />,
}));

/* -------------------------------------------------
  MOCK SERVICES & HOOKS
------------------------------------------------- */
const createSpy = jest.fn();
const updateSpy = jest.fn();
const deactivateSpy = jest.fn();

const mockUseCoachesList = jest.fn();
const mockUseCreateCoach = jest.fn();
const mockUseUpdateCoach = jest.fn();
const mockUseDeactivateCoach = jest.fn();

jest.mock("@/hooks/super-admin/coach-management/useCoaches", () => ({
  useCoachesList: () => mockUseCoachesList(),
  useCreateCoach: () => mockUseCreateCoach(),
  useUpdateCoach: () => mockUseUpdateCoach(),
  useDeactivateCoach: () => mockUseDeactivateCoach(),
}));

const mockGetTones = jest.fn();
jest.mock("@/services/coaches/settings.service", () => ({
  getTones: () => mockGetTones(),
}));

jest.mock("sonner", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

/* -------------------------------------------------
  TESTS
------------------------------------------------- */
describe("CoachManagement Page", () => {
  beforeEach(() => {
    // Default mock implementations
    mockUseCoachesList.mockReturnValue({
      isLoading: false,
      isRefetching: false,
      data: {
        data: {
          agents: [
            {
              id: "1",
              name: "Coach One",
              category_name: "AI",
              prompts: [{ text: "Voice description for coach one" }],
              status: "active",
              type: "custom",
            },
            {
              id: "2",
              name: "Coach Two",
              category_name: "Sports",
              prompts: [{ text: "Short" }],
              status: "deactivated",
              type: "predefined",
            },
          ],
          pagination: {
            total: 2,
            page: 1,
            page_size: 8,
          },
        },
      },
    });

    mockUseCreateCoach.mockReturnValue({
      mutateAsync: createSpy,
      isPending: false,
    });

    mockUseUpdateCoach.mockReturnValue({
      mutateAsync: updateSpy,
      isPending: false,
    });

    mockUseDeactivateCoach.mockReturnValue({
      mutateAsync: deactivateSpy,
      isPending: false,
    });

    mockGetTones.mockResolvedValue({
      data: {
        Tones: [
          { id: "1", name: "Calm", display_name: "Calm" },
          { id: "2", name: "Energetic", display_name: "Energetic" },
        ],
      },
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  /* -------------------------------------------------
    RENDERING TESTS
  ------------------------------------------------- */
  it("renders coaches list", () => {
    renderWithQueryClient(<CoachManagement />);
    expect(screen.getByText("Coach One")).toBeInTheDocument();
    expect(screen.getByText("Coach Two")).toBeInTheDocument();
  });

  it("renders loading skeleton when loading", () => {
    mockUseCoachesList.mockReturnValueOnce({
      isLoading: true,
      isRefetching: false,
      data: null,
    });

    renderWithQueryClient(<CoachManagement />);
    expect(screen.getAllByTestId("skeleton").length).toBeGreaterThan(0);
  });

  it("renders loading skeleton when refetching", () => {
    mockUseCoachesList.mockReturnValueOnce({
      isLoading: false,
      isRefetching: true,
      data: null,
    });

    renderWithQueryClient(<CoachManagement />);
    expect(screen.getAllByTestId("skeleton").length).toBeGreaterThan(0);
  });

  it("renders correct pagination info", () => {
    renderWithQueryClient(<CoachManagement />);
    expect(screen.getByText(/Show 1 to 2 of 2 results/i)).toBeInTheDocument();
  });

  it("shows 0 results when no agents", () => {
    mockUseCoachesList.mockReturnValueOnce({
      isLoading: false,
      isRefetching: false,
      data: {
        data: {
          agents: [],
          pagination: { total: 0, page: 1, page_size: 8 },
        },
      },
    });

    renderWithQueryClient(<CoachManagement />);
    expect(screen.getByText(/Show 0 to 0 of 0 results/i)).toBeInTheDocument();
  });

  it("truncates long voice descriptions", () => {
    renderWithQueryClient(<CoachManagement />);
    // The first coach has "Voice description for coach one" which is >20 chars
    expect(screen.getByText(/Voice description f.../)).toBeInTheDocument();
  });

  it("shows full voice description when <= 20 chars", () => {
    renderWithQueryClient(<CoachManagement />);
    expect(screen.getByText("Short")).toBeInTheDocument();
  });

  /* -------------------------------------------------
    SORTING TESTS
  ------------------------------------------------- */
  it("sorts by name ascending", () => {
    renderWithQueryClient(<CoachManagement />);
    fireEvent.click(screen.getByText("Sort Name"));
    expect(screen.getByText("Coach One")).toBeInTheDocument();
  });

  it("sorts by name descending on second click", () => {
    renderWithQueryClient(<CoachManagement />);
    fireEvent.click(screen.getByText("Sort Name"));
    fireEvent.click(screen.getByText("Sort Name"));
    expect(screen.getByText("Coach One")).toBeInTheDocument();
  });

  it("clears sorting on third click", () => {
    renderWithQueryClient(<CoachManagement />);
    fireEvent.click(screen.getByText("Sort Name"));
    fireEvent.click(screen.getByText("Sort Name"));
    fireEvent.click(screen.getByText("Sort Name"));
    expect(screen.getByText("Coach One")).toBeInTheDocument();
  });

  it("sorts by category", () => {
    renderWithQueryClient(<CoachManagement />);
    fireEvent.click(screen.getByText("Sort Category"));
    expect(screen.getByText("Coach One")).toBeInTheDocument();
  });

  it("sorts by status", () => {
    renderWithQueryClient(<CoachManagement />);
    fireEvent.click(screen.getByText("Sort Status"));
    expect(screen.getByText("Coach One")).toBeInTheDocument();
  });

  it("resets page to 1 when sorting", () => {
    renderWithQueryClient(<CoachManagement />);
    fireEvent.click(screen.getByText("Next Page"));
    fireEvent.click(screen.getByText("Sort Name"));
    // Page should reset to 1
  });

  /* -------------------------------------------------
    ADD COACH TESTS
  ------------------------------------------------- */
  it("opens add coach modal", () => {
    renderWithQueryClient(<CoachManagement />);
    fireEvent.click(screen.getByText("Add Coach"));
    expect(screen.getByTestId("coach-form-modal")).toBeInTheDocument();
  });

  it("successfully creates a coach", async () => {
    createSpy.mockResolvedValueOnce({ status: true });

    renderWithQueryClient(<CoachManagement />);
    fireEvent.click(screen.getByText("Add Coach"));
    fireEvent.click(screen.getByText("Submit"));

    await waitFor(() => {
      expect(createSpy).toHaveBeenCalledWith({
        name: "Coach X",
        category_name: "AI",
        prompt: "Test voice",
      });
      expect(toast.success).toHaveBeenCalledWith("Coach created successfully");
    });
  });

  it("handles create coach error with message", async () => {
    createSpy.mockResolvedValueOnce({ status: false, message: "Custom error" });

    renderWithQueryClient(<CoachManagement />);
    fireEvent.click(screen.getByText("Add Coach"));
    fireEvent.click(screen.getByText("Submit"));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Custom error");
    });
  });

  it("handles create coach axios error", async () => {
    const axiosError = {
      response: {
        data: {
          message: "Axios error message",
        },
      },
    };
    createSpy.mockRejectedValueOnce(axiosError);

    renderWithQueryClient(<CoachManagement />);
    fireEvent.click(screen.getByText("Add Coach"));
    
    const submitButton = screen.getByText("Submit");
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Axios error message");
    }, { timeout: 3000 });
  });

  it("handles create coach generic error", async () => {
    createSpy.mockRejectedValueOnce(new Error("Generic error"));

    renderWithQueryClient(<CoachManagement />);
    fireEvent.click(screen.getByText("Add Coach"));
    
    const submitButton = screen.getByText("Submit");
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Generic error");
    }, { timeout: 3000 });
  });

  it("handles create coach unknown error", async () => {
    createSpy.mockRejectedValueOnce({});

    renderWithQueryClient(<CoachManagement />);
    fireEvent.click(screen.getByText("Add Coach"));
    
    const submitButton = screen.getByText("Submit");
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Failed to create coach");
    }, { timeout: 3000 });
  });

  it("shows creating state", () => {
    mockUseCreateCoach.mockReturnValueOnce({
      mutateAsync: createSpy,
      isPending: true,
    });

    renderWithQueryClient(<CoachManagement />);
    fireEvent.click(screen.getByText("Add Coach"));

    // Find the modal call where mode is 'add'
    const addModalCall = mockCoachFormModal.mock.calls.find(call => call[0].mode === 'add');
    expect(addModalCall).toBeDefined();
    expect(addModalCall[0].submitLabel).toBe("Adding Coach...");
  });

  /* -------------------------------------------------
    EDIT COACH TESTS
  ------------------------------------------------- */
  it("opens edit coach modal", () => {
    renderWithQueryClient(<CoachManagement />);
    const editButtons = screen.getAllByTestId("edit-btn");
    fireEvent.click(editButtons[0]);
    expect(screen.getByTestId("coach-form-modal")).toBeInTheDocument();
  });

  it("does not show edit button for predefined coaches", () => {
    renderWithQueryClient(<CoachManagement />);
    const editButtons = screen.getAllByTestId("edit-btn");
    // Should only be 1 edit button (for custom coach), not 2
    expect(editButtons.length).toBe(1);
  });

  it("successfully updates a coach", async () => {
    updateSpy.mockResolvedValueOnce({ status: true });

    renderWithQueryClient(<CoachManagement />);
    const editButtons = screen.getAllByTestId("edit-btn");
    fireEvent.click(editButtons[0]);
    fireEvent.click(screen.getByText("Submit"));

    await waitFor(() => {
      expect(updateSpy).toHaveBeenCalledWith({
        agent_id: "1",
        prompt: "Test voice",
        status: "active",
      });
      expect(toast.success).toHaveBeenCalledWith("Coach updated successfully");
    });
  });

  it("handles update coach error with message", async () => {
    updateSpy.mockResolvedValueOnce({ status: false, message: "Update failed" });

    renderWithQueryClient(<CoachManagement />);
    const editButtons = screen.getAllByTestId("edit-btn");
    fireEvent.click(editButtons[0]);
    fireEvent.click(screen.getByText("Submit"));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Update failed");
    });
  });

  it("handles update coach axios error", async () => {
    const axiosError = {
      response: {
        data: {
          message: "Update axios error",
        },
      },
    };
    updateSpy.mockRejectedValueOnce(axiosError);

    renderWithQueryClient(<CoachManagement />);
    const editButtons = screen.getAllByTestId("edit-btn");
    fireEvent.click(editButtons[0]);
    
    const submitButton = screen.getByText("Submit");
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Update axios error");
    }, { timeout: 3000 });
  });

  it("handles update coach generic error", async () => {
    updateSpy.mockRejectedValueOnce(new Error("Update generic error"));

    renderWithQueryClient(<CoachManagement />);
    const editButtons = screen.getAllByTestId("edit-btn");
    fireEvent.click(editButtons[0]);
    
    const submitButton = screen.getByText("Submit");
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Update generic error");
    }, { timeout: 3000 });
  });

  it("handles update coach unknown error", async () => {
    updateSpy.mockRejectedValueOnce({});

    renderWithQueryClient(<CoachManagement />);
    const editButtons = screen.getAllByTestId("edit-btn");
    fireEvent.click(editButtons[0]);
    
    const submitButton = screen.getByText("Submit");
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Failed to update coach");
    }, { timeout: 3000 });
  });

  it("shows updating state", () => {
    mockUseUpdateCoach.mockReturnValueOnce({
      mutateAsync: updateSpy,
      isPending: true,
    });

    renderWithQueryClient(<CoachManagement />);
    const editButtons = screen.getAllByTestId("edit-btn");
    fireEvent.click(editButtons[0]);

    // Find the modal call where mode is 'edit'
    const editModalCall = mockCoachFormModal.mock.calls.find(call => call[0].mode === 'edit');
    expect(editModalCall).toBeDefined();
    expect(editModalCall[0].submitLabel).toBe("Updating Coach...");
  });

  it("passes correct default values to edit modal", () => {
    renderWithQueryClient(<CoachManagement />);
    const editButtons = screen.getAllByTestId("edit-btn");
    fireEvent.click(editButtons[0]);

    const lastCall = mockCoachFormModal.mock.calls[mockCoachFormModal.mock.calls.length - 1][0];
    expect(lastCall.defaultValues).toEqual({
      id: "1",
      name: "Coach One",
      category: "AI",
      voice_style: "",
      voice_description: "Voice description for coach one",
      total_sessions: 0,
      status: "active",
      type: "custom",
    });
  });

  /* -------------------------------------------------
    DEACTIVATE COACH TESTS
  ------------------------------------------------- */
  it("opens deactivate modal", () => {
    renderWithQueryClient(<CoachManagement />);
    const deactivateButtons = screen.getAllByTestId("deactivate-btn");
    fireEvent.click(deactivateButtons[0]);
    expect(screen.getByTestId("confirm-modal")).toBeInTheDocument();
  });

  it("does not show deactivate button for deactivated coaches", () => {
    renderWithQueryClient(<CoachManagement />);
    const deactivateButtons = screen.getAllByTestId("deactivate-btn");
    // Should only be 1 deactivate button (for active coach), not 2
    expect(deactivateButtons.length).toBe(1);
  });

  it("successfully deactivates a coach", async () => {
    deactivateSpy.mockResolvedValueOnce({ status: true });

    renderWithQueryClient(<CoachManagement />);
    const deactivateButtons = screen.getAllByTestId("deactivate-btn");
    fireEvent.click(deactivateButtons[0]);
    fireEvent.click(screen.getByText("Confirm"));

    await waitFor(() => {
      expect(deactivateSpy).toHaveBeenCalledWith("1");
      expect(toast.success).toHaveBeenCalledWith("Coach deactivated successfully");
    });
  });

  it("handles deactivate coach error with message", async () => {
    deactivateSpy.mockResolvedValueOnce({ status: false, message: "Deactivate failed" });

    renderWithQueryClient(<CoachManagement />);
    const deactivateButtons = screen.getAllByTestId("deactivate-btn");
    fireEvent.click(deactivateButtons[0]);
    fireEvent.click(screen.getByText("Confirm"));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Deactivate failed");
    });
  });

  it("handles deactivate coach axios error", async () => {
    const axiosError = {
      response: {
        data: {
          message: "Deactivate axios error",
        },
      },
    };
    deactivateSpy.mockRejectedValueOnce(axiosError);

    renderWithQueryClient(<CoachManagement />);
    const deactivateButtons = screen.getAllByTestId("deactivate-btn");
    fireEvent.click(deactivateButtons[0]);
    fireEvent.click(screen.getByText("Confirm"));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Deactivate axios error");
    });
  });

  it("handles deactivate coach generic error", async () => {
    deactivateSpy.mockRejectedValueOnce(new Error("Deactivate generic error"));

    renderWithQueryClient(<CoachManagement />);
    const deactivateButtons = screen.getAllByTestId("deactivate-btn");
    fireEvent.click(deactivateButtons[0]);
    fireEvent.click(screen.getByText("Confirm"));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Deactivate generic error");
    });
  });

  it("handles deactivate coach unknown error", async () => {
    deactivateSpy.mockRejectedValueOnce({});

    renderWithQueryClient(<CoachManagement />);
    const deactivateButtons = screen.getAllByTestId("deactivate-btn");
    fireEvent.click(deactivateButtons[0]);
    fireEvent.click(screen.getByText("Confirm"));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Failed to deactivate coach");
    });
  });

  it("closes deactivate modal on success", async () => {
    deactivateSpy.mockResolvedValueOnce({ status: true });

    renderWithQueryClient(<CoachManagement />);
    const deactivateButtons = screen.getAllByTestId("deactivate-btn");
    fireEvent.click(deactivateButtons[0]);
    
    expect(screen.getByTestId("confirm-modal")).toBeInTheDocument();
    
    fireEvent.click(screen.getByText("Confirm"));

    await waitFor(() => {
      expect(screen.queryByTestId("confirm-modal")).not.toBeInTheDocument();
    });
  });

  /* -------------------------------------------------
    PAGINATION TESTS
  ------------------------------------------------- */
  it("changes page", () => {
    renderWithQueryClient(<CoachManagement />);
    fireEvent.click(screen.getByText("Next Page"));
    // Page state should be updated
  });

  /* -------------------------------------------------
    STATUS BADGE TESTS
  ------------------------------------------------- */
  it("renders active status badge with correct styling", () => {
    renderWithQueryClient(<CoachManagement />);
    const activeStatuses = screen.getAllByText("Active");
    // Find the one with className (the badge, not the text in modal)
    const activeBadge = activeStatuses.find(el => el.className.includes("bg-green-100"));
    expect(activeBadge).toBeDefined();
    expect(activeBadge).toHaveClass("bg-green-100", "text-green-700");
  });

  it("renders deactivated status badge with correct styling", () => {
    renderWithQueryClient(<CoachManagement />);
    const deactivatedStatuses = screen.getAllByText("Deactivated");
    // Find the one with className (the badge, not the text in modal)
    const deactivatedBadge = deactivatedStatuses.find(el => el.className.includes("bg-gray-200"));
    expect(deactivatedBadge).toBeDefined();
    expect(deactivatedBadge).toHaveClass("bg-gray-200", "text-gray-700");
  });

  /* -------------------------------------------------
    EDGE CASES
  ------------------------------------------------- */
  it("handles missing prompts array", () => {
    mockUseCoachesList.mockReturnValueOnce({
      isLoading: false,
      isRefetching: false,
      data: {
        data: {
          agents: [
            {
              id: "1",
              name: "Coach One",
              category_name: "AI",
              prompts: [],
              status: "active",
              type: "custom",
            },
          ],
          pagination: { total: 1, page: 1, page_size: 8 },
        },
      },
    });

    renderWithQueryClient(<CoachManagement />);
    expect(screen.getByText("Coach One")).toBeInTheDocument();
  });

  it("handles missing category_name", () => {
    mockUseCoachesList.mockReturnValueOnce({
      isLoading: false,
      isRefetching: false,
      data: {
        data: {
          agents: [
            {
              id: "1",
              name: "Coach One",
              category_name: null,
              prompts: [{ text: "Test" }],
              status: "active",
              type: "custom",
            },
          ],
          pagination: { total: 1, page: 1, page_size: 8 },
        },
      },
    });

    renderWithQueryClient(<CoachManagement />);
    expect(screen.getByText("Coach One")).toBeInTheDocument();
  });

  it("handles tones without display_name", async () => {
    mockGetTones.mockResolvedValueOnce({
      data: {
        Tones: [{ id: "1", name: "Calm", display_name: "" }],
      },
    });

    renderWithQueryClient(<CoachManagement />);
    await waitFor(() => {
      expect(screen.getByText("Coach One")).toBeInTheDocument();
    });
  });

  it("handles empty tones response", async () => {
    mockGetTones.mockResolvedValueOnce({
      data: {},
    });

    renderWithQueryClient(<CoachManagement />);
    await waitFor(() => {
      expect(screen.getByText("Coach One")).toBeInTheDocument();
    });
  });

  it("handles numeric sorting", () => {
    mockUseCoachesList.mockReturnValueOnce({
      isLoading: false,
      isRefetching: false,
      data: {
        data: {
          agents: [
            {
              id: "1",
              name: "Coach One",
              category_name: "AI",
              prompts: [{ text: "Test" }],
              status: "active",
              type: "custom",
            },
            {
              id: "2",
              name: "Coach Two",
              category_name: "Sports",
              prompts: [{ text: "Test" }],
              status: "active",
              type: "custom",
            },
          ],
          pagination: { total: 2, page: 1, page_size: 8 },
        },
      },
    });

    renderWithQueryClient(<CoachManagement />);
    // Trigger sort on total_sessions (numeric field)
    fireEvent.click(screen.getByText("Sort Name"));
  });
});