import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import AuthHeader from "../AuthHeader";

describe("AuthHeader Component", () => {
  test("renders title correctly", () => {
    render(<AuthHeader title="Welcome Back" />);

    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading).toBeInTheDocument();
    expect(heading).toHaveTextContent("Welcome Back");
  });

  test("renders title with correct styling classes", () => {
    render(<AuthHeader title="Sign Up" />);

    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading).toHaveClass(
      "text-left",
      "w-full",
      "text-2xl",
      "md:text-3xl",
      "font-semibold",
      "tracking-tight"
    );
  });

  test("renders subtitle when provided", () => {
    render(
      <AuthHeader
        title="Create Account"
        subtitle="Enter your details to get started"
      />
    );

    const subtitle = screen.getByText("Enter your details to get started");
    expect(subtitle).toBeInTheDocument();
    expect(subtitle.tagName).toBe("P");
  });

  test("subtitle has correct styling classes", () => {
    render(
      <AuthHeader
        title="Login"
        subtitle="Welcome back to your account"
      />
    );

    const subtitle = screen.getByText("Welcome back to your account");
    expect(subtitle).toHaveClass(
      "text-left",
      "w-full",
      "mt-1",
      "text-sm",
      "text-muted-foreground"
    );
  });

  test("does not render subtitle when not provided", () => {
    const { container } = render(<AuthHeader title="Sign In" />);

    const paragraphs = container.querySelectorAll("p");
    expect(paragraphs).toHaveLength(0);
  });

  test("does not render subtitle when undefined", () => {
    render(<AuthHeader title="Reset Password" subtitle={undefined} />);

    const subtitle = screen.queryByRole("paragraph");
    expect(subtitle).not.toBeInTheDocument();
  });

  test("does not render subtitle when empty string", () => {
    render(<AuthHeader title="Verify Email" subtitle="" />);

    // Empty string is falsy, so subtitle should not render
    const paragraphs = screen.queryAllByText("");
    const subtitleParagraphs = paragraphs.filter(
      (el) => el.tagName === "P" && el.classList.contains("text-muted-foreground")
    );
    expect(subtitleParagraphs).toHaveLength(0);
  });

  test("renders wrapper div with correct classes", () => {
    const { container } = render(
      <AuthHeader title="Test" subtitle="Subtitle" />
    );

    const wrapperDiv = container.firstChild as HTMLElement;
    expect(wrapperDiv).toHaveClass("w-full", "mb-6");
  });

  test("handles long title text", () => {
    const longTitle = "This is a very long title that should still render correctly in the component";
    render(<AuthHeader title={longTitle} />);

    expect(screen.getByText(longTitle)).toBeInTheDocument();
  });

  test("handles long subtitle text", () => {
    const longSubtitle = "This is a very long subtitle that provides detailed information about what the user should do next in the authentication process";
    render(<AuthHeader title="Login" subtitle={longSubtitle} />);

    expect(screen.getByText(longSubtitle)).toBeInTheDocument();
  });

  test("renders with special characters in title", () => {
    render(<AuthHeader title="Welcome to App™ 2.0!" />);

    expect(screen.getByText("Welcome to App™ 2.0!")).toBeInTheDocument();
  });

  test("renders with special characters in subtitle", () => {
    render(
      <AuthHeader
        title="Sign Up"
        subtitle="Already have an account? Click here →"
      />
    );

    expect(screen.getByText("Already have an account? Click here →")).toBeInTheDocument();
  });
});