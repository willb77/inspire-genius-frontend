/**
 * @jest-environment jsdom
 *
 * Test Suite: SignUp Component
 *
 * Covers:
 *  • Rendering structure
 *  • Input handling for email, password, confirm password
 *  • Password validation rules (uppercase, numbers, etc.)
 *  • Terms checkbox behaviour
 *  • Submit button enable/disable logic
 *  • Signup() API call flow
 *  • Redirect logic via useAuthRedirectForAuthPages
 */

import { render, screen, fireEvent, act } from "@testing-library/react";
import SignUp from "../SignUp";
import { MemoryRouter } from "react-router-dom";

/* -------------------------------------------------------------------------
   Mock UI wrapper components used inside SignUp
   Simplified rendering for isolated testing
-------------------------------------------------------------------------- */
jest.mock("@/components/auth/AuthLayout", () => ({
  __esModule: true,
  default: ({ children }: any) => <div>{children}</div>,
}));

jest.mock("@/components/auth/AuthHeader", () => ({
  __esModule: true,
  default: ({ title }: any) => <h1>{title}</h1>,
}));

/* -------------------------------------------------------------------------
   Mock AuthFields (email, password, confirm password & social auth)
   Controls input behavior without relying on UI library internals
-------------------------------------------------------------------------- */
jest.mock("@/components/auth/AuthFields", () => ({
  EmailField: ({ value, onChange }: any) => (
    <input
      aria-label="email"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  ),

  PasswordField: ({ id = "password", value, onChange }: any) => (
    <input
      aria-label={id}
      type="password"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  ),

  SocialAuthSection: ({ onProviderStart, onProviderEnd }: any) => (
    <div>
      <button onClick={onProviderStart}>provider start</button>
      <button onClick={onProviderEnd}>provider end</button>
    </div>
  ),
}));

/* -------------------------------------------------------------------------
   Mock Checkbox UI control
-------------------------------------------------------------------------- */
jest.mock("@/components/ui/checkbox", () => ({
  Checkbox: ({ checked, onCheckedChange }: any) => (
    <input
      type="checkbox"
      aria-label="terms"
      checked={checked}
      onChange={(e) => onCheckedChange(e.target.checked)}
    />
  ),
}));

/* -------------------------------------------------------------------------
   Mock Button & Label components
-------------------------------------------------------------------------- */
jest.mock("@/components/ui/button", () => ({
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
}));

jest.mock("@/components/ui/label", () => ({
  Label: ({ children }: any) => <label>{children}</label>,
}));

/* -------------------------------------------------------------------------
   MOCK: useAuth context → signup API handler
-------------------------------------------------------------------------- */
const mockSignup = jest.fn();

jest.mock("@/context/useAuth", () => ({
  useAuth: () => ({
    signup: mockSignup,
    isLoading: false,
  }),
}));

/* -------------------------------------------------------------------------
   MOCK: react-router navigation
-------------------------------------------------------------------------- */
const mockNavigate = jest.fn();

jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => mockNavigate,
}));

/* -------------------------------------------------------------------------
   MOCK: redirect hook used for auto-navigation on logged-in users
-------------------------------------------------------------------------- */
const mockRedirect = jest.fn();

jest.mock("@/hooks/useAuthRedirectForAuthPages", () => ({
  useAuthRedirectForAuthPages: () => mockRedirect(),
}));

/* -------------------------------------------------------------------------
   TEST SUITE START
-------------------------------------------------------------------------- */

