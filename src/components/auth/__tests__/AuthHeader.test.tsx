/**
 * @jest-environment jsdom
 *
 * This test suite validates the AuthHeader component, ensuring:
 * - Title renders properly with correct styling
 * - Subtitle renders conditionally only when provided
 * - Special characters and long text are handled gracefully
 * - Wrapper and text elements apply correct Tailwind classes
 */

import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import AuthHeader from "../AuthHeader";

describe("AuthHeader Component", () => {

  test("renders title correctly", () => {
    // Title should render as an <h1>
    render(<AuthHeader title="Welcome Back" />);

    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading).toBeInTheDocument();
    expect(heading).toHaveTextContent("Welcome Back");
  });

  test("renders title with correct styling classes", () => {
    // Title should include default Tailwind styling classes
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
    // Subtitle should render as a <p> only when passed
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
    // Subtitle should apply correct Tailwind text classes
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
    // No <p> tag should appear when subtitle is missing
    const { container } = render(<AuthHeader title="Sign In" />);

    const paragraphs = container.querySelectorAll("p");
    expect(paragraphs).toHaveLength(0);
  });

  test("does not render subtitle when undefined", () => {
    // Passing undefined should not create a subtitle element
    render(<AuthHeader title="Reset Password" subtitle={undefined} />);

    const subtitle = screen.queryByRole("paragraph");
    expect(subtitle).not.toBeInTheDocument();
  });

  test("does not render subtitle when empty string", () => {
    // Empty string is falsy → subtitle should be ignored
    render(<AuthHeader title="Verify Email" subtitle="" />);

    const paragraphs = screen.queryAllByText("");
    const subtitleParagraphs = paragraphs.filter(
      (el) => el.tagName === "P" && el.classList.contains("text-muted-foreground")
    );
    expect(subtitleParagraphs).toHaveLength(0);
  });

  test("renders wrapper div with correct classes", () => {
    // The outer <div> should apply layout spacing classes
    const { container } = render(
      <AuthHeader title="Test" subtitle="Subtitle" />
    );

    const wrapperDiv = container.firstChild as HTMLElement;
    expect(wrapperDiv).toHaveClass("w-full", "mb-6");
  });

  test("handles long title text", () => {
    // Long titles must still render without issues
    const longTitle =
      "This is a very long title that should still render correctly in the component";

    render(<AuthHeader title={longTitle} />);

    expect(screen.getByText(longTitle)).toBeInTheDocument();
  });

  test("handles long subtitle text", () => {
    // Long subtitles should render without truncation
    const longSubtitle =
      "This is a very long subtitle that provides detailed information about what the user should do next in the authentication process";

    render(<AuthHeader title="Login" subtitle={longSubtitle} />);

    expect(screen.getByText(longSubtitle)).toBeInTheDocument();
  });

  test("renders title with special characters", () => {
    // Title must support unicode and emoji
    render(<AuthHeader title="Welcome to App™ 2.0!" />);

    expect(screen.getByText("Welcome to App™ 2.0!")).toBeInTheDocument();
  });

  test("renders subtitle with special characters", () => {
    // Subtitle must support arrows and unicode symbols
    render(
      <AuthHeader
        title="Sign Up"
        subtitle="Already have an account? Click here →"
      />
    );

    expect(screen.getByText("Already have an account? Click here →")).toBeInTheDocument();
  });
});
