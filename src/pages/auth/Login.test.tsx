import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

import Login from "./Login";

const mockNavigate = jest.fn();

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
    login: jest.fn(),
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

// ------------------ TESTS ------------------
describe("Login Page", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    sessionStorage.clear();
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
