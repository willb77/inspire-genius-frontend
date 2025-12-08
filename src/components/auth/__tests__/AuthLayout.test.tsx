import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import AuthLayout from "../AuthLayout";

// Mock the Logo component
jest.mock("../../shared/Logo", () => ({
  Logo: () => <div data-testid="mock-logo">Logo</div>,
}));

describe("AuthLayout Component", () => {
  describe("Rendering", () => {
    test("renders Logo component", () => {
      render(
        <AuthLayout>
          <div>Test Content</div>
        </AuthLayout>
      );

      expect(screen.getByTestId("mock-logo")).toBeInTheDocument();
    });

    test("renders children in right panel", () => {
      render(
        <AuthLayout>
          <div data-testid="test-child">Child Content</div>
        </AuthLayout>
      );

      expect(screen.getByTestId("test-child")).toBeInTheDocument();
      expect(screen.getByText("Child Content")).toBeInTheDocument();
    });

    test("renders authentication illustration image", () => {
      render(
        <AuthLayout>
          <div>Content</div>
        </AuthLayout>
      );

      const image = screen.getByAltText("Auth illustration");
      expect(image).toBeInTheDocument();
      expect(image).toHaveAttribute(
        "src",
        "/images/auth/authetication-image.svg"
      );
    });
  });

  describe("Default Props", () => {
    test("renders default left title one", () => {
      render(
        <AuthLayout>
          <div>Content</div>
        </AuthLayout>
      );

      expect(screen.getByText("Ask. Analyze. Set Goals.")).toBeInTheDocument();
    });

    test("renders default left title two", () => {
      render(
        <AuthLayout>
          <div>Content</div>
        </AuthLayout>
      );

      expect(
        screen.getByText("Interact. Problem Solve. Achieve")
      ).toBeInTheDocument();
    });

    test("renders default subtitle", () => {
      render(
        <AuthLayout>
          <div>Content</div>
        </AuthLayout>
      );

      expect(
        screen.getByText(
          "Get answers, guidance, and insights instantly—powered by AI built around you."
        )
      ).toBeInTheDocument();
    });
  });

  describe("Custom Props", () => {
    test("renders custom left title one", () => {
      render(
        <AuthLayout leftTitleOne="Custom Title One">
          <div>Content</div>
        </AuthLayout>
      );

      expect(screen.getByText("Custom Title One")).toBeInTheDocument();
      expect(
        screen.queryByText("Ask. Analyze. Set Goals.")
      ).not.toBeInTheDocument();
    });

    test("renders custom left title two", () => {
      render(
        <AuthLayout leftTitleTwo="Custom Title Two">
          <div>Content</div>
        </AuthLayout>
      );

      expect(screen.getByText("Custom Title Two")).toBeInTheDocument();
      expect(
        screen.queryByText("Interact. Problem Solve. Achieve")
      ).not.toBeInTheDocument();
    });

    test("renders custom subtitle", () => {
      render(
        <AuthLayout subTitle="Custom subtitle text">
          <div>Content</div>
        </AuthLayout>
      );

      expect(screen.getByText("Custom subtitle text")).toBeInTheDocument();
      expect(
        screen.queryByText(
          "Get answers, guidance, and insights instantly—powered by AI built around you."
        )
      ).not.toBeInTheDocument();
    });

    test("renders all custom props together", () => {
      render(
        <AuthLayout
          leftTitleOne="Welcome"
          leftTitleTwo="Get Started"
          subTitle="Join us today"
        >
          <div>Form</div>
        </AuthLayout>
      );

      expect(screen.getByText("Welcome")).toBeInTheDocument();
      expect(screen.getByText("Get Started")).toBeInTheDocument();
      expect(screen.getByText("Join us today")).toBeInTheDocument();
    });
  });

  describe("Layout Structure", () => {
    test("has correct root container classes", () => {
      const { container } = render(
        <AuthLayout>
          <div>Content</div>
        </AuthLayout>
      );

      const rootDiv = container.firstChild as HTMLElement;
      expect(rootDiv).toHaveClass(
        "bg-background",
        "text-foreground",
        "p-3",
        "md:p-6"
      );
    });

    test("has grid layout container with correct classes", () => {
      const { container } = render(
        <AuthLayout>
          <div>Content</div>
        </AuthLayout>
      );

      const gridContainer = container.querySelector(
        ".grid.grid-cols-1.lg\\:grid-cols-2"
      );
      expect(gridContainer).toBeInTheDocument();
      expect(gridContainer).toHaveClass(
        "mx-auto",
        "w-full",
        "max-w-7xl",
        "items-center"
      );
    });

    test("image has correct styling classes", () => {
      render(
        <AuthLayout>
          <div>Content</div>
        </AuthLayout>
      );

      const image = screen.getByAltText("Auth illustration");
      expect(image).toHaveClass(
        "max-w-xs",
        "md:max-w-sm",
        "w-full",
        "h-auto"
      );
    });

    test("left titles have correct styling", () => {
      render(
        <AuthLayout>
          <div>Content</div>
        </AuthLayout>
      );

      const headings = screen.getAllByRole("heading", { level: 2 });
      headings.forEach((heading) => {
        expect(heading).toHaveClass(
          "text-2xl",
          "md:text-3xl",
          "font-medium",
          "text-center"
        );
      });
    });

    test("subtitle has correct styling classes", () => {
      render(
        <AuthLayout>
          <div>Content</div>
        </AuthLayout>
      );

      const subtitle = screen.getByText(
        "Get answers, guidance, and insights instantly—powered by AI built around you."
      );
      expect(subtitle).toHaveClass(
        "mt-2",
        "text-center",
        "text-muted-foreground",
        "max-w-md"
      );
    });

    test("right panel has correct classes", () => {
      const { } = render(
        <AuthLayout>
          <div data-testid="child">Content</div>
        </AuthLayout>
      );

      const rightPanel = screen.getByTestId("child").parentElement;
      expect(rightPanel).toHaveClass("md:px-20", "w-full");
    });
  });

  describe("Children Rendering", () => {
    test("renders multiple children", () => {
      render(
        <AuthLayout>
          <div data-testid="child-1">First Child</div>
          <div data-testid="child-2">Second Child</div>
        </AuthLayout>
      );

      expect(screen.getByTestId("child-1")).toBeInTheDocument();
      expect(screen.getByTestId("child-2")).toBeInTheDocument();
    });

    test("renders complex children structure", () => {
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
      const { } = render(<AuthLayout>{null}</AuthLayout>);

      // Should still render the layout structure
      expect(screen.getByTestId("mock-logo")).toBeInTheDocument();
      expect(screen.getByAltText("Auth illustration")).toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    test("image has descriptive alt text", () => {
      render(
        <AuthLayout>
          <div>Content</div>
        </AuthLayout>
      );

      const image = screen.getByAltText("Auth illustration");
      expect(image).toHaveAccessibleName("Auth illustration");
    });

    test("headings are properly structured", () => {
      render(
        <AuthLayout>
          <div>Content</div>
        </AuthLayout>
      );

      const h2Headings = screen.getAllByRole("heading", { level: 2 });
      expect(h2Headings).toHaveLength(2);
    });

    test("subtitle is readable text", () => {
      render(
        <AuthLayout>
          <div>Content</div>
        </AuthLayout>
      );

      const subtitle = screen.getByText(
        "Get answers, guidance, and insights instantly—powered by AI built around you."
      );
      expect(subtitle.tagName).toBe("P");
    });
  });

  describe("Edge Cases", () => {
    test("handles empty string props", () => {
      render(
        <AuthLayout leftTitleOne="" leftTitleTwo="" subTitle="">
          <div>Content</div>
        </AuthLayout>
      );

      const headings = screen.getAllByRole("heading", { level: 2 });
      expect(headings).toHaveLength(2);
      headings.forEach((heading) => {
        expect(heading.textContent).toBe("");
      });
    });

    test("handles very long text in titles", () => {
      const longTitle =
        "This is a very long title that should still render correctly without breaking the layout or causing any issues";
      render(
        <AuthLayout leftTitleOne={longTitle}>
          <div>Content</div>
        </AuthLayout>
      );

      expect(screen.getByText(longTitle)).toBeInTheDocument();
    });

    test("handles special characters in props", () => {
      render(
        <AuthLayout
          leftTitleOne="Welcome! 🎉"
          leftTitleTwo="Let's get started"
          subTitle="AI-powered & user-friendly"
        >
          <div>Content</div>
        </AuthLayout>
      );

      expect(screen.getByText("Welcome! 🎉")).toBeInTheDocument();
      expect(screen.getByText("Let's get started")).toBeInTheDocument();
      expect(screen.getByText("AI-powered & user-friendly")).toBeInTheDocument();
    });
  });
});