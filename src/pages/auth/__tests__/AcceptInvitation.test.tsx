/**
 * @jest-environment jsdom
 *
 * Test Suite: AcceptInvitation Component
 *
 * Covers:
 *  - Rendering of UI sections and inputs
 *  - Password validation rules (uppercase, lowercase, numbers, specials)
 *  - Confirm-password matching
 *  - Submission logic including missing token, valid token, navigation
 *  - Loading states and disabled button behavior
 *  - Focus/blur validation behavior
 *  - Edge case handling
 */

import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { BrowserRouter } from "react-router-dom";
import AcceptInvitation from "../AcceptInvitation";
import { ROUTES } from "@/constants/routes";

// Polyfill for TextEncoder/Decoder used by some dependencies
import { TextEncoder, TextDecoder } from "util";
global.TextEncoder = TextEncoder as any;
global.TextDecoder = TextDecoder as any;

/* ------------------------------------------------------------------
   MOCKS: React Router navigation + search params (token handling)
-------------------------------------------------------------------*/
const mockNavigate = jest.fn();
const mockSearchParams = new URLSearchParams();

jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => mockNavigate,
  useSearchParams: () => [mockSearchParams],
}));

/* ---------------------------------------
   MOCK: Toast notifications
----------------------------------------*/
jest.mock("sonner", () => ({
  toast: {
    error: jest.fn(),
    success: jest.fn(),
  },
}));

/* ------------------------------------------------------------------
   MOCK: useAcceptInvitation hook (we control mutateAsync + pending)
-------------------------------------------------------------------*/
const mockMutateAsync = jest.fn();
const mockUseAcceptInvitation = {
  mutateAsync: mockMutateAsync,
  isPending: false,
};

jest.mock("@/hooks/auth/useAcceptInvitation", () => ({
  useAcceptInvitation: () => mockUseAcceptInvitation,
}));

/* ------------------------------------------------------------------
   MOCK: AuthLayout, AuthHeader, PasswordField components
-------------------------------------------------------------------*/
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

/* ------------------------------------------------------------------
   Helper: Render component wrapped in BrowserRouter
-------------------------------------------------------------------*/
const renderComponent = () => {
  return render(
    <BrowserRouter>
      <AcceptInvitation />
    </BrowserRouter>
  );
};

/* ==================================================================
   TEST SUITE
===================================================================*/

