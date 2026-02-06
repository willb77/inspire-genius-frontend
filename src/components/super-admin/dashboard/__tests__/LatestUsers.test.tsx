import { render, screen, fireEvent } from "@testing-library/react";
import LatestUsers from "../LatestUsers";
import { useUserManagement } from "@/hooks/super-admin/user-management/useUserManagement";

/* ------------------------------------------------------------------
 * MOCK HOOK
 * ------------------------------------------------------------------ */
jest.mock("@/hooks/super-admin/user-management/useUserManagement", () => ({
  useUserManagement: jest.fn(),
}));

/* ------------------------------------------------------------------
 * MOCK ROUTER
 * ------------------------------------------------------------------ */
const mockNavigate = jest.fn();

jest.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
}));

/* ------------------------------------------------------------------
 * MOCK UI COMPONENTS
 * ------------------------------------------------------------------ */
jest.mock("@/components/ui/card", () => ({
  Card: ({ children }: any) => <div>{children}</div>,
  CardHeader: ({ children }: any) => <div>{children}</div>,
  CardContent: ({ children }: any) => <div>{children}</div>,
  CardTitle: ({ children }: any) => <div>{children}</div>,
}));

jest.mock("@/components/ui/badge", () => ({
  Badge: ({ children }: any) => <span>{children}</span>,
}));

jest.mock("@/components/ui/button", () => ({
  Button: ({ children, onClick }: any) => (
    <button onClick={onClick}>{children}</button>
  ),
}));

jest.mock("@/components/ui/skeleton", () => ({
  Skeleton: () => <div data-testid="skeleton" />,
}));

/* ------------------------------------------------------------------
 * TESTS
 * ------------------------------------------------------------------ */
describe("LatestUsers", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should render loading skeletons while loading", () => {
    (useUserManagement as jest.Mock).mockReturnValue({
      data: undefined,
      isLoading: true,
    });

    render(<LatestUsers />);

    expect(screen.getAllByTestId("skeleton").length).toBeGreaterThan(0);
  });

  it("should render empty state when no users exist", () => {
    (useUserManagement as jest.Mock).mockReturnValue({
      isLoading: false,
      data: {
        data: {
          users: [],
        },
      },
    });

    render(<LatestUsers />);

    expect(screen.getByText("No users found.")).toBeInTheDocument();
  });

  it("should render users list correctly", () => {
    (useUserManagement as jest.Mock).mockReturnValue({
      isLoading: false,
      data: {
        data: {
          users: [
            {
              user_id: "1",
              full_name: "John Doe",
              email: "john@example.com",
              user_status: "active",
              invitation_status: "accepted",
            },
          ],
        },
      },
    });

    render(<LatestUsers />);

    expect(screen.getByText("John Doe")).toBeInTheDocument();
    expect(screen.getByText("john@example.com")).toBeInTheDocument();
    expect(screen.getByText("Accepted")).toBeInTheDocument();
  });

  it("should compute full name from first and last name when full_name is missing", () => {
    (useUserManagement as jest.Mock).mockReturnValue({
      isLoading: false,
      data: {
        data: {
          users: [
            {
              user_id: "2",
              first_name: "Jane",
              last_name: "Smith",
              email: "jane@example.com",
              user_status: "inactive",
              invitation_status: "invitation_sent",
            },
          ],
        },
      },
    });

    render(<LatestUsers />);

    expect(screen.getByText("Jane Smith")).toBeInTheDocument();
    expect(screen.getByText("Invitation Sent")).toBeInTheDocument();
  });

  it("should fallback to email when name fields are missing", () => {
    (useUserManagement as jest.Mock).mockReturnValue({
      isLoading: false,
      data: {
        data: {
          users: [
            {
              user_id: "3",
              email: "fallback@example.com",
              user_status: "inactive",
              invitation_status: "expired",
            },
          ],
        },
      },
    });

    render(<LatestUsers />);

    const matches = screen.getAllByText("fallback@example.com");
    expect(matches.length).toBeGreaterThan(0);

    expect(screen.getByText("Expired")).toBeInTheDocument();
  });

  it('should render "-" for unknown invitation status', () => {
    (useUserManagement as jest.Mock).mockReturnValue({
      isLoading: false,
      data: {
        data: {
          users: [
            {
              user_id: "4",
              full_name: "Unknown User",
              email: "unknown@example.com",
              user_status: "pending",
              invitation_status: "unknown_status",
            },
          ],
        },
      },
    });

    render(<LatestUsers />);

    expect(screen.getByText("-")).toBeInTheDocument();
  });

  it('should navigate to users page when "View all" is clicked', () => {
    (useUserManagement as jest.Mock).mockReturnValue({
      isLoading: false,
      data: {
        data: {
          users: [],
        },
      },
    });

    render(<LatestUsers />);

    fireEvent.click(screen.getByText("View all"));

    expect(mockNavigate).toHaveBeenCalledWith("/super-admin/users");
  });

  it("should render title correctly", () => {
    (useUserManagement as jest.Mock).mockReturnValue({
      isLoading: false,
      data: {
        data: {
          users: [],
        },
      },
    });

    render(<LatestUsers />);

    expect(screen.getByText("Latest Users")).toBeInTheDocument();
  });
});
