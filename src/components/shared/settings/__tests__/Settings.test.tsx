import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import Settings from "../Settings";
import { useMe } from "@/hooks/user/useMe";
import { useChangePassword } from "@/hooks/user/useChangePassword";
import { useUpdateProfile } from "@/hooks/onboarding/useUpdateProfile";
import { useAuth } from "@/context/useAuth";
import { toast } from "sonner";
import { ROLES } from "@/constants/routes";

/* -------------------- MOCKS -------------------- */

// Prevent axios import.meta issues
jest.mock("@/lib/axios", () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  },
}));

jest.mock("@/hooks/user/useMe");
jest.mock("@/hooks/user/useChangePassword");
jest.mock("@/hooks/onboarding/useUpdateProfile");
jest.mock("@/context/useAuth");
jest.mock("sonner");

jest.mock("@/components/shared/SearchBar", () => ({
  __esModule: true,
  default: () => <div data-testid="search-bar">SearchBar</div>,
}));

jest.mock("@/components/settings/AccountSettings", () => ({
  __esModule: true,
  default: (props: any) => (
    <div data-testid="account-settings">
      <button
        data-testid="change-password-btn"
        onClick={() =>
          props.onChangePassword({
            current_password: "old",
            new_password: "new",
            confirm_password: "new",
          })
        }
      >
        Change Password
      </button>

      <button
        data-testid="edit-profile-btn"
        onClick={() =>
          props.onEditProfileSubmit({
            firstName: "John",
            lastName: "Doe",
            email: "john@example.com",
            dateOfBirth: "1990-01-01",
            additionalInfo: "Test info",
          })
        }
      >
        Edit Profile
      </button>

      <button data-testid="logout-btn" onClick={props.onLogout}>
        Logout
      </button>
    </div>
  ),
}));

jest.mock("@/components/settings/NotificationSettings", () => ({
  __esModule: true,
  default: (props: any) => (
    <div data-testid="notification-settings">
      <input
        data-testid="push-notifications"
        type="checkbox"
        checked={props.pushNotifications}
        onChange={(e) => props.onPushNotificationsChange(e.target.checked)}
      />
    </div>
  ),
}));

/* -------------------- TYPED MOCKS -------------------- */

const mockUseMe = useMe as jest.MockedFunction<typeof useMe>;
const mockUseChangePassword =
  useChangePassword as jest.MockedFunction<typeof useChangePassword>;
const mockUseUpdateProfile =
  useUpdateProfile as jest.MockedFunction<typeof useUpdateProfile>;
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockToast = toast as jest.Mocked<typeof toast>;

/* -------------------- WRAPPER -------------------- */

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>{children}</BrowserRouter>
    </QueryClientProvider>
  );
};

/* -------------------- TESTS -------------------- */

