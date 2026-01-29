/**
 * @jest-environment jsdom
 *
 * This test verifies:
 * - OnboardingFour renders correctly
 * - All props passed to OnboardingScreen are correct
 * - The callout overlay displays the correct title
 * - The correct next route is supplied
 */

import { render, screen } from "@testing-library/react";
import OnboardingFour from "../OnboardingFour";
import { ROUTES } from "@/constants/routes";

/* --------------------------------------------------------------------------
   MOCK: OnboardingScreen Component
   Instead of rendering the real component, this mock outputs the props so
   we can easily check whether OnboardingFour is passing correct values.
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
   MOCK: OnboardingCallout Component
   A simple mock to verify the callout is rendered and receives correct props.
--------------------------------------------------------------------------- */
jest.mock("@/components/onboarding/OnboardingCallout", () => (props: any) => (
  <div data-testid="onboarding-callout">
    <span data-testid="callout-title">{props.title}</span>
  </div>
));

/* --------------------------------------------------------------------------
   TEST SUITE FOR OnboardingFour PAGE
--------------------------------------------------------------------------- */
describe("OnboardingFour", () => {
  test("renders correctly with expected content", () => {
    // Render the component
    const { container } = render(<OnboardingFour />);

    /* ----------------------------------------
       Ensure wrapper with `data-tour` attribute exists
    ---------------------------------------- */
    const wrapper = container.querySelector('[data-tour="onboarding-four"]');
    expect(wrapper).toBeInTheDocument();

    /* ----------------------------------------
       Ensure OnboardingScreen mock is rendered
    ---------------------------------------- */
    expect(screen.getByTestId("onboarding-screen")).toBeInTheDocument();

    /* ----------------------------------------
       Validate image props
    ---------------------------------------- */
    expect(screen.getByTestId("image-src")).toHaveTextContent(
      "/images/onboarding/onboarding-four.png"
    );
    expect(screen.getByTestId("image-alt")).toHaveTextContent(
      "Onboarding step four"
    );

    /* ----------------------------------------
       Validate main title and subtitle
    ---------------------------------------- */
    expect(screen.getByTestId("title")).toHaveTextContent(
      "Collaborate with your AI Coach"
    );

    expect(screen.getByTestId("subtitle")).toHaveTextContent(
      "We keep things simple and effective — so you can focus on impact."
    );

    /* ----------------------------------------
       Validate CTA button label
    ---------------------------------------- */
    expect(screen.getByTestId("cta-label")).toHaveTextContent("Let's go");

    /* ----------------------------------------
       Validate next onboarding route
    ---------------------------------------- */
    expect(screen.getByTestId("next-path")).toHaveTextContent(
      ROUTES.ONBOARDING.FIVE
    );

    /* ----------------------------------------
       Validate OnboardingCallout overlay content
    ---------------------------------------- */
    const callout = screen.getByTestId("onboarding-callout");
    expect(callout).toBeInTheDocument();

    expect(screen.getByTestId("callout-title")).toHaveTextContent(
      "Smart decisions with AI"
    );
  });
});