describe("AcceptInvitation Component", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSearchParams.delete("token"); // Reset token before each test
  });

  /* --------------------------------------------------------------
     RENDERING TESTS: Verifies UI structure is correct
  ---------------------------------------------------------------*/
  describe("Rendering", () => {
    test("renders AuthLayout component", () => {
      renderComponent();
      expect(screen.getByTestId("auth-layout")).toBeInTheDocument();
    });

    test("renders AuthHeader with correct text", () => {
      renderComponent();
      expect(screen.getByText("Accept Invitation")).toBeInTheDocument();
      expect(screen.getByText("Create your password to continue")).toBeInTheDocument();
    });

    test("renders password fields", () => {
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
  });

  /* --------------------------------------------------------------
     FORM VALIDATION: Password rules, matching, enabling submit
  ---------------------------------------------------------------*/
  describe("Form Validation", () => {
    test("submit button disabled initially", () => {
      renderComponent();
      expect(screen.getByRole("button", { name: /set password/i })).toBeDisabled();
    });

    test("missing uppercase letter shows validation error", () => {
      renderComponent();
      
      fireEvent.change(screen.getByPlaceholderText("Enter New Password"), {
        target: { value: process.env.FAKE_TEST_INVALID_NO_UPPERCASE as string },
      });

      fireEvent.focus(screen.getByPlaceholderText("Enter New Password"));

      expect(screen.getByText(/uppercase/i)).toBeInTheDocument();
    });

    test("password mismatch shows error", () => {
      renderComponent();

      fireEvent.change(screen.getByPlaceholderText("Enter New Password"), {
        target: { value: process.env.FAKE_TEST_VALID_PASSWORD as string },
      });

      fireEvent.change(screen.getByPlaceholderText("Confirm New Password"), {
        target: { value: process.env.FAKE_TEST_VALID_PASSWORD + "different" },
      });

      expect(screen.getByText("Passwords do not match")).toBeInTheDocument();
    });

    test("matching passwords removes error", () => {
      renderComponent();

      // First create a mismatch
      fireEvent.change(screen.getByPlaceholderText("Enter New Password"), {
        target: { value: process.env.FAKE_TEST_VALID_PASSWORD as string },
      });

      fireEvent.change(screen.getByPlaceholderText("Confirm New Password"), {
        target: { value: process.env.FAKE_TEST_VALID_PASSWORD + "different" },
      });

      // Verify error exists
      expect(screen.getByText("Passwords do not match")).toBeInTheDocument();

      // Now make them match
      fireEvent.change(screen.getByPlaceholderText("Confirm New Password"), {
        target: { value: process.env.FAKE_TEST_VALID_PASSWORD as string },
      });

      expect(screen.queryByText("Passwords do not match")).not.toBeInTheDocument();
    });

    test("enables submit button when validations pass", () => {
      renderComponent();

      fireEvent.change(screen.getByPlaceholderText("Enter New Password"), {
        target: { value: process.env.FAKE_TEST_VALID_PASSWORD as string },
      });

      fireEvent.change(screen.getByPlaceholderText("Confirm New Password"), {
        target: { value: process.env.FAKE_TEST_VALID_PASSWORD as string },
      });

      expect(screen.getByRole("button", { name: /set password/i })).not.toBeDisabled();
    });
  });

  /* --------------------------------------------------------------
     PASSWORD RULE SPECIFIC TESTS
  ---------------------------------------------------------------*/
  describe("Password Validation Rules", () => {
    test("password meets all requirements", () => {
      renderComponent();

      fireEvent.change(screen.getByPlaceholderText("Enter New Password"), {
        target: { value: process.env.FAKE_TEST_VALID_PASSWORD as string },
      });

      fireEvent.focus(screen.getByPlaceholderText("Enter New Password"));
      
      // Should not show any validation errors
      expect(screen.queryByText(/uppercase/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/lowercase/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/number/i)).not.toBeInTheDocument();
    });

    test("rejects missing lowercase", () => {
      renderComponent();

      fireEvent.change(screen.getByPlaceholderText("Enter New Password"), {
        target: { value: process.env.FAKE_TEST_INVALID_NO_LOWERCASE as string },
      });

      fireEvent.focus(screen.getByPlaceholderText("Enter New Password"));
      expect(screen.getByText(/lowercase/i)).toBeInTheDocument();
    });

    test("rejects missing uppercase", () => {
      renderComponent();

      fireEvent.change(screen.getByPlaceholderText("Enter New Password"), {
        target: { value: process.env.FAKE_TEST_INVALID_NO_UPPERCASE as string },
      });

      fireEvent.focus(screen.getByPlaceholderText("Enter New Password"));
      expect(screen.getByText(/uppercase/i)).toBeInTheDocument();
    });

    test("rejects missing number", () => {
      renderComponent();

      fireEvent.change(screen.getByPlaceholderText("Enter New Password"), {
        target: { value: process.env.FAKE_TEST_INVALID_NO_NUMBER as string },
      });

      fireEvent.focus(screen.getByPlaceholderText("Enter New Password"));
      expect(screen.getByText(/number/i)).toBeInTheDocument();
    });

    test("rejects missing special character", () => {
      renderComponent();

      fireEvent.change(screen.getByPlaceholderText("Enter New Password"), {
        target: { value: process.env.FAKE_TEST_INVALID_NO_SPECIAL as string },
      });

      fireEvent.focus(screen.getByPlaceholderText("Enter New Password"));
      expect(screen.getByText(/special/i)).toBeInTheDocument();
    });
  });

  /* --------------------------------------------------------------
     FORM SUBMISSION BEHAVIOR
  ---------------------------------------------------------------*/
  describe("Form Submission", () => {
    test("shows error when invitation token is missing", async () => {
      const { toast } = require("sonner");

      renderComponent();

      fireEvent.change(screen.getByPlaceholderText("Enter New Password"), {
        target: { value: process.env.FAKE_TEST_VALID_PASSWORD as string },
      });

      fireEvent.change(screen.getByPlaceholderText("Confirm New Password"), {
        target: { value: process.env.FAKE_TEST_VALID_PASSWORD as string },
      });

      fireEvent.click(screen.getByRole("button", { name: /set password/i }));

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Invalid or missing invitation token");
      });
    });

    test("submits form when token is valid", async () => {
      mockSearchParams.set("token", "valid-token-123");
      mockMutateAsync.mockResolvedValue({ status: true });

      renderComponent();

      fireEvent.change(screen.getByPlaceholderText("Enter New Password"), {
        target: { value: process.env.FAKE_TEST_VALID_PASSWORD as string },
      });

      fireEvent.change(screen.getByPlaceholderText("Confirm New Password"), {
        target: { value: process.env.FAKE_TEST_VALID_PASSWORD as string },
      });

      fireEvent.click(screen.getByRole("button", { name: /set password/i }));

      await waitFor(() =>
        expect(mockMutateAsync).toHaveBeenCalledWith({
          invitation_token: "valid-token-123",
          new_password: process.env.FAKE_TEST_VALID_PASSWORD as string,
        })
      );
    });

    test("navigates to login on success", async () => {
      mockSearchParams.set("token", "valid-token-123");
      mockMutateAsync.mockResolvedValue({ status: true });

      renderComponent();

      fireEvent.change(screen.getByPlaceholderText("Enter New Password"), {
        target: { value: process.env.FAKE_TEST_VALID_PASSWORD as string },
      });

      fireEvent.change(screen.getByPlaceholderText("Confirm New Password"), {
        target: { value: process.env.FAKE_TEST_VALID_PASSWORD as string },
      });

      fireEvent.click(screen.getByRole("button", { name: /set password/i }));

      await waitFor(() =>
        expect(mockNavigate).toHaveBeenCalledWith(ROUTES.LOGIN, { replace: true })
      );
    });
  });

  /* --------------------------------------------------------------
     LOADING STATE UI
  ---------------------------------------------------------------*/
  describe("Loading State", () => {
    test("button shows 'Saving...' text when pending", () => {
      mockUseAcceptInvitation.isPending = true;

      renderComponent();

      expect(screen.getByRole("button", { name: /saving/i })).toBeInTheDocument();
      mockUseAcceptInvitation.isPending = false;
    });

    test("submit button is disabled while loading", () => {
      mockUseAcceptInvitation.isPending = true;

      renderComponent();

      expect(screen.getByRole("button", { name: /saving/i })).toBeDisabled();
      mockUseAcceptInvitation.isPending = false;
    });
  });

  /* --------------------------------------------------------------
     FOCUS + BLUR VALIDATION
  ---------------------------------------------------------------*/
  describe("Focus Behavior", () => {
    test("shows validation on focus when password is invalid", () => {
      renderComponent();

      fireEvent.change(screen.getByPlaceholderText("Enter New Password"), {
        target: { value: process.env.FAKE_TEST_INVALID_NO_UPPERCASE as string },
      });

      fireEvent.focus(screen.getByPlaceholderText("Enter New Password"));

      expect(screen.getByText(/uppercase/i)).toBeInTheDocument();
    });

    test("hides validation when field is blurred empty", () => {
      renderComponent();

      fireEvent.focus(screen.getByPlaceholderText("Enter New Password"));
      fireEvent.blur(screen.getByPlaceholderText("Enter New Password"));

      expect(screen.queryByText(/uppercase/i)).not.toBeInTheDocument();
    });
  });

  /* --------------------------------------------------------------
     EDGE CASE TESTS
  ---------------------------------------------------------------*/
  describe("Edge Cases", () => {
    test("both password fields empty => submit disabled", () => {
      renderComponent();
      expect(screen.getByRole("button", { name: /set password/i })).toBeDisabled();
    });

    test("only one password filled => still disabled", () => {
      renderComponent();

      fireEvent.change(screen.getByPlaceholderText("Enter New Password"), {
        target: { value: process.env.FAKE_TEST_VALID_PASSWORD as string },
      });

      expect(screen.getByRole("button", { name: /set password/i })).toBeDisabled();
    });

    test("shows mismatch again after edit", () => {
      renderComponent();

      const newPass = screen.getByPlaceholderText("Enter New Password");
      const confirm = screen.getByPlaceholderText("Confirm New Password");

      fireEvent.change(newPass, { target: { value: process.env.FAKE_TEST_VALID_PASSWORD as string } });
      fireEvent.change(confirm, { target: { value: process.env.FAKE_TEST_VALID_PASSWORD as string } });

      expect(screen.queryByText("Passwords do not match")).not.toBeInTheDocument();

      // Editing breaks match
      fireEvent.change(newPass, { target: { value: (process.env.FAKE_TEST_VALID_PASSWORD as string) + "X" } });
      expect(screen.getByText("Passwords do not match")).toBeInTheDocument();
    });
  });
});