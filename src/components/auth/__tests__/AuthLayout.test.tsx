/**
 * @jest-environment jsdom
 *
 * AuthLayout — Design B (Immersive Brand Wall) tests.
 * Verifies split layout, brand wall content, form panel, and responsiveness.
 */

import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import AuthLayout from "../AuthLayout";

describe("AuthLayout Component (Design B)", () => {
  describe("Rendering", () => {
    test("renders children in form panel", () => {
      render(
        <AuthLayout>
          <div data-testid="test-child">Child Content</div>
        </AuthLayout>
      );
      expect(screen.getByTestId("test-child")).toBeInTheDocument();
      expect(screen.getByText("Child Content")).toBeInTheDocument();
    });

    test("renders multiple children", () => {
      render(
        <AuthLayout>
          <div data-testid="child-1">First</div>
          <div data-testid="child-2">Second</div>
        </AuthLayout>
      );
      expect(screen.getByTestId("child-1")).toBeInTheDocument();
      expect(screen.getByTestId("child-2")).toBeInTheDocument();
    });

    test("renders complex form children", () => {
      render(
        <AuthLayout>
          <form data-testid="auth-form">
            <input type="text" placeholder="Email" />
            <button type="submit">Submit</button>
          </form>
        </AuthLayout>
      );
      expect(screen.getByTestId("auth-form")).toBeInTheDocument();
      expect(screen.getByPlaceholderText("Email")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Submit" })).toBeInTheDocument();
    });

    test("renders when children is null", () => {
      const { container } = render(<AuthLayout>{null}</AuthLayout>);
      expect(container.firstChild).toBeInTheDocument();
    });
  });

  describe("Brand Wall", () => {
    test("renders headline text", () => {
      render(
        <AuthLayout>
          <div>Content</div>
        </AuthLayout>
      );
      expect(screen.getByText(/Unlock your/)).toBeInTheDocument();
      expect(screen.getByText("potential")).toBeInTheDocument();
    });

    test("renders tagline", () => {
      render(
        <AuthLayout>
          <div>Content</div>
        </AuthLayout>
      );
      expect(
        screen.getByText(/AI-powered coaching grounded in the PRISM/)
      ).toBeInTheDocument();
    });

    test("renders testimonial", () => {
      render(
        <AuthLayout>
          <div>Content</div>
        </AuthLayout>
      );
      expect(screen.getByText(/Inspire Genius completely changed/)).toBeInTheDocument();
      expect(screen.getByText("Sarah Reynolds")).toBeInTheDocument();
      expect(screen.getByText("VP People Operations")).toBeInTheDocument();
    });

    test("renders brand wall logo", () => {
      render(
        <AuthLayout>
          <div>Content</div>
        </AuthLayout>
      );
      const logos = screen.getAllByAltText("Inspire Genius");
      expect(logos.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("Layout Structure", () => {
    test("has split grid layout", () => {
      const { container } = render(
        <AuthLayout>
          <div>Content</div>
        </AuthLayout>
      );
      const root = container.firstChild as HTMLElement;
      expect(root).toHaveClass("min-h-screen", "grid");
    });

    test("form panel has white background", () => {
      const { container } = render(
        <AuthLayout>
          <div data-testid="child">Content</div>
        </AuthLayout>
      );
      const formPanel = screen.getByTestId("child").closest(".bg-white");
      expect(formPanel).toBeInTheDocument();
    });
  });
});
