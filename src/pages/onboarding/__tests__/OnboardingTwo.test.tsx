/**
 * @jest-environment jsdom
 *
 * This test suite verifies that:
 * - The OnboardingTwo page renders with correct UI structure
 * - Props are passed correctly to the mocked OnboardingScreen component
 * - The correct onboarding callout is displayed
 * - The component routes to the correct next onboarding step
 */

import { render, screen } from "@testing-library/react";
import OnboardingTwo from "../OnboardingTwo";
import { ROUTES } from "@/constants/routes";

/* --------------------------------------------------------------------------
   MOCK: OnboardingScreen
   Instead of rendering full UI, we output props via test IDs so tests can
   easily assert incoming values.
--------------------------------------------------------------------------- */
jest.mock("@/components/onboarding/OnboardingScreen", () => (props: any) => (
  <div data-testid="onboarding-screen">
    <div data-testid="image-src">{props.imageSrc}</div>
    <div data-testid="image-alt">{props.imageAlt}</div>
    <div data-testid="title">{props.title}</div>
    <div data-testid="subtitle">{props.subtitle}</div>
    <div data-testid="cta-label">{props.ctaLabel}</div>
    <div data-testid="next-path">{props.nextPath}</div>
    <div data-testid="overlays">{props.overlays}</div>
  </div>
));

/* --------------------------------------------------------------------------
   MOCK: OnboardingCallout
   Simplified to expose only the title text for validation.
--------------------------------------------------------------------------- */
jest.mock("@/components/onboarding/OnboardingCallout", () => ({
  __esModule: true,
  default: (props: any) => (
    <div data-testid="onboarding-callout">
      <span data-testid="callout-title">{props.title}</span>
    </div>
  ),
}));

/* --------------------------------------------------------------------------
   TEST SUITE: OnboardingTwo
--------------------------------------------------------------------------- */
describe("OnboardingTwo", () => {
  
  /**
   * TEST: Validates that all expected props and UI elements render
   *
   * Confirms:
   * - Wrapper div with data-tour exists
   * - Image, alt text, title, subtitle, CTA label, and nextPath are passed correctly
   * - Callout overlay renders with correct title
   */
  test("renders correctly with expected content", () => {
    const { container } = render(<OnboardingTwo />);

    // Ensure wrapper with data-tour appears
    const wrapper = container.querySelector('[data-tour="onboarding-two"]');
    expect(wrapper).toBeInTheDocument();

    // Ensure mocked screen component is rendered
    expect(screen.getByTestId("onboarding-screen")).toBeInTheDocument();

    // Validate props forwarded to OnboardingScreen mock
    expect(screen.getByTestId("image-src")).toHaveTextContent(
      "/images/onboarding/onboarding-two.png"
    );

    expect(screen.getByTestId("image-alt")).toHaveTextContent(
      "Onboarding step two"
    );

    expect(screen.getByTestId("title")).toHaveTextContent(
      "Empower your business"
    );

    expect(screen.getByTestId("subtitle")).toHaveTextContent(
      "Leverage AI-driven insights tailored to your goals."
    );

    expect(screen.getByTestId("cta-label")).toHaveTextContent("Let's go");

    // Next route must lead to onboarding step three
    expect(screen.getByTestId("next-path")).toHaveTextContent(
      ROUTES.ONBOARDING.THREE
    );

    // Validate callout overlay appears and displays correct text
    const callout = screen.getByTestId("onboarding-callout");
    expect(callout).toBeInTheDocument();

    expect(screen.getByTestId("callout-title")).toHaveTextContent(
      "Actionable insights"
    );
  });
});
