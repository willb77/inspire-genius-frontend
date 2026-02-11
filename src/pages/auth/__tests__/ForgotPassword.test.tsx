/**
 * @jest-environment jsdom
 *
 * Test Suite: ForgotPassword Component
 *
 * Covers:
 *  • UI rendering of layout, header, input, button, and login link
 *  • Email input state updates + trimming behavior
 *  • Button enabling/disabling logic
 *  • Submission and mutation behavior
 *  • Navigation after success
 *  • Loading states
 *  • Edge cases like Enter key and rapid submissions
 */

import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { BrowserRouter, useNavigate } from "react-router-dom";
import ForgotPassword from "../ForgotPassword";
import { useRequestPasswordReset } from "@/hooks/auth/useRequestPasswordReset";
import { ROUTES } from "@/constants/routes";

/* -------------------------------------------------------------
   MOCK AXIOS (even though this component doesn't use axios directly,
   the mock prevents unintended network calls from submodules)
--------------------------------------------------------------*/
jest.mock("@/lib/axios", () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    patch: jest.fn(),
  },
}));

/* -------------------------------------------------------------
   MOCK useRequestPasswordReset mutation hook
--------------------------------------------------------------*/
jest.mock("@/hooks/auth/useRequestPasswordReset");

/* -------------------------------------------------------------
   MOCK react-router: useNavigate + Link
--------------------------------------------------------------*/
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: jest.fn(),
  Link: ({ children, to }: any) => <a href={to}>{children}</a>, // Simulated Link component
}));