describe("Settings Component", () => {
  const mockMarkFullName = jest.fn();
  const mockChangePasswordMutate = jest.fn();
  const mockUpdateProfileMutate = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    window.confirm = jest.fn(() => true);
    window.alert = jest.fn();

    mockUseAuth.mockReturnValue({
      user: { role: ROLES.USER },
      markFullName: mockMarkFullName,
    } as any);

    mockUseMe.mockReturnValue({
      data: {
        data: {
          email: "test@example.com",
          first_name: "Test",
          last_name: "User",
          date_of_birth: "1990-01-01",
          additional_info: "Additional info",
          is_password_change_allowed: true,
          role: ROLES.USER,
        },
      },
      isPending: false,
    } as any);

    mockUseChangePassword.mockReturnValue({
      mutate: mockChangePasswordMutate,
      isPending: false,
    } as any);

    mockUseUpdateProfile.mockReturnValue({
      mutate: mockUpdateProfileMutate,
      isPending: false,
    } as any);

    mockToast.success = jest.fn();
    mockToast.error = jest.fn();
  });

  /* ---------- Rendering ---------- */

  it("renders all sections for USER role", () => {
    render(<Settings />, { wrapper: createWrapper() });

    expect(screen.getByTestId("account-settings")).toBeInTheDocument();
    expect(screen.getByTestId("notification-settings")).toBeInTheDocument();
    expect(screen.getByText("Legal")).toBeInTheDocument();
    expect(screen.getByText("Terms of Use")).toBeInTheDocument();
    expect(screen.getByText("Privacy Policy")).toBeInTheDocument();
  });

  it("hides notification and legal sections for ADMIN", () => {
    mockUseAuth.mockReturnValue({
      user: { role: "ADMIN" },
      markFullName: mockMarkFullName,
    } as any);

    render(<Settings />, { wrapper: createWrapper() });

    expect(screen.getByTestId("account-settings")).toBeInTheDocument();
    expect(screen.queryByTestId("notification-settings")).not.toBeInTheDocument();
    expect(screen.queryByText("Legal")).not.toBeInTheDocument();
  });

  /* ---------- Change Password ---------- */

  it("handles successful password change", async () => {
    mockChangePasswordMutate.mockImplementation((_, options) => {
      options?.onSuccess?.({ message: "Password changed successfully" } as any);
    });

    render(<Settings />, { wrapper: createWrapper() });

    fireEvent.click(screen.getByTestId("change-password-btn"));

    await waitFor(() => {
      expect(mockToast.success).toHaveBeenCalledWith(
        "Password changed successfully"
      );
    });
  });

  it("shows error message on password change failure", async () => {
    mockChangePasswordMutate.mockImplementation((_, options) => {
      options?.onError?.({
        response: { data: { message: "Invalid current password" } },
      } as any);
    });

    render(<Settings />, { wrapper: createWrapper() });

    fireEvent.click(screen.getByTestId("change-password-btn"));

    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith(
        "Invalid current password"
      );
    });
  });

  /* ---------- Edit Profile ---------- */

  it("updates profile successfully", async () => {
    mockUpdateProfileMutate.mockImplementation((_, options) => {
      options?.onSuccess?.({ message: "Profile updated successfully" } as any);
    });

    render(<Settings />, { wrapper: createWrapper() });

    fireEvent.click(screen.getByTestId("edit-profile-btn"));

    await waitFor(() => {
      expect(mockToast.success).toHaveBeenCalledWith(
        "Profile updated successfully"
      );
      expect(mockMarkFullName).toHaveBeenCalledWith("John Doe");
    });
  });

  it("shows error on profile update failure", async () => {
    mockUpdateProfileMutate.mockImplementation((_, options) => {
      options?.onError?.({
        response: { data: { message: "Validation error" } },
      } as any);
    });

    render(<Settings />, { wrapper: createWrapper() });

    fireEvent.click(screen.getByTestId("edit-profile-btn"));

    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith("Validation error");
    });
  });

  /* ---------- Logout ---------- */

  it("logs out after confirmation", () => {
    render(<Settings />, { wrapper: createWrapper() });

    fireEvent.click(screen.getByTestId("logout-btn"));

    expect(window.confirm).toHaveBeenCalled();
    expect(window.alert).toHaveBeenCalledWith("Logged out successfully!");
  });

  it("does not logout if confirmation is cancelled", () => {
    (window.confirm as jest.Mock).mockReturnValue(false);

    render(<Settings />, { wrapper: createWrapper() });

    fireEvent.click(screen.getByTestId("logout-btn"));

    expect(window.alert).not.toHaveBeenCalled();
  });

  /* ---------- Notification Settings ---------- */

  it("toggles push notifications", () => {
    render(<Settings />, { wrapper: createWrapper() });

    const checkbox = screen.getByTestId("push-notifications");
    expect(checkbox).toBeChecked();

    fireEvent.click(checkbox);
    expect(checkbox).not.toBeChecked();
  });

  /* ---------- Legal Links ---------- */

  it("renders legal links correctly", () => {
    render(<Settings />, { wrapper: createWrapper() });

    expect(screen.getByText("Terms of Use")).toHaveAttribute("href", "/");
    expect(screen.getByText("Privacy Policy")).toHaveAttribute(
      "href",
      "/"
    );
  });
});
