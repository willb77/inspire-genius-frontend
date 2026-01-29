/** @jest-environment jsdom */

import { render, screen } from "@testing-library/react";
import OnboardingCallout from "../OnboardingCallout";

describe("OnboardingCallout", () => {

  // Ensures the component displays the title text passed via props
  test("renders title text", () => {
    render(
      <OnboardingCallout
        title="Welcome User"
        positionClass="top-5 left-5"
      />
    );

    expect(screen.getByText("Welcome User")).toBeInTheDocument();
  });

  // Confirms the given positionClass is applied to the wrapper (absolute element)
  test("applies positionClass", () => {
    const { container } = render(
      <OnboardingCallout
        title="Position Test"
        positionClass="bottom-0 right-0"
      />
    );

    const wrapper = container.querySelector(".absolute");
    expect(wrapper).toHaveClass("bottom-0", "right-0");
  });

  // Verifies that the optional icon prop is rendered only when provided
  test("renders icon when provided", () => {
    const MockIcon = <span data-testid="mock-icon">🔔</span>;

    render(
      <OnboardingCallout
        title="Icon Test"
        positionClass="top-3"
        icon={MockIcon}
      />
    );

    expect(screen.getByTestId("mock-icon")).toBeInTheDocument();
  });

  // Ensures no icon is rendered when the icon prop is not passed
  test("does not render icon when not provided", () => {
    const { container } = render(
      <OnboardingCallout
        title="No Icon"
        positionClass="top-0"
      />
    );

    expect(container.querySelector("[data-testid='mock-icon']")).toBeNull();
  });

  // Confirms that additional custom class names are applied correctly
  test("applies custom className", () => {
    const { container } = render(
      <OnboardingCallout
        title="Custom Style"
        positionClass="top-0"
        className="bg-red-200"
      />
    );

    expect(container.querySelector(".bg-red-200")).toBeInTheDocument();
  });
});
