import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { BrowserRouter } from "react-router-dom";
import ForgotPassword from "../ForgotPassword";
import { useRequestPasswordReset } from "@/hooks/auth/useRequestPasswordReset";
import { useNavigate } from "react-router-dom";
import { ROUTES } from "@/constants/routes";

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

// Mock the hooks and components
jest.mock("@/hooks/auth/useRequestPasswordReset");
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: jest.fn(),
  Link: ({ children, to }: any) => <a href={to}>{children}</a>,
}));

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

describe("ForgotPassword Component", () => {
  const mockNavigate = jest.fn();
  const mockMutateAsync = jest.fn();
  const mockUseRequestPasswordReset = jest.mocked(useRequestPasswordReset);
  const mockUseNavigate = jest.mocked(useNavigate);

  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();

    // Setup default mock implementations
    mockUseNavigate.mockReturnValue(mockNavigate);
    mockUseRequestPasswordReset.mockReturnValue({
      mutateAsync: mockMutateAsync,
      isPending: false,
    } as any);
  });

  const renderComponent = () => {
    return render(
      <BrowserRouter>
        <ForgotPassword />
      </BrowserRouter>
    );
  };

  describe("Component Rendering", () => {
    it("should render the forgot password form with all required elements", () => {
      renderComponent();

      expect(screen.getByTestId("auth-layout")).toBeInTheDocument();
      expect(screen.getByTestId("auth-header")).toBeInTheDocument();
      expect(screen.getByText("Forgot Password")).toBeInTheDocument();
      expect(
        screen.getByText(
          "Enter your email and we'll send you a verification code"
        )
      ).toBeInTheDocument();
      expect(screen.getByLabelText("Email Address")).toBeInTheDocument();
      expect(
        screen.getByPlaceholderText("you@example.com")
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /send link/i })
      ).toBeInTheDocument();
    });

    it("should render the login link with correct text", () => {
      renderComponent();

      expect(screen.getByText("Remembered your password?")).toBeInTheDocument();
      const loginLink = screen.getByText("Log In");
      expect(loginLink).toBeInTheDocument();
      expect(loginLink.closest("a")).toHaveAttribute("href", ROUTES.LOGIN);
    });

    it("should render submit button as disabled initially when email is empty", () => {
      renderComponent();

      const submitButton = screen.getByRole("button", { name: /send link/i });
      expect(submitButton).toBeDisabled();
    });
  });

  describe("User Interactions", () => {
    it("should update email input value when user types", () => {
      renderComponent();

      const emailInput = screen.getByPlaceholderText(
        "you@example.com"
      ) as HTMLInputElement;

      fireEvent.change(emailInput, { target: { value: "test@example.com" } });

      expect(emailInput.value).toBe("test@example.com");
    });

    it("should enable submit button when email is entered", () => {
      renderComponent();

      const emailInput = screen.getByPlaceholderText("you@example.com");
      const submitButton = screen.getByRole("button", { name: /send link/i });

      fireEvent.change(emailInput, { target: { value: "test@example.com" } });

      expect(submitButton).not.toBeDisabled();
    });

    it("should keep submit button disabled when email is empty", () => {
      renderComponent();

      const submitButton = screen.getByRole("button", { name: /send link/i });

      expect(submitButton).toBeDisabled();
    });
  });

  describe("Form Submission", () => {
    it("should call mutateAsync with correct email on form submission", async () => {
      mockMutateAsync.mockResolvedValue(undefined);
      renderComponent();

      const emailInput = screen.getByPlaceholderText("you@example.com");
      const submitButton = screen.getByRole("button", { name: /send link/i });

      fireEvent.change(emailInput, { target: { value: "test@example.com" } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalledWith(
          { email: "test@example.com" },
          expect.objectContaining({
            onSuccess: expect.any(Function),
          })
        );
      });
    });

    it("should not submit form when email is empty", async () => {
      renderComponent();

      const form = screen
        .getByRole("button", { name: /send link/i })
        .closest("form");

      if (form) {
        fireEvent.submit(form);
      }

      await waitFor(() => {
        expect(mockMutateAsync).not.toHaveBeenCalled();
      });
    });

    it("should navigate to login page on successful password reset", async () => {
      mockMutateAsync.mockImplementation((_, options) => {
        options?.onSuccess?.();
        return Promise.resolve(undefined);
      });

      renderComponent();

      const emailInput = screen.getByPlaceholderText("you@example.com");
      const submitButton = screen.getByRole("button", { name: /send link/i });

      fireEvent.change(emailInput, { target: { value: "test@example.com" } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith(ROUTES.LOGIN);
      });
    });
  });

  describe("Loading State", () => {
    it("should show loading text and disable button while request is pending", () => {
      mockUseRequestPasswordReset.mockReturnValue({
        mutateAsync: mockMutateAsync,
        isPending: true,
      } as any);

      renderComponent();

      const emailInput = screen.getByPlaceholderText("you@example.com");
      fireEvent.change(emailInput, { target: { value: "test@example.com" } });

      const submitButton = screen.getByRole("button", { name: /sending.../i });

      expect(submitButton).toBeInTheDocument();
      expect(submitButton).toBeDisabled();
      expect(submitButton).toHaveTextContent("Sending...");
    });

    it("should show normal text when not pending", () => {
      renderComponent();

      const emailInput = screen.getByPlaceholderText("you@example.com");
      fireEvent.change(emailInput, { target: { value: "test@example.com" } });

      const submitButton = screen.getByRole("button", { name: /send link/i });

      expect(submitButton).toHaveTextContent("Send Link");
    });
  });

  describe("Edge Cases", () => {
    it("should handle form submission via Enter key", async () => {
      mockMutateAsync.mockResolvedValue(undefined);
      renderComponent();

      const emailInput = screen.getByPlaceholderText("you@example.com");

      fireEvent.change(emailInput, { target: { value: "test@example.com" } });
      fireEvent.submit(emailInput.closest("form")!);

      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalledWith(
          { email: "test@example.com" },
          expect.any(Object)
        );
      });
    });

    it("should handle multiple rapid submissions correctly", async () => {
      mockMutateAsync.mockResolvedValue(undefined);
      renderComponent();

      const emailInput = screen.getByPlaceholderText("you@example.com");
      const submitButton = screen.getByRole("button", { name: /send link/i });

      fireEvent.change(emailInput, { target: { value: "test@example.com" } });

      // Click multiple times rapidly
      fireEvent.click(submitButton);
      fireEvent.click(submitButton);
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalledTimes(3);
      });
    });

    it("should trim whitespace from email input", () => {
      renderComponent();

      const emailInput = screen.getByPlaceholderText(
        "you@example.com"
      ) as HTMLInputElement;

      fireEvent.change(emailInput, {
        target: { value: "  test@example.com  " },
      });
      expect(emailInput.value).toBe("test@example.com");
    });
  });
});
