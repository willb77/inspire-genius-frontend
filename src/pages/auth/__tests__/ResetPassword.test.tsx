import { render, screen, fireEvent, act } from "@testing-library/react";
import ResetPassword from "../ResetPassword";
import { MemoryRouter } from "react-router-dom";

jest.mock("@/components/auth/AuthLayout", () => ({
  __esModule: true,
  default: ({ children }: any) => <div>{children}</div>,
}));

jest.mock("@/components/auth/AuthHeader", () => ({
  __esModule: true,
  default: ({ title, subtitle }: any) => (
    <h1>{title}<span>{subtitle}</span></h1>
  ),
}));

jest.mock("@/components/shared/inputs/PasswordField", () => ({
  __esModule: true,
  default: ({ placeholder, error, ...props }: any) => (
    <div>
      <input aria-label={placeholder} placeholder={placeholder} {...props} />
      {error && <p>{error}</p>}
    </div>
  ),
}));

jest.mock("@/components/ui/button", () => ({
  Button: ({ children, ...props }: any) => (
    <button {...props}>{children}</button>
  ),
}));

const mockMutateAsync = jest.fn();

jest.mock("@/hooks/auth/useResetPassword", () => ({
  useResetPassword: () => ({
    mutateAsync: mockMutateAsync,
    isPending: false,
  }),
}));

const mockNavigate = jest.fn();

jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => mockNavigate,
  useSearchParams: () => [
    new URLSearchParams({ token: "resetToken123" }),
  ],
}));

jest.mock("@/constants/routes", () => ({
  ROUTES: { LOGIN: "/login" },
}));

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

  test("renders title", () => {
    renderComponent();

    const heading = screen.getByRole("heading", {
      name: /reset password/i,
    });

    expect(heading).toBeInTheDocument();
  });

  test("shows validation when new password empty", async () => {
    renderComponent();

    await act(async () =>
      fireEvent.click(screen.getByRole("button", { name: /reset password/i }))
    );

    expect(
      screen.getByText("New password is required")
    ).toBeInTheDocument();
  });

  test("shows error when confirm password does not match", async () => {
    renderComponent();

    fireEvent.change(screen.getByLabelText("Enter New Password"), {
      target: { value: "Password123" },
    });

    fireEvent.change(screen.getByLabelText("Confirm New Password"), {
      target: { value: "WrongPassword" },
    });

    await act(async () =>
      fireEvent.click(screen.getByRole("button", { name: /reset password/i }))
    );

    expect(screen.getByText("Passwords do not match")).toBeInTheDocument();
  });

  test("calls mutateAsync with correct payload when valid", async () => {
    renderComponent();

    fireEvent.change(screen.getByLabelText("Enter New Password"), {
      target: { value: "Password123!" },
    });

    fireEvent.change(screen.getByLabelText("Confirm New Password"), {
      target: { value: "Password123!" },
    });

    await act(async () =>
      fireEvent.click(screen.getByRole("button", { name: /reset password/i }))
    );

    expect(mockMutateAsync).toHaveBeenCalledWith(
      {
        reset_token: "resetToken123",
        new_password: "Password123!",
        confirm_password: "Password123!",
      },
      expect.any(Object)
    );
  });

  test("redirects to login on success", async () => {
    mockMutateAsync.mockImplementation(async (_, { onSuccess }) => {
      onSuccess();
    });

    renderComponent();

    fireEvent.change(screen.getByLabelText("Enter New Password"), {
      target: { value: "Pass123!" },
    });

    fireEvent.change(screen.getByLabelText("Confirm New Password"), {
      target: { value: "Pass123!" },
    });

    await act(async () =>
      fireEvent.click(screen.getByRole("button", { name: /reset password/i }))
    );

    expect(mockNavigate).toHaveBeenCalledWith("/login");
  });

  test("does not call API if token missing", async () => {
    jest.spyOn(require("react-router-dom"), "useSearchParams").mockReturnValue([
      new URLSearchParams({}),
    ]);

    renderComponent();

    fireEvent.change(screen.getByLabelText("Enter New Password"), {
      target: { value: "Pass123!" },
    });

    fireEvent.change(screen.getByLabelText("Confirm New Password"), {
      target: { value: "Pass123!" },
    });

    await act(async () =>
      fireEvent.click(screen.getByRole("button", { name: /reset password/i }))
    );

    expect(mockMutateAsync).not.toHaveBeenCalled();
  });
});
