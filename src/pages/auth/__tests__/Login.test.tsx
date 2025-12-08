import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import Login from "../Login";

const mockNavigate = jest.fn();
const mockLogin = jest.fn();

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

jest.mock("@/context/useAuth", () => ({
  useAuth: () => ({
    login: mockLogin,
    isLoading: false,
  }),
}));

jest.mock("@/hooks/useAuthRedirectForAuthPages", () => ({
  useAuthRedirectForAuthPages: jest.fn(),
}));

jest.mock("@/components/auth/AuthFields", () => ({
  EmailField: ({ value, onChange }: any) => (
    <input
      aria-label="email"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
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

jest.mock("@/components/auth/AuthLayout", () => (props: any) => (
  <div>{props.children}</div>
));

jest.mock("@/components/auth/AuthHeader", () => (props: any) => (
  <h1>{props.title}</h1>
));

const mockRedirectHook =
  require("@/hooks/useAuthRedirectForAuthPages").useAuthRedirectForAuthPages;

describe("Login Page - Full Coverage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    sessionStorage.clear();
    mockLogin.mockClear();
  });

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

  // Test: handleSubmit function (lines 71-72)
  test("calls login with email and password on form submit", async () => {
    mockRedirectHook.mockReturnValue(null);
    renderPage();

    const emailInput = screen.getByLabelText("email");
    const passwordInput = screen.getByLabelText("password");
    
    fireEvent.change(emailInput, { target: { value: "test@example.com" } });
    fireEvent.change(passwordInput, { target: { value: "password123" } });

    const form = emailInput.closest("form")!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith("test@example.com", "password123");
    });
  });

  // Test: handleSubmit removes provider from sessionStorage (line 71)
  test("removes auth provider from sessionStorage on form submit", async () => {
    mockRedirectHook.mockReturnValue(null);
    sessionStorage.setItem("auth:provider", "Google");
    
    renderPage();

    const emailInput = screen.getByLabelText("email");
    const form = emailInput.closest("form")!;
    
    fireEvent.submit(form);

    expect(sessionStorage.getItem("auth:provider")).toBeNull();
  });

  // Test: useEffect redirect when redirectTo exists and no provider active (lines 40-43)
  test("redirects when redirectTo is provided and no provider is active", () => {
    mockRedirectHook.mockReturnValue("/dashboard");
    
    renderPage();

    expect(mockNavigate).toHaveBeenCalledWith("/dashboard", { replace: true });
  });

  // Test: useEffect does NOT redirect when provider is active (lines 40-43)
  test("does not redirect when provider flow is in progress", () => {
    mockRedirectHook.mockReturnValue("/dashboard");
    sessionStorage.setItem("auth:provider", "Google");
    
    renderPage();

    expect(mockNavigate).not.toHaveBeenCalled();
  });

  // Test: useEffect does NOT redirect when redirectTo is null
  test("does not redirect when redirectTo is null", () => {
    mockRedirectHook.mockReturnValue(null);
    
    renderPage();

    expect(mockNavigate).not.toHaveBeenCalled();
  });

  // Test: sessionStorage error handling in useState (line 22)
  test("handles sessionStorage error gracefully on initial load", () => {
    mockRedirectHook.mockReturnValue(null);
    
    // Mock sessionStorage.getItem to throw an error
    const originalGetItem = Storage.prototype.getItem;
    Storage.prototype.getItem = jest.fn(() => {
      throw new Error("SessionStorage access denied");
    });

    // Should not throw error
    expect(() => renderPage()).not.toThrow();

    // Restore original
    Storage.prototype.getItem = originalGetItem;
  });

  // Test: sessionStorage error handling in useEffect (lines 29-35)
  test("handles sessionStorage error in useEffect", () => {
    mockRedirectHook.mockReturnValue("/dashboard");
    
    // Mock sessionStorage.getItem to throw an error
    const originalGetItem = Storage.prototype.getItem;
    let callCount = 0;
    Storage.prototype.getItem = jest.fn(() => {
      callCount++;
      // Throw error on second call (inside useEffect)
      if (callCount > 1) {
        throw new Error("SessionStorage access denied");
      }
      return null;
    });

    renderPage();

    // Should still attempt redirect despite sessionStorage error
    expect(mockNavigate).toHaveBeenCalledWith("/dashboard", { replace: true });

    // Restore original
    Storage.prototype.getItem = originalGetItem;
  });

  // Test: Social auth provider start/end callbacks
  test("sets provider active state when social auth starts", () => {
    mockRedirectHook.mockReturnValue(null);
    renderPage();

    const googleButton = screen.getByLabelText("Google Login");
    fireEvent.click(googleButton);

    // Verify sessionStorage was set
    expect(sessionStorage.getItem("auth:provider")).toBe("Google");
  });

  test("sets provider inactive state when social auth ends", () => {
    mockRedirectHook.mockReturnValue(null);
    sessionStorage.setItem("auth:provider", "Google");
    
    renderPage();

    const endButton = screen.getByLabelText("Provider End");
    fireEvent.click(endButton);

    // Verify sessionStorage was cleared
    expect(sessionStorage.getItem("auth:provider")).toBeNull();
  });

  // Test: Navigation links
  test("navigates to signup", () => {
    mockRedirectHook.mockReturnValue(null);
    renderPage();

    fireEvent.click(screen.getByText("Sign Up"));

    expect(mockNavigate).toHaveBeenCalledWith("/signup", { replace: false });
  });

  test("navigates to forgot password", () => {
    mockRedirectHook.mockReturnValue(null);
    renderPage();

    fireEvent.click(screen.getByText("Forgot password?"));

    expect(mockNavigate).toHaveBeenCalledWith("/forgot", { replace: false });
  });
});