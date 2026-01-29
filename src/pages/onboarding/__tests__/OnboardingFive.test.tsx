/**
 * @jest-environment jsdom
 *
 * This test suite verifies that the OnboardingFive screen:
 * - Passes correct props to the OnboardingScreen component
 * - Renders its callout overlay correctly
 * - Includes the correct onboarding route configuration
 */

import { render, screen } from "@testing-library/react";
import OnboardingFive from "../OnboardingFive";
import { ROUTES } from "@/constants/routes";

/* --------------------------------------------------------------------------
   MOCK: OnboardingScreen
   Replaces the real component with a simplified test-friendly version.
   This allows us to inspect the props passed from OnboardingFive.
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
   Used to verify the overlay callout renders with correct title.
--------------------------------------------------------------------------- */
jest.mock("@/components/onboarding/OnboardingCallout", () => (props: any) => (
  <div data-testid="onboarding-callout">
    <span data-testid="callout-title">{props.title}</span>
  </div>
));

/* --------------------------------------------------------------------------
   TEST SUITE
--------------------------------------------------------------------------- */
describe("OnboardingFive", () => {
  test("renders correctly with expected content", () => {
    // Render component
    const { container } = render(<OnboardingFive />);

    /* ----------------------------------------
       Validate outer wrapper exists
       Ensures the correct data-tour attribute is applied
    ---------------------------------------- */
    const wrapper = container.querySelector('[data-tour="onboarding-five"]');
    expect(wrapper).toBeInTheDocument();

    /* ----------------------------------------
       Validate OnboardingScreen rendered
    ---------------------------------------- */
    expect(screen.getByTestId("onboarding-screen")).toBeInTheDocument();

    /* ----------------------------------------
       Validate image props passed correctly
    ---------------------------------------- */
    expect(screen.getByTestId("image-src")).toHaveTextContent(
      "/images/onboarding/onboarding-five.png"
    );
    expect(screen.getByTestId("image-alt")).toHaveTextContent(
      "Onboarding step five"
    );

    /* ----------------------------------------
       Validate title + subtitle
    ---------------------------------------- */
    expect(screen.getByTestId("title")).toHaveTextContent("You're all set!");
    expect(screen.getByTestId("subtitle")).toHaveTextContent(
      "Let's get you into the app to start making progress."
    );

    /* ----------------------------------------
       Validate CTA label
    ---------------------------------------- */
    expect(screen.getByTestId("cta-label")).toHaveTextContent("Let's go");

    /* ----------------------------------------
       Validate redirection path
    ---------------------------------------- */
    expect(screen.getByTestId("next-path")).toHaveTextContent(
      ROUTES.ONBOARDING_DETAILS.ONE
    );

    /* ----------------------------------------
       Validate overlay content (OnboardingCallout)
    ---------------------------------------- */
    expect(screen.getByTestId("onboarding-callout")).toBeInTheDocument();
    expect(screen.getByTestId("callout-title")).toHaveTextContent(
      "Upload Documents"
    );
  });
});
