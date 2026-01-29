/** @jest-environment jsdom */

import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import OnboardingImage from "../OnboardingImage";

describe("OnboardingImage Component", () => {

  // Test: Image should render with correct src and alt attributes
  test("renders image with correct src and alt", () => {
    render(<OnboardingImage src="/test-image.png" alt="Test Image" />);

    const img = screen.getByAltText("Test Image");
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute("src", "/test-image.png");
  });

  // Test: Custom className should be applied to outer wrapper
  test("applies custom className to wrapper", () => {
    const { container } = render(
      <OnboardingImage src="/img.png" alt="Alt" className="custom-class" />
    );

    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper).toHaveClass("custom-class");
  });

  // Test: Component should correctly render children inside wrapper
  test("renders children inside wrapper", () => {
    render(
      <OnboardingImage src="/img.png" alt="Alt">
        <span data-testid="child">Child content</span>
      </OnboardingImage>
    );

    expect(screen.getByTestId("child")).toBeInTheDocument();
  });

  // Test: Wrapper should always include required base layout classes
  test("wrapper has required base classes", () => {
    const { container } = render(
      <OnboardingImage src="/img.png" alt="Alt" />
    );

    const wrapper = container.firstChild as HTMLElement;

    expect(wrapper).toHaveClass("relative");
    expect(wrapper).toHaveClass("w-full");
    expect(wrapper).toHaveClass("flex");
    expect(wrapper).toHaveClass("items-center");
    expect(wrapper).toHaveClass("justify-center");
  });

});
