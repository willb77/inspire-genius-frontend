import { render, screen } from "@testing-library/react";
import SocialLogin from "../SocialLogin";

const mockUseSocialLogin = jest.fn();

jest.mock("@/hooks/auth/useSocialLogin", () => ({
  useSocialLogin: () => mockUseSocialLogin(),
}));

jest.mock("lucide-react", () => ({
  Loader2: ({ className }: { className?: string }) => (
    <svg data-testid="loader" className={className} />
  ),
}));

describe("SocialLogin Component", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("shows processing message and spinning loader", () => {
    mockUseSocialLogin.mockReturnValue({ status: "processing" });

    render(<SocialLogin />);

    expect(screen.getByText("Completing social login...")).toBeInTheDocument();

    const loader = screen.getByTestId("loader");
    expect(loader).toHaveClass("animate-spin");
  });

  test("shows success message when status is done", () => {
    mockUseSocialLogin.mockReturnValue({ status: "done" });

    render(<SocialLogin />);

    expect(
      screen.getByText(
        "Login verified. You can close this tab if it doesn't redirect automatically."
      )
    ).toBeInTheDocument();

    const loader = screen.getByTestId("loader");
    expect(loader).not.toHaveClass("animate-spin");
  });

  test("shows error message when status is error", () => {
    mockUseSocialLogin.mockReturnValue({ status: "error" });

    render(<SocialLogin />);

    expect(screen.getByText("Redirecting to login...")).toBeInTheDocument();

    const loader = screen.getByTestId("loader");
    expect(loader).not.toHaveClass("animate-spin");
  });
});
