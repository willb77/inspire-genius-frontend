/**
 * @jest-environment jsdom
 *
 * This test suite ensures:
 * - The OnboardingThree page renders correctly
 * - All props are passed properly to OnboardingScreen (mocked)
 * - OnboardingCallout renders with correct title
 * - The correct next route is displayed
 */

import { render, screen } from "@testing-library/react";
import OnboardingThree from "../OnboardingThree";
import { ROUTES } from "@/constants/routes";

/* --------------------------------------------------------------------------
   MOCK: OnboardingScreen
   Instead of rendering the full UI, this mock displays props so tests
   can assert values easily.
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
   Simplified mock that exposes only the title so we can assert it.
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
   TEST SUITE: OnboardingThree
--------------------------------------------------------------------------- */
describe("OnboardingThree", () => {
  
  /**
   * TEST: Component renders correctly
   *
   * Verifies:
   * - The wrapper containing data-tour attribute is present
   * - All core props (imageSrc, title, subtitle, nextPath, CTA label) match expectations
   * - The callout overlay appears with the correct title
   */
  test("renders correctly with expected content", () => {
    const { container } = render(<OnboardingThree />);

    // Ensure wrapper exists
    const wrapper = container.querySelector('[data-tour="onboarding-three"]');
    expect(wrapper).toBeInTheDocument();

    // Ensure OnboardingScreen mock is shown
    expect(screen.getByTestId("onboarding-screen")).toBeInTheDocument();

    // Validate the props rendered inside the mocked screen
    expect(screen.getByTestId("image-src")).toHaveTextContent(
      "/images/onboarding/onboarding-three.png"
    );
    expect(screen.getByTestId("image-alt")).toHaveTextContent(
      "Onboarding step three"
    );
    expect(screen.getByTestId("title")).toHaveTextContent("Insights that matter");
    expect(screen.getByTestId("subtitle")).toHaveTextContent(
      "We prioritize clarity so you can act with confidence."
    );
    expect(screen.getByTestId("cta-label")).toHaveTextContent("Let's go");

    // Next path should lead to onboarding step four
    expect(screen.getByTestId("next-path")).toHaveTextContent(
      ROUTES.ONBOARDING.FOUR
    );

    // Validate callout overlay content
    const callout = screen.getByTestId("onboarding-callout");
    expect(callout).toBeInTheDocument();
    expect(screen.getByTestId("callout-title")).toHaveTextContent(
      "Actionable insights"
    );
  });
});
