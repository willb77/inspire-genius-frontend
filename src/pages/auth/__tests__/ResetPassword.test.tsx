/**
 * @jest-environment jsdom
 *
 * Test Suite: ResetPassword Component
 *
 * Covers:
 *  • Rendering of layout, header, fields
 *  • Client-side validation (required fields, matching passwords)
 *  • Proper API payload sent to resetPassword mutation
 *  • Redirecting after successful reset
 *  • Handling missing reset token
 */

import { render, screen, fireEvent, act } from "@testing-library/react";
import ResetPassword from "../ResetPassword";
import { MemoryRouter } from "react-router-dom";

/* -------------------------------------------------------------------
   MOCK: AuthLayout wrapper
------------------------------------------------------------------- */
jest.mock("@/components/auth/AuthLayout", () => ({
  __esModule: true,
  default: ({ children }: any) => <div>{children}</div>,
}));

/* -------------------------------------------------------------------
   MOCK: AuthHeader (render title + subtitle)
------------------------------------------------------------------- */
jest.mock("@/components/auth/AuthHeader", () => ({
  __esModule: true,
  default: ({ title, subtitle }: any) => (
    <h1>
      {title}
      <span>{subtitle}</span>
    </h1>
  ),
}));

/* -------------------------------------------------------------------
   MOCK: PasswordField component
   - Simplified input behavior for testing
   - Displays validation error text when provided
------------------------------------------------------------------- */
jest.mock("@/components/shared/inputs/PasswordField", () => ({
  __esModule: true,
  default: ({ placeholder, error, ...props }: any) => (
    <div>
      <input aria-label={placeholder} placeholder={placeholder} {...props} />
      {error && <p>{error}</p>}
    </div>
  ),
}));

/* -------------------------------------------------------------------
   MOCK: Button component
------------------------------------------------------------------- */
jest.mock("@/components/ui/button", () => ({
  Button: ({ children, ...props }: any) => (
    <button {...props}>{children}</button>
  ),
}));

/* -------------------------------------------------------------------
   MOCK: useResetPassword hook
   - Controls API request behavior
------------------------------------------------------------------- */
const mockMutateAsync = jest.fn();

jest.mock("@/hooks/auth/useResetPassword", () => ({
  useResetPassword: () => ({
    mutateAsync: mockMutateAsync,
    isPending: false,
  }),
}));

/* -------------------------------------------------------------------
   MOCK: useNavigate + URL search params (token)
------------------------------------------------------------------- */
const mockNavigate = jest.fn();

jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => mockNavigate,
  useSearchParams: () => [
    new URLSearchParams({ token: "resetToken123" }), // Default test token
  ],
}));

/* -------------------------------------------------------------------
   MOCK: ROUTES
------------------------------------------------------------------- */
jest.mock("@/constants/routes", () => ({
  ROUTES: { LOGIN: "/login" },
}));

/* -------------------------------------------------------------------
   Shared test setup helper
------------------------------------------------------------------- */
describe("ResetPassword Component", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const renderComponent = () =>
    render(
      <MemoryRouter>
        <ResetPassword />
      </MemoryRouter>
    );

  /* -------------------------------------------------------------------
     RENDERING TESTS
  ------------------------------------------------------------------- */

  test("renders title", () => {
    renderComponent();

    const heading = screen.getByRole("heading", {
      name: /reset password/i,
    });

    expect(heading).toBeInTheDocument();
  });

  /* -------------------------------------------------------------------
     CLIENT-SIDE VALIDATION TESTS
  ------------------------------------------------------------------- */

  test("shows validation when new password empty", async () => {
    renderComponent();

    // Click submit without entering password
    await act(async () =>
      fireEvent.click(screen.getByRole("button", { name: /reset password/i }))
    );

    expect(screen.getByText("New password is required")).toBeInTheDocument();
  });

  test("shows error when confirm password does not match", async () => {
    renderComponent();

    // Enter valid new password
    fireEvent.change(screen.getByLabelText("Enter New Password"), {
      target: { value: process.env.FAKE_TEST_VALID_PASSWORD as string },
    });

    // Enter mismatching confirm password
    fireEvent.change(screen.getByLabelText("Confirm New Password"), {
      target: { value: "WrongPassword" },
    });

    // Submit form
    await act(async () =>
      fireEvent.click(screen.getByRole("button", { name: /reset password/i }))
    );

    expect(screen.getByText("Passwords do not match")).toBeInTheDocument();
  });

  /* -------------------------------------------------------------------
     API CALL TEST
     Ensures correct payload is passed to mutateAsync()
  ------------------------------------------------------------------- */

  test("calls mutateAsync with correct payload when valid", async () => {
    renderComponent();

    // Fill new + confirm password
    fireEvent.change(screen.getByLabelText("Enter New Password"), {
      target: { value: process.env.FAKE_TEST_VALID_PASSWORD as string },
    });

    fireEvent.change(screen.getByLabelText("Confirm New Password"), {
      target: { value: process.env.FAKE_TEST_VALID_PASSWORD as string },
    });

    // Submit form
    await act(async () =>
      fireEvent.click(screen.getByRole("button", { name: /reset password/i }))
    );

    expect(mockMutateAsync).toHaveBeenCalledWith(
      {
        reset_token: "resetToken123",
        new_password: process.env.FAKE_TEST_VALID_PASSWORD as string,
        confirm_password: process.env.FAKE_TEST_VALID_PASSWORD as string,
      },
      expect.any(Object) // options containing onSuccess callback
    );
  });

  /* -------------------------------------------------------------------
     SUCCESS FLOW TEST
     Ensures redirect happens when API succeeds
  ------------------------------------------------------------------- */

  test("redirects to login on success", async () => {
    // Simulate successful API response by triggering onSuccess in mutateAsync
    mockMutateAsync.mockImplementation(async (_, { onSuccess }) => {
      onSuccess();
    });

    renderComponent();

    fireEvent.change(screen.getByLabelText("Enter New Password"), {
      target: { value: process.env.FAKE_TEST_VALID_PASSWORD as string },
    });

    fireEvent.change(screen.getByLabelText("Confirm New Password"), {
      target: { value: process.env.FAKE_TEST_VALID_PASSWORD as string },
    });

    await act(async () =>
      fireEvent.click(screen.getByRole("button", { name: /reset password/i }))
    );

    // Should navigate to login
    expect(mockNavigate).toHaveBeenCalledWith("/login");
  });

  /* -------------------------------------------------------------------
     EDGE CASE
     Should NOT call API when token missing from URL
  ------------------------------------------------------------------- */

  test("does not call API if token missing", async () => {
    // Override useSearchParams to return no token
    jest.spyOn(require("react-router-dom"), "useSearchParams").mockReturnValue([
      new URLSearchParams({}),
    ]);

    renderComponent();

    fireEvent.change(screen.getByLabelText("Enter New Password"), {
      target: { value: process.env.FAKE_TEST_VALID_PASSWORD as string },
    });

    fireEvent.change(screen.getByLabelText("Confirm New Password"), {
      target: { value: process.env.FAKE_TEST_VALID_PASSWORD as string },
    });

    await act(async () =>
      fireEvent.click(screen.getByRole("button", { name: /reset password/i }))
    );

    expect(mockMutateAsync).not.toHaveBeenCalled();
  });
});
