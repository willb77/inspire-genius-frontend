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

  attachInterceptors: jest.fn(),

}));

jest.mock("@/lib/agentApi", () => ({
  getApi: () => ({
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  }),
  agentApi: {
    get: jest.fn(),
    defaults: { headers: { common: {} } },
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
            current_password: process.env.FAKE_TEST_CHANGE_PASSWORD_CURRENT_TINY as string,
            new_password: process.env.FAKE_TEST_CHANGE_PASSWORD_NEW_TINY as string,
            confirm_password: process.env.FAKE_TEST_CHANGE_PASSWORD_NEW_TINY as string,
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



jest.mock("@/components/settings/AgentEngineToggle", () => ({
  __esModule: true,
  default: () => <div data-testid="agent-engine-toggle" />,
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

    // The old cosmetic "Push Notifications" card was removed (2026-09-01):
    // its Switch was hard-coded disabled and persisted nothing, and it
    // duplicated the title of the working <NotificationPreferences> card.
    expect(screen.queryByTestId("notification-settings")).not.toBeInTheDocument();

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



  it("no longer renders the disabled duplicate push-notifications card", () => {
    render(<Settings />, { wrapper: createWrapper() });

    // Settings used to show TWO cards titled "Push Notifications": this one,
    // whose Switch was `disabled={true}` and backed by state nothing read,
    // and the real <NotificationPreferences>. Only the working one remains,
    // so there must be exactly one such heading and no dead checkbox.
    expect(screen.queryByTestId("push-notifications")).not.toBeInTheDocument();
    expect(screen.queryByTestId("notification-settings")).not.toBeInTheDocument();
  });




  /* ---------- Agent Engine Routing surface gate ---------- */

  it("hides Agent Engine Routing from a super-admin on a NON-admin surface", () => {
    // The gate used to be role-only, so a super-admin saw this operator
    // diagnostic on /settings, /manager/settings and every other role page —
    // all six mount this same component. Same privileged user, ordinary
    // surface: the tile must not appear.
    mockUseAuth.mockReturnValue({
      user: { role: ROLES.SUPER_ADMIN },
      markFullName: mockMarkFullName,
    } as any);

    render(<Settings />, { wrapper: createWrapper() });

    expect(screen.queryByTestId("agent-engine-toggle")).not.toBeInTheDocument();
  });

  it("shows Agent Engine Routing to a super-admin on the Administration surface", () => {
    mockUseAuth.mockReturnValue({
      user: { role: ROLES.SUPER_ADMIN },
      markFullName: mockMarkFullName,
    } as any);

    render(<Settings surface="administration" />, { wrapper: createWrapper() });

    expect(screen.getByTestId("agent-engine-toggle")).toBeInTheDocument();
  });

  it("never shows Agent Engine Routing to a non-super-admin, even on the admin surface", () => {
    // Belt and braces: the surface prop must not become a way around the
    // role check for anyone who reaches that route.
    mockUseAuth.mockReturnValue({
      user: { role: ROLES.MANAGER },
      markFullName: mockMarkFullName,
    } as any);

    render(<Settings surface="administration" />, { wrapper: createWrapper() });

    expect(screen.queryByTestId("agent-engine-toggle")).not.toBeInTheDocument();
  });

  /* ---------- Legal Links ---------- */



  it("renders legal links correctly", () => {

    render(<Settings />, { wrapper: createWrapper() });



    expect(screen.getByText("Terms of Use")).toHaveAttribute("href", "/terms");

    expect(screen.getByText("Privacy Policy")).toHaveAttribute(

      "href",

      "/privacy"

    );

  });

  /* ---------- V2 surface ---------- */

  it("renders the V2 cream frame + eyebrow header when variant=v2", () => {
    const { container } = render(<Settings variant="v2" />, {
      wrapper: createWrapper(),
    });
    // V2-only eyebrow/serif header — absent in classic.
    expect(screen.getByTestId("settings-v2-header")).toBeInTheDocument();
    // The cream V2Panel page frame carries the bg-panel token.
    expect(container.querySelector(".bg-panel")).toBeInTheDocument();
    // Shared child cards + logic are unchanged in V2.
    expect(screen.getByTestId("account-settings")).toBeInTheDocument();
    // The old cosmetic "Push Notifications" card was removed (2026-09-01):
    // its Switch was hard-coded disabled and persisted nothing, and it
    // duplicated the title of the working <NotificationPreferences> card.
    expect(screen.queryByTestId("notification-settings")).not.toBeInTheDocument();
    expect(screen.getByText("Legal")).toBeInTheDocument();
    expect(screen.getByText("Terms of Use")).toHaveAttribute("href", "/terms");
  });

  it("classic variant has no V2 header or cream frame", () => {
    const { container } = render(<Settings variant="classic" />, {
      wrapper: createWrapper(),
    });
    expect(screen.queryByTestId("settings-v2-header")).not.toBeInTheDocument();
    expect(container.querySelector(".bg-panel")).toBeNull();
    // Classic still renders all the shared sections.
    expect(screen.getByTestId("account-settings")).toBeInTheDocument();
  });

});

