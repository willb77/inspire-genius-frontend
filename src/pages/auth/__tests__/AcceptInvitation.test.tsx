import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { BrowserRouter } from "react-router-dom";
import AcceptInvitation from "../AcceptInvitation";
import { ROUTES } from "@/constants/routes";

import { TextEncoder, TextDecoder } from "util";
global.TextEncoder = TextEncoder  as any;
global.TextDecoder = TextDecoder as any;

const mockNavigate = jest.fn();
const mockSearchParams = new URLSearchParams();

jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => mockNavigate,
  useSearchParams: () => [mockSearchParams],
}));

jest.mock("sonner", () => ({
  toast: {
    error: jest.fn(),
    success: jest.fn(),
  },
}));

const mockMutateAsync = jest.fn();
const mockUseAcceptInvitation = {
  mutateAsync: mockMutateAsync,
  isPending: false,
};

jest.mock("@/hooks/auth/useAcceptInvitation", () => ({
  useAcceptInvitation: () => mockUseAcceptInvitation,
}));

jest.mock("@/components/auth/AuthLayout", () => ({
  __esModule: true,
  default: ({ children }: any) => <div data-testid="auth-layout">{children}</div>,
}));

jest.mock("@/components/auth/AuthHeader", () => ({
  __esModule: true,
  default: ({ title, subtitle }: any) => (
    <div data-testid="auth-header">
      <h1>{title}</h1>
      <p>{subtitle}</p>
    </div>
  ),
}));

jest.mock("@/components/shared/inputs/PasswordField", () => ({
  __esModule: true,
  default: ({ placeholder, value, onChange }: any) => (
    <input
      type="password"
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      data-testid={placeholder}
    />
  ),
}));

const renderComponent = () => {
  return render(
    <BrowserRouter>
      <AcceptInvitation />
    </BrowserRouter>
  );
};

// ------------ TESTS ------------