describe("SignUp Component", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRedirect.mockReturnValue(null); // default → no redirect
  });

  // Helper renderer
  function renderSignUp() {
    return render(
      <MemoryRouter>
        <SignUp />
      </MemoryRouter>
    );
  }

  /* -----------------------------------------------------------------------
     RENDERING
  ------------------------------------------------------------------------ */

  test("renders correctly", () => {
    renderSignUp();
    expect(screen.getByText("Welcome to Inspires Genius")).toBeInTheDocument();
  });

  test("renders Terms of Use and Privacy Policy links", () => {
    renderSignUp();

    expect(screen.getByRole("link", { name: /terms of use/i })).toHaveAttribute("href", "/terms");
    expect(screen.getByRole("link", { name: /privacy policy/i })).toHaveAttribute("href", "/privacy");
  });

  /* -----------------------------------------------------------------------
     FORM INPUTS
  ------------------------------------------------------------------------ */

  test("email input updates", () => {
    renderSignUp();

    const email = screen.getByLabelText("email");

    fireEvent.change(email, { target: { value: "test@example.com" } });

    expect(email).toHaveValue("test@example.com");
  });

  /* -----------------------------------------------------------------------
     PASSWORD VALIDATION
     Validate strength rules visibility when focused and typed
  ------------------------------------------------------------------------ */

  test("password validation shows unmet rules", () => {
    renderSignUp();

    const pwd = screen.getByLabelText("password");

    fireEvent.focus(pwd);
    fireEvent.change(pwd, { target: { value: process.env.FAKE_TEST_SIGNUP_WEAK_PASSWORD as string } });

    expect(screen.getByText(/Uppercase/)).toBeInTheDocument();
    expect(screen.getByText(/Number/)).toBeInTheDocument();
  });

  /* -----------------------------------------------------------------------
     CONFIRM PASSWORD VALIDATION
  ------------------------------------------------------------------------ */

  test("shows confirm password error when mismatched", () => {
    renderSignUp();

    fireEvent.change(screen.getByLabelText("password"), {
      target: { value: process.env.FAKE_TEST_SIGNUP_PASSWORD as string },
    });

    fireEvent.change(screen.getByLabelText("confirm"), {
      target: { value: process.env.FAKE_TEST_SIGNUP_MISMATCH_PASSWORD as string },
    });

    expect(screen.getByText("Passwords do not match")).toBeInTheDocument();
  });

  /* -----------------------------------------------------------------------
     BUTTON STATE: Disabled until form is valid
  ------------------------------------------------------------------------ */

  test("Sign Up button stays disabled when invalid", () => {
    renderSignUp();

    const btn = screen.getByRole("button", { name: "Sign Up" });
    expect(btn).toBeDisabled();
  });

  /* -----------------------------------------------------------------------
     ENABLE SUBMIT: All fields valid + terms checked
  ------------------------------------------------------------------------ */

  test("enables submit when all fields valid", () => {
    renderSignUp();

    fireEvent.change(screen.getByLabelText("email"), {
      target: { value: "test@example.com" },
    });

    fireEvent.change(screen.getByLabelText("password"), {
      target: { value: process.env.FAKE_TEST_SIGNUP_PASSWORD as string },
    });

    fireEvent.change(screen.getByLabelText("confirm"), {
      target: { value: process.env.FAKE_TEST_SIGNUP_PASSWORD as string },
    });

    fireEvent.click(screen.getByLabelText("terms"));

    const btn = screen.getByRole("button", { name: "Sign Up" });

    expect(btn).not.toBeDisabled();
  });

  /* -----------------------------------------------------------------------
     SUBMIT ACTION
     Ensures signup() is called with correct values
  ------------------------------------------------------------------------ */

  test("calls signup on valid submit", async () => {
    renderSignUp();

    // Fill form
    fireEvent.change(screen.getByLabelText("email"), {
      target: { value: "test@example.com" },
    });

    fireEvent.change(screen.getByLabelText("password"), {
      target: { value: process.env.FAKE_TEST_SIGNUP_PASSWORD as string },
    });

    fireEvent.change(screen.getByLabelText("confirm"), {
      target: { value: process.env.FAKE_TEST_SIGNUP_PASSWORD as string },
    });

    fireEvent.click(screen.getByLabelText("terms"));

    const submit = screen.getByRole("button", { name: "Sign Up" });

    await act(async () => fireEvent.click(submit));

    expect(mockSignup).toHaveBeenCalledWith(
      "test@example.com",
      process.env.FAKE_TEST_SIGNUP_PASSWORD as string,
      process.env.FAKE_TEST_SIGNUP_PASSWORD as string
    );
  });

  /* -----------------------------------------------------------------------
     REDIRECT TEST
     If redirect hook returns a path → navigate immediately
  ------------------------------------------------------------------------ */

  test("redirects when redirectTo is available", () => {
    mockRedirect.mockReturnValue("/dashboard");

    renderSignUp();

    expect(mockNavigate).toHaveBeenCalledWith("/dashboard", {
      replace: true,
    });
  });
});
