/** @jest-environment jsdom */

import { render, screen } from "@testing-library/react";
import OnboardingCallout from "../OnboardingCallout";

describe("OnboardingCallout Component", () => {

  // Test: Ensures title text appears in the document
  test("renders the title text", () => {
    render(
      <OnboardingCallout
        title="My Test Title"
        positionClass="top-0 left-0"
      />
    );

    expect(screen.getByText("My Test Title")).toBeInTheDocument();
  });

  // Test: Confirms the positionClass prop is applied to wrapper element
  test("applies the positionClass to the outer container", () => {
    const { container } = render(
      <OnboardingCallout
        title="Position Test"
        positionClass="bottom-10 right-5"
      />
    );

    const wrapper = container.querySelector(".absolute");
    expect(wrapper).toHaveClass("bottom-10", "right-5");
  });

  // Test: Icon should render when icon prop is passed
  test("renders the icon when provided", () => {
    const MockIcon = <span data-testid="mock-icon">ICON</span>;

    render(
      <OnboardingCallout
        title="Icon Test"
        icon={MockIcon}
        positionClass="top-3 left-3"
      />
    );

    expect(screen.getByTestId("mock-icon")).toBeInTheDocument();
  });

  // Test: Ensures no icon is rendered when icon prop is missing
  test("does not render icon when icon prop is not provided", () => {
    const { container } = render(
      <OnboardingCallout
        title="No Icon Test"
        positionClass="top-3 left-3"
      />
    );

    expect(container.querySelector("[data-testid='mock-icon']")).toBeNull();
  });

  // Test: Confirms any extra className provided is applied to internal text container
  test("applies additional className to the text container", () => {
    const { container } = render(
      <OnboardingCallout
        title="Classname Test"
        positionClass="top-0"
        className="extra-style"
      />
    );

    const textDiv = container.querySelector(".extra-style");
    expect(textDiv).toBeInTheDocument();
  });

  // Test: Ensures core layout structure (wrappers) is rendered
  test("renders layout wrappers correctly", () => {
    const { container } = render(
      <OnboardingCallout
        title="Layout Test"
        positionClass="top-0"
      />
    );

    // Outer absolute wrapper
    expect(container.querySelector(".absolute")).toBeInTheDocument();

    // Inner flex wrapper (icon + text)
    expect(container.querySelector(".flex.items-start.gap-2")).toBeInTheDocument();
  });

});