/* -------------------------------------------------------------
   MOCK UI Components — AuthLayout & AuthHeader
--------------------------------------------------------------*/
jest.mock("@/components/auth/AuthLayout", () => ({
  __esModule: true,
  default: ({ children }: any) => (
    <div data-testid="auth-layout">{children}</div>
  ),
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

/* -------------------------------------------------------------
   TEST SUITE
--------------------------------------------------------------*/
describe("ForgotPassword Component", () => {
  const mockNavigate = jest.fn();        // navigation mock
  const mockMutateAsync = jest.fn();     // mutation mock
  const mockUseRequestPasswordReset = jest.mocked(useRequestPasswordReset);
  const mockUseNavigate = jest.mocked(useNavigate);

  beforeEach(() => {
    jest.clearAllMocks();

    // Set default behavior for mocked hooks
    mockUseNavigate.mockReturnValue(mockNavigate);
    mockUseRequestPasswordReset.mockReturnValue({
      mutateAsync: mockMutateAsync,
      isPending: false,
    } as any);
  });

  // Helper to render component with routing
  const renderComponent = () => {
    return render(
      <BrowserRouter>
        <ForgotPassword />
      </BrowserRouter>
    );
  };

  /* -------------------------------------------------------------
     UI RENDERING TESTS
  --------------------------------------------------------------*/
  describe("Component Rendering", () => {
    it("renders form layout + header + input + button", () => {
      renderComponent();

      expect(screen.getByTestId("auth-layout")).toBeInTheDocument();
      expect(screen.getByTestId("auth-header")).toBeInTheDocument();

      expect(screen.getByText("Forgot Password")).toBeInTheDocument();
      expect(
        screen.getByText("Enter your email and we'll send you a verification code")
      ).toBeInTheDocument();

      expect(screen.getByLabelText("Email Address")).toBeInTheDocument();
      expect(screen.getByPlaceholderText("you@example.com")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /send link/i })).toBeInTheDocument();
    });

    it("renders login link correctly", () => {
      renderComponent();

      expect(screen.getByText("Remembered your password?")).toBeInTheDocument();

      const loginLink = screen.getByText("Log In");
      expect(loginLink).toBeInTheDocument();
      expect(loginLink.closest("a")).toHaveAttribute("href", ROUTES.LOGIN);
    });

    it("submit button is disabled when email is empty", () => {
      renderComponent();
      expect(screen.getByRole("button", { name: /send link/i })).toBeDisabled();
    });
  });

  /* -------------------------------------------------------------
     USER INPUT BEHAVIOR
  --------------------------------------------------------------*/
  describe("User Interactions", () => {
    it("updates email input value when typing", () => {
      renderComponent();

      const emailInput = screen.getByPlaceholderText("you@example.com") as HTMLInputElement;

      fireEvent.change(emailInput, { target: { value: "test@example.com" } });

      expect(emailInput.value).toBe("test@example.com");
    });

    it("enables submit button when email is entered", () => {
      renderComponent();

      fireEvent.change(screen.getByPlaceholderText("you@example.com"), {
        target: { value: "test@example.com" },
      });

      expect(screen.getByRole("button", { name: /send link/i })).not.toBeDisabled();
    });

    it("keeps submit button disabled if email is empty", () => {
      renderComponent();
      expect(screen.getByRole("button", { name: /send link/i })).toBeDisabled();
    });
  });

  /* -------------------------------------------------------------
     FORM SUBMISSION
  --------------------------------------------------------------*/
  describe("Form Submission", () => {
    it("calls mutateAsync with email on submit", async () => {
      mockMutateAsync.mockResolvedValue(undefined);
      renderComponent();

      fireEvent.change(screen.getByPlaceholderText("you@example.com"), {
        target: { value: "test@example.com" },
      });

      fireEvent.click(screen.getByRole("button", { name: /send link/i }));

      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalledWith(
          { email: "test@example.com" },
          expect.objectContaining({
            onSuccess: expect.any(Function), // ensures callback is passed through
          })
        );
      });
    });

    it("does not submit if email is empty", async () => {
      renderComponent();

      const form = screen.getByRole("button", { name: /send link/i }).closest("form")!;
      fireEvent.submit(form);

      await waitFor(() => {
        expect(mockMutateAsync).not.toHaveBeenCalled();
      });
    });

    it("navigates to login after successful request", async () => {
      // Simulate onSuccess being called
      mockMutateAsync.mockImplementation((_, opts) => {
        opts?.onSuccess?.();
        return Promise.resolve(undefined);
      });

      renderComponent();

      fireEvent.change(screen.getByPlaceholderText("you@example.com"), {
        target: { value: "test@example.com" },
      });

      fireEvent.click(screen.getByRole("button", { name: /send link/i }));

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith(ROUTES.LOGIN);
      });
    });
  });

  /* -------------------------------------------------------------
     LOADING STATE — isPending
  --------------------------------------------------------------*/
  describe("Loading State", () => {
    it("displays 'Sending...' and disables button when loading", () => {
      mockUseRequestPasswordReset.mockReturnValue({
        mutateAsync: mockMutateAsync,
        isPending: true,
      } as any);

      renderComponent();

      fireEvent.change(screen.getByPlaceholderText("you@example.com"), {
        target: { value: "test@example.com" },
      });

      const submitButton = screen.getByRole("button", { name: /sending.../i });

      expect(submitButton).toBeDisabled();
      expect(submitButton).toHaveTextContent("Sending...");
    });

    it("shows normal text when not loading", () => {
      renderComponent();

      fireEvent.change(screen.getByPlaceholderText("you@example.com"), {
        target: { value: "test@example.com" },
      });

      expect(screen.getByRole("button", { name: /send link/i })).toHaveTextContent("Send Link");
    });
  });

  /* -------------------------------------------------------------
     EDGE CASES
  --------------------------------------------------------------*/
  describe("Edge Cases", () => {
    it("handles Enter key submission", async () => {
      mockMutateAsync.mockResolvedValue(undefined);
      renderComponent();

      fireEvent.change(screen.getByPlaceholderText("you@example.com"), {
        target: { value: "test@example.com" },
      });

      fireEvent.submit(screen.getByPlaceholderText("you@example.com").closest("form")!);

      await waitFor(() =>
        expect(mockMutateAsync).toHaveBeenCalledWith(
          { email: "test@example.com" },
          expect.any(Object)
        )
      );
    });

    it("handles rapid multiple clicks", async () => {
      mockMutateAsync.mockResolvedValue(undefined);

      renderComponent();

      const emailInput = screen.getByPlaceholderText("you@example.com");
      const button = screen.getByRole("button", { name: /send link/i });

      fireEvent.change(emailInput, { target: { value: "test@example.com" } });

      fireEvent.click(button);
      fireEvent.click(button);
      fireEvent.click(button);

      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalledTimes(3);
      });
    });

    it("trims whitespace in email input", () => {
      renderComponent();

      const emailInput = screen.getByPlaceholderText("you@example.com") as HTMLInputElement;

      fireEvent.change(emailInput, {
        target: { value: "  test@example.com  " },
      });

      expect(emailInput.value).toBe("test@example.com");
    });
  });
});
