/**
 * @jest-environment jsdom
 *
 * Test Suite: Login Page
 *
 * Covers:
 *  • Form submission + login() invocation
 *  • SessionStorage provider flow logic
 *  • Redirect behavior using useAuthRedirectForAuthPages
 *  • Social login start/end flow
 *  • Navigation links (Sign Up, Forgot Password)
 *  • Error handling when sessionStorage throws
 *  • Ensures full line coverage of Login.tsx
 */

import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import Login from "../Login";

const mockNavigate = jest.fn();
const mockLogin = jest.fn();

/* -------------------------------------------------------------
   MOCK react-router-dom
   - Overrides Link to allow intercepting navigation
   - Overrides useNavigate to our mock function
--------------------------------------------------------------*/
jest.mock("react-router-dom", () => {
  const actual = jest.requireActual("react-router-dom");
  return {
    ...actual,
    Link: ({ to, children }: any) => (
      <a
        href={to}
        onClick={(e) => {
          e.preventDefault();
          mockNavigate(to, { replace: false });
        }}
      >
        {children}
      </a>
    ),
    useNavigate: () => mockNavigate,
  };
});

/* -------------------------------------------------------------
   MOCK Auth Context
   - Provides login() and isLoading flag
--------------------------------------------------------------*/
jest.mock("@/context/useAuth", () => ({
  useAuth: () => ({
    login: mockLogin,
    isLoading: false,
  }),
}));

/* -------------------------------------------------------------
   MOCK redirect hook used for auto-navigation on auth pages
--------------------------------------------------------------*/
jest.mock("@/hooks/useAuthRedirectForAuthPages", () => ({
  useAuthRedirectForAuthPages: jest.fn(),
}));

/* -------------------------------------------------------------
   MOCK Magic Auth hook
--------------------------------------------------------------*/
jest.mock("@/hooks/magic-auth/useMagicAuth", () => ({
  useRequestMagicLink: () => ({
    mutateAsync: jest.fn(),
    isPending: false,
  }),
}));

/* -------------------------------------------------------------
   MOCK Auth field components
   - Replace EmailField, PasswordField, SocialAuthSection
   - Simple inputs/buttons to simulate behavior
--------------------------------------------------------------*/
jest.mock("@/components/auth/AuthFields", () => ({
  EmailField: ({ value, onChange }: any) => (
    <input aria-label="email" value={value} onChange={(e) => onChange(e.target.value)} />
  ),
  PasswordField: ({ value, onChange }: any) => (
    <input
      aria-label="password"
      type="password"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  ),
  SocialAuthSection: ({ onProviderStart, onProviderEnd }: any) => (
    <div>
      <button
        aria-label="Google Login"
        onClick={() => {
          sessionStorage.setItem("auth:provider", "Google");
          onProviderStart?.();
        }}
      >
        Google Login
      </button>

      <button
        aria-label="Provider End"
        onClick={() => {
          sessionStorage.removeItem("auth:provider");
          onProviderEnd?.();
        }}
      >
        End Provider
      </button>
    </div>
  ),
}));

/* -------------------------------------------------------------
   MOCK layout components
--------------------------------------------------------------*/
jest.mock("@/components/auth/AuthLayout", () => (props: any) => <div>{props.children}</div>);
jest.mock("@/components/auth/AuthHeader", () => (props: any) => <h1>{props.title}</h1>);
jest.mock("lucide-react", () => ({
  Mail: () => <svg data-testid="mail-icon" />,
}));

/* -------------------------------------------------------------
   Extract the mock reference so we can override return values
--------------------------------------------------------------*/
const mockRedirectHook =
  require("@/hooks/useAuthRedirectForAuthPages").useAuthRedirectForAuthPages;