describe("AcceptInvitation Component", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSearchParams.delete("token");
  });

  describe("Rendering", () => {
    test("renders AuthLayout component", () => {
      renderComponent();
      expect(screen.getByTestId("auth-layout")).toBeInTheDocument();
    });

    test("renders AuthHeader with correct props", () => {
      renderComponent();
      expect(screen.getByText("Accept Invitation")).toBeInTheDocument();
      expect(screen.getByText("Create your password to continue")).toBeInTheDocument();
    });

    test("renders both password fields", () => {
      renderComponent();
      expect(screen.getByPlaceholderText("Enter New Password")).toBeInTheDocument();
      expect(screen.getByPlaceholderText("Confirm New Password")).toBeInTheDocument();
    });

    test("renders submit button", () => {
      renderComponent();
      expect(screen.getByRole("button", { name: /set password/i })).toBeInTheDocument();
    });

    test("renders login link", () => {
      renderComponent();
      const loginLink = screen.getByRole("link", { name: /log in/i });
      expect(loginLink).toBeInTheDocument();
      expect(loginLink).toHaveAttribute("href", ROUTES.LOGIN);
    });

    test("displays 'Already have an account?' text", () => {
      renderComponent();
      expect(screen.getByText(/already have an account\?/i)).toBeInTheDocument();
    });
  });

  describe("Form Validation", () => {
    test("submit button is disabled initially", () => {
      renderComponent();
      const submitButton = screen.getByRole("button", { name: /set password/i });
      expect(submitButton).toBeDisabled();
    });

    test("shows validation error for missing uppercase", () => {
      renderComponent();
      const passwordInput = screen.getByPlaceholderText("Enter New Password");

      fireEvent.change(passwordInput, { target: { value: "password123!" } });
      fireEvent.focus(passwordInput);

      expect(screen.getByText(/at least one uppercase/i)).toBeInTheDocument();
    });

    test("shows validation error for missing lowercase", () => {
      renderComponent();
      const passwordInput = screen.getByPlaceholderText("Enter New Password");

      fireEvent.change(passwordInput, { target: { value: "PASSWORD123!" } });
      fireEvent.focus(passwordInput);

      expect(screen.getByText(/at least one lowercase/i)).toBeInTheDocument();
    });

    test("shows validation error for missing number", () => {
      renderComponent();
      const passwordInput = screen.getByPlaceholderText("Enter New Password");

      fireEvent.change(passwordInput, { target: { value: "Password!" } });
      fireEvent.focus(passwordInput);

      expect(screen.getByText(/at least one number/i)).toBeInTheDocument();
    });

    test("shows validation error for missing special character", () => {
      renderComponent();
      const passwordInput = screen.getByPlaceholderText("Enter New Password");

      fireEvent.change(passwordInput, { target: { value: "Password123" } });
      fireEvent.focus(passwordInput);

      expect(screen.getByText(/at least one special/i)).toBeInTheDocument();
    });

    test("shows multiple validation errors", () => {
      renderComponent();
      const passwordInput = screen.getByPlaceholderText("Enter New Password");

      fireEvent.change(passwordInput, { target: { value: "pass" } });
      fireEvent.focus(passwordInput);

      expect(screen.getByText(/at least one uppercase, number, special/i)).toBeInTheDocument();
    });

    test("hides validation errors when password meets requirements", () => {
      renderComponent();
      const passwordInput = screen.getByPlaceholderText("Enter New Password");

      fireEvent.change(passwordInput, { target: { value: "Password123!" } });
      fireEvent.focus(passwordInput);

      expect(screen.queryByText(/at least one/i)).not.toBeInTheDocument();
    });

    test("shows error when passwords do not match", () => {
      renderComponent();
      const newPasswordInput = screen.getByPlaceholderText("Enter New Password");
      const confirmPasswordInput = screen.getByPlaceholderText("Confirm New Password");

      fireEvent.change(newPasswordInput, { target: { value: "Password123!" } });
      fireEvent.change(confirmPasswordInput, { target: { value: "Different123!" } });

      expect(screen.getByText("Passwords do not match")).toBeInTheDocument();
    });

    test("hides mismatch error when passwords match", () => {
      renderComponent();
      const newPasswordInput = screen.getByPlaceholderText("Enter New Password");
      const confirmPasswordInput = screen.getByPlaceholderText("Confirm New Password");

      fireEvent.change(newPasswordInput, { target: { value: "Password123!" } });
      fireEvent.change(confirmPasswordInput, { target: { value: "Password123!" } });

      expect(screen.queryByText("Passwords do not match")).not.toBeInTheDocument();
    });

    test("enables submit button when all validations pass", () => {
      renderComponent();
      const newPasswordInput = screen.getByPlaceholderText("Enter New Password");
      const confirmPasswordInput = screen.getByPlaceholderText("Confirm New Password");

      fireEvent.change(newPasswordInput, { target: { value: "Password123!" } });
      fireEvent.change(confirmPasswordInput, { target: { value: "Password123!" } });

      const submitButton = screen.getByRole("button", { name: /set password/i });
      expect(submitButton).not.toBeDisabled();
    });
  });

  describe("Password Validation Rules", () => {
    test("accepts password with all required characters", () => {
      renderComponent();
      const passwordInput = screen.getByPlaceholderText("Enter New Password");

      fireEvent.change(passwordInput, { target: { value: "MyP@ssw0rd!" } });
      fireEvent.focus(passwordInput);

      expect(screen.queryByText(/at least one/i)).not.toBeInTheDocument();
    });

    test("validates uppercase requirement", () => {
      renderComponent();
      const passwordInput = screen.getByPlaceholderText("Enter New Password");

      fireEvent.change(passwordInput, { target: { value: "password123!" } });
      fireEvent.focus(passwordInput);

      expect(screen.getByText(/uppercase/i)).toBeInTheDocument();
    });

    test("validates lowercase requirement", () => {
      renderComponent();
      const passwordInput = screen.getByPlaceholderText("Enter New Password");

      fireEvent.change(passwordInput, { target: { value: "PASSWORD123!" } });
      fireEvent.focus(passwordInput);

      expect(screen.getByText(/lowercase/i)).toBeInTheDocument();
    });

    test("accepts various special characters", () => {
      const specialChars = ["!", "@", "#", "$", "%", "^", "&", "*"];

      specialChars.forEach((char) => {
        const { unmount } = renderComponent();
        const passwordInput = screen.getByPlaceholderText("Enter New Password");

        fireEvent.change(passwordInput, { target: { value: `Password123${char}` } });
        fireEvent.focus(passwordInput);

        expect(screen.queryByText(/special/i)).not.toBeInTheDocument();
        unmount();
      });
    });
  });

  describe("Form Submission", () => {
    test("shows error when token is missing", async () => {
      const { toast } = require("sonner");
      renderComponent();

      const newPasswordInput = screen.getByPlaceholderText("Enter New Password");
      const confirmPasswordInput = screen.getByPlaceholderText("Confirm New Password");

      fireEvent.change(newPasswordInput, { target: { value: "Password123!" } });
      fireEvent.change(confirmPasswordInput, { target: { value: "Password123!" } });

      const submitButton = screen.getByRole("button", { name: /set password/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Invalid or missing invitation token");
      });
    });

    test("submits form with valid token and password", async () => {
      mockSearchParams.set("token", "valid-token-123");
      mockMutateAsync.mockResolvedValue({ status: true });

      renderComponent();

      const newPasswordInput = screen.getByPlaceholderText("Enter New Password");
      const confirmPasswordInput = screen.getByPlaceholderText("Confirm New Password");

      fireEvent.change(newPasswordInput, { target: { value: "Password123!" } });
      fireEvent.change(confirmPasswordInput, { target: { value: "Password123!" } });

      const submitButton = screen.getByRole("button", { name: /set password/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalledWith({
          invitation_token: "valid-token-123",
          new_password: "Password123!",
        });
      });
    });

    test("navigates to login on successful submission", async () => {
      mockSearchParams.set("token", "valid-token-123");
      mockMutateAsync.mockResolvedValue({ status: true });

      renderComponent();

      const newPasswordInput = screen.getByPlaceholderText("Enter New Password");
      const confirmPasswordInput = screen.getByPlaceholderText("Confirm New Password");

      fireEvent.change(newPasswordInput, { target: { value: "Password123!" } });
      fireEvent.change(confirmPasswordInput, { target: { value: "Password123!" } });

      const submitButton = screen.getByRole("button", { name: /set password/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith(ROUTES.LOGIN, { replace: true });
      });
    });

    test("handles submission with success flag", async () => {
      mockSearchParams.set("token", "valid-token-123");
      mockMutateAsync.mockResolvedValue({ success: true });

      renderComponent();

      const newPasswordInput = screen.getByPlaceholderText("Enter New Password");
      const confirmPasswordInput = screen.getByPlaceholderText("Confirm New Password");

      fireEvent.change(newPasswordInput, { target: { value: "Password123!" } });
      fireEvent.change(confirmPasswordInput, { target: { value: "Password123!" } });

      const submitButton = screen.getByRole("button", { name: /set password/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith(ROUTES.LOGIN, { replace: true });
      });
    });

    test("does not navigate when submission fails", async () => {
      mockSearchParams.set("token", "valid-token-123");
      mockMutateAsync.mockResolvedValue({ status: false });

      renderComponent();

      const newPasswordInput = screen.getByPlaceholderText("Enter New Password");
      const confirmPasswordInput = screen.getByPlaceholderText("Confirm New Password");

      fireEvent.change(newPasswordInput, { target: { value: "Password123!" } });
      fireEvent.change(confirmPasswordInput, { target: { value: "Password123!" } });

      const submitButton = screen.getByRole("button", { name: /set password/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalled();
      });

      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  describe("Loading State", () => {
    test("shows 'Saving...' text when submitting", () => {
      mockUseAcceptInvitation.isPending = true;

      renderComponent();

      expect(screen.getByRole("button", { name: /saving/i })).toBeInTheDocument();

      mockUseAcceptInvitation.isPending = false;
    });

    test("disables submit button when pending", () => {
      mockUseAcceptInvitation.isPending = true;

      renderComponent();

      const submitButton = screen.getByRole("button", { name: /saving/i });
      expect(submitButton).toBeDisabled();

      mockUseAcceptInvitation.isPending = false;
    });
  });

  describe("Focus Behavior", () => {
    test("shows validation on focus", () => {
      renderComponent();
      const passwordInput = screen.getByPlaceholderText("Enter New Password");

      fireEvent.change(passwordInput, { target: { value: "weak" } });
      fireEvent.focus(passwordInput);

      expect(screen.getByText(/at least one/i)).toBeInTheDocument();
    });

    test("hides validation on blur when field is empty", () => {
      renderComponent();
      const passwordInput = screen.getByPlaceholderText("Enter New Password");

      fireEvent.focus(passwordInput);
      fireEvent.blur(passwordInput);

      expect(screen.queryByText(/at least one/i)).not.toBeInTheDocument();
    });
  });

  describe("Edge Cases", () => {
    test("handles empty password fields", () => {
      renderComponent();
      const submitButton = screen.getByRole("button", { name: /set password/i });
      expect(submitButton).toBeDisabled();
    });

    test("handles only new password filled", () => {
      renderComponent();
      const newPasswordInput = screen.getByPlaceholderText("Enter New Password");

      fireEvent.change(newPasswordInput, { target: { value: "Password123!" } });

      const submitButton = screen.getByRole("button", { name: /set password/i });
      expect(submitButton).toBeDisabled();
    });

    test("handles only confirm password filled", () => {
      renderComponent();
      const confirmPasswordInput = screen.getByPlaceholderText("Confirm New Password");

      fireEvent.change(confirmPasswordInput, { target: { value: "Password123!" } });

      const submitButton = screen.getByRole("button", { name: /set password/i });
      expect(submitButton).toBeDisabled();
    });

    test("handles password change after match", () => {
      renderComponent();
      const newPasswordInput = screen.getByPlaceholderText("Enter New Password");
      const confirmPasswordInput = screen.getByPlaceholderText("Confirm New Password");

      fireEvent.change(newPasswordInput, { target: { value: "Password123!" } });
      fireEvent.change(confirmPasswordInput, { target: { value: "Password123!" } });

      expect(screen.queryByText("Passwords do not match")).not.toBeInTheDocument();

      fireEvent.change(newPasswordInput, { target: { value: "Password123!X" } });

      expect(screen.getByText("Passwords do not match")).toBeInTheDocument();
    });
  });
});