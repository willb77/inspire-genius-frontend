import { render, screen, fireEvent, act } from "@testing-library/react";
import SignUp from "../SignUp";
import { MemoryRouter } from "react-router-dom";

jest.mock("@/components/auth/AuthLayout", () => ({
  __esModule: true,
  default: ({ children }: any) => <div>{children}</div>,
}));

jest.mock("@/components/auth/AuthHeader", () => ({
  __esModule: true,
  default: ({ title }: any) => <h1>{title}</h1>,
}));

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

jest.mock("@/components/ui/button", () => ({
  Button: ({ children, ...props }: any) => (
    <button {...props}>{children}</button>
  ),
}));

jest.mock("@/components/ui/label", () => ({
  Label: ({ children }: any) => <label>{children}</label>,
}));

const mockSignup = jest.fn();
jest.mock("@/context/useAuth", () => ({
  useAuth: () => ({
    signup: mockSignup,
    isLoading: false,
  }),
}));

const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => mockNavigate,
}));

const mockRedirect = jest.fn();
jest.mock("@/hooks/useAuthRedirectForAuthPages", () => ({
  useAuthRedirectForAuthPages: () => mockRedirect(),
}));

describe("SignUp Component", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRedirect.mockReturnValue(null);
  });

  function renderSignUp() {
    return render(
      <MemoryRouter>
        <SignUp />
      </MemoryRouter>
    );
  }

  test("renders correctly", () => {
    renderSignUp();
    expect(screen.getByText("Welcome to Inspires Genius")).toBeInTheDocument();
  });

  test("email input updates", () => {
    renderSignUp();

    const email = screen.getByLabelText("email");
    fireEvent.change(email, { target: { value: "test@example.com" } });

    expect(email).toHaveValue("test@example.com");
  });

  test("password validation shows unmet rules", () => {
    renderSignUp();

    const pwd = screen.getByLabelText("password");

    fireEvent.focus(pwd);
    fireEvent.change(pwd, { target: { value: "abc" } });

    expect(screen.getByText(/Uppercase/)).toBeInTheDocument();
    expect(screen.getByText(/Number/)).toBeInTheDocument();
  });

  test("shows confirm password error when mismatched", () => {
    renderSignUp();

    fireEvent.change(screen.getByLabelText("password"), {
      target: { value: "Password1!" },
    });

    fireEvent.change(screen.getByLabelText("confirm"), {
      target: { value: "WrongPassword" },
    });

    expect(screen.getByText("Passwords do not match")).toBeInTheDocument();
  });

  test("Sign Up button stays disabled when invalid", () => {
    renderSignUp();
    const btn = screen.getByRole("button", { name: "Sign Up" });
    expect(btn).toBeDisabled();
  });

  test("enables submit when all fields valid", () => {
    renderSignUp();

    fireEvent.change(screen.getByLabelText("email"), {
      target: { value: "test@example.com" },
    });

    fireEvent.change(screen.getByLabelText("password"), {
      target: { value: "Password1!" },
    });

    fireEvent.change(screen.getByLabelText("confirm"), {
      target: { value: "Password1!" },
    });

    fireEvent.click(screen.getByLabelText("terms"));

    const btn = screen.getByRole("button", { name: "Sign Up" });
    expect(btn).not.toBeDisabled();
  });

  test("calls signup on valid submit", async () => {
    renderSignUp();

    fireEvent.change(screen.getByLabelText("email"), {
      target: { value: "test@example.com" },
    });

    fireEvent.change(screen.getByLabelText("password"), {
      target: { value: "Password1!" },
    });

    fireEvent.change(screen.getByLabelText("confirm"), {
      target: { value: "Password1!" },
    });

    fireEvent.click(screen.getByLabelText("terms"));

    const submit = screen.getByRole("button", { name: "Sign Up" });

    await act(async () => {
      fireEvent.click(submit);
    });

    expect(mockSignup).toHaveBeenCalledWith(
      "test@example.com",
      "Password1!",
      "Password1!"
    );
  });

  test("redirects when redirectTo is available", () => {
    mockRedirect.mockReturnValue("/dashboard");

    renderSignUp();

    expect(mockNavigate).toHaveBeenCalledWith("/dashboard", {
      replace: true,
    });
  });
});