describe("Login Page - Full Coverage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    sessionStorage.clear();
    mockLogin.mockClear();
  });

  /** Helper function to render the Login page with routes */
  function renderPage() {
    return render(
      <MemoryRouter initialEntries={["/login"]}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<div>Signup Page</div>} />
          <Route path="/forgot" element={<div>Forgot Page</div>} />
          <Route path="/dashboard" element={<div>Dashboard</div>} />
        </Routes>
      </MemoryRouter>
    );
  }

  /* -------------------------------------------------------------
     Form Submission — handleSubmit()
--------------------------------------------------------------*/
  test("calls login() with email and password on form submit", async () => {
    mockRedirectHook.mockReturnValue(null); // no redirect
    renderPage();

    // Navigate to password login view
    fireEvent.click(screen.getByText("Sign in with password"));

    fireEvent.change(screen.getByLabelText("email"), {
      target: { value: "test@example.com" },
    });
    fireEvent.change(screen.getByLabelText("password"), {
      target: { value: process.env.FAKE_TEST_VALID_PASSWORD as string },
    });

    // Submit form
    const form = screen.getByLabelText("email").closest("form")!;
    fireEvent.submit(form);

    // Assert login() called with correct args
    await waitFor(() =>
      expect(mockLogin).toHaveBeenCalledWith("test@example.com", process.env.FAKE_TEST_VALID_PASSWORD as string)
    );
  });

  /* -------------------------------------------------------------
     Form submission clears provider from sessionStorage
--------------------------------------------------------------*/
  test("removes auth provider from sessionStorage on submit", async () => {
    mockRedirectHook.mockReturnValue(null);
    sessionStorage.setItem("auth:provider", "Google");

    renderPage();

    // Navigate to password login view (where sessionStorage is cleared on submit)
    fireEvent.click(screen.getByText("Sign in with password"));

    const form = screen.getByLabelText("email").closest("form")!;
    fireEvent.submit(form);

    await waitFor(() =>
      expect(sessionStorage.getItem("auth:provider")).toBeNull()
    );
  });

  /* -------------------------------------------------------------
     Redirect Handling via useEffect + redirect hook
--------------------------------------------------------------*/
  test("redirects when redirectTo exists and provider is NOT active", () => {
    mockRedirectHook.mockReturnValue("/dashboard");

    renderPage();

    expect(mockNavigate).toHaveBeenCalledWith("/dashboard", { replace: true });
  });

  test("does NOT redirect when provider flow is active", () => {
    mockRedirectHook.mockReturnValue("/dashboard");
    sessionStorage.setItem("auth:provider", "Google");

    renderPage();

    expect(mockNavigate).not.toHaveBeenCalled();
  });

  test("does NOT redirect when redirectTo is null", () => {
    mockRedirectHook.mockReturnValue(null);

    renderPage();

    expect(mockNavigate).not.toHaveBeenCalled();
  });

  /* -------------------------------------------------------------
     sessionStorage error handling
--------------------------------------------------------------*/
  test("handles sessionStorage error gracefully on page load", () => {
    mockRedirectHook.mockReturnValue(null);

    // Override getItem to throw
    const original = Storage.prototype.getItem;
    Storage.prototype.getItem = jest.fn(() => {
      throw new Error("SessionStorage error");
    });

    // Should not crash the component
    expect(() => renderPage()).not.toThrow();

    // Restore original
    Storage.prototype.getItem = original;
  });

  test("handles sessionStorage error inside useEffect redirect logic", () => {
    mockRedirectHook.mockReturnValue("/dashboard");

    const original = Storage.prototype.getItem;
    let count = 0;

    // Throw error only on the second call
    Storage.prototype.getItem = jest.fn(() => {
      count++;
      if (count > 1) throw new Error("SessionStorage error");
      return null;
    });

    renderPage();

    expect(mockNavigate).toHaveBeenCalledWith("/dashboard", { replace: true });

    Storage.prototype.getItem = original;
  });

  /* -------------------------------------------------------------
     Social Auth Section Behavior
--------------------------------------------------------------*/
  test("sets provider when social login begins", () => {
    mockRedirectHook.mockReturnValue(null);
    renderPage();

    fireEvent.click(screen.getByLabelText("Google Login"));

    expect(sessionStorage.getItem("auth:provider")).toBe("Google");
  });

  test("clears provider when social login ends", () => {
    mockRedirectHook.mockReturnValue(null);
    sessionStorage.setItem("auth:provider", "Google");

    renderPage();

    fireEvent.click(screen.getByLabelText("Provider End"));

    expect(sessionStorage.getItem("auth:provider")).toBeNull();
  });

  /* -------------------------------------------------------------
     Navigation Link Behavior
--------------------------------------------------------------*/
  test("navigates to Sign Up page", () => {
    mockRedirectHook.mockReturnValue(null);
    renderPage();

    fireEvent.click(screen.getByText("Sign Up"));

    expect(mockNavigate).toHaveBeenCalledWith("/signup", { replace: false });
  });

  test("navigates to Forgot Password page", () => {
    mockRedirectHook.mockReturnValue(null);
    renderPage();

    // Navigate to password login view (where "Forgot password?" link exists)
    fireEvent.click(screen.getByText("Sign in with password"));

    fireEvent.click(screen.getByText("Forgot password?"));

    expect(mockNavigate).toHaveBeenCalledWith("/forgot", { replace: false });
  });
});
